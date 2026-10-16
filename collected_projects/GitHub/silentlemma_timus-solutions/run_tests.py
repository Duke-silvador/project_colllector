#!/usr/bin/env python3
"""Run the tests of problems against their solutions.

Every solution is built and run in the Docker image of the language version
the judge uses; outputs are compared as described in the tests.json of the
problem. See CONTRIBUTING.md, sections "Tests" and "Running the tests".

    python run_tests.py 1000 [1001 ...] [--only SUBSTRING] [--pypy]
"""

import argparse
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(ROOT, ".run")
PYTHON_IMAGE = "python:3.12-slim"
PYPY_IMAGE = "pypy:3.10-slim"
TEST_TIMEOUT_S = 20
MEMORY = "1g"
RANGE = 100

# extension -> (image, language key of the build script)
IMAGES = {
    ".cpp": ("gcc:13.2", "cpp"),
    ".go": ("golang:1.14", "go"),
    ".py": (PYTHON_IMAGE, "py"),
    ".java": ("eclipse-temurin:8-jdk", "java"),
    ".rs": ("rust:1.75-slim", "rs"),
}

# Runs inside a container: build $2 as language $1, run it on every
# $3/*.in, write $4/<name>.out, .rc (exit code) and .ms (wall time).
BUILD_AND_RUN = r"""#!/bin/sh
lang=$1; src=$2; inputs=$3; out=$4
mkdir -p /tmp/b "$out"
set -e
case $lang in
  cpp)  g++ -O2 -Wall -Wextra -Werror -o /tmp/b/sol "$src"; run=/tmp/b/sol ;;
  go)   cp "$src" /tmp/b/main.go
        (cd /tmp/b && GO111MODULE=off go vet main.go && GO111MODULE=off go build -o sol main.go)
        run=/tmp/b/sol ;;
  py)   run="python3 $src" ;;
  pypy) run="pypy3 $src" ;;
  java) cp "$src" /tmp/b/Main.java
        javac -Xlint:all -Werror -d /tmp/b /tmp/b/Main.java
        run="java -Xss64m -cp /tmp/b Main" ;;
  rs)   rustc -O --edition 2021 -D warnings -o /tmp/b/sol "$src"; run=/tmp/b/sol ;;
esac
set +e
# warm-up run, so that the first measured test does not pay for a cold start
for t in "$inputs"/*.in; do timeout TIMEOUT $run < "$t" > /dev/null 2>&1; break; done
for t in "$inputs"/*.in; do
  n=$(basename "$t" .in)
  s=$(date +%s%N)
  timeout TIMEOUT $run < "$t" > "$out/$n.out" 2> "$out/$n.err"
  echo $? > "$out/$n.rc"
  e=$(date +%s%N)
  echo $(( (e - s) / 1000000 )) > "$out/$n.ms"
done
""".replace("TIMEOUT", str(TEST_TIMEOUT_S))

# Runs inside a container: python gen.py <args> for every generated test.
GENERATE = r"""import json, subprocess, sys
tests, dest = sys.argv[1], sys.argv[2]
spec = json.load(open('%s/tests.json' % tests))
for case in spec['cases']:
    if 'generator' in case:
        with open('%s/%s.in' % (dest, case['name']), 'w') as f:
            subprocess.run([sys.executable, '%s/gen.py' % tests]
                           + case['generator'].split(), stdout=f, check=True)
"""

# Runs inside a container: checker.py on every test of a solution.
CHECK = r"""import json, subprocess, sys
tests, inputs, expected, outputs = sys.argv[1:5]
spec = json.load(open('%s/tests.json' % tests))
result = {}
for case in spec['cases']:
    n = case['name']
    p = subprocess.run([sys.executable, '%s/checker.py' % tests,
                        '%s/%s.in' % (inputs, n), '%s/%s.out' % (expected, n),
                        '%s/%s.out' % (outputs, n)], capture_output=True, text=True)
    result[n] = [p.returncode, p.stdout.strip()[:200]]
print(json.dumps(result))
"""


def problem_dir(problem):
    """The folder of a problem: problems are grouped by hundreds."""
    first = int(problem) // RANGE * RANGE
    return os.path.join(ROOT, "%d-%d" % (first, first + RANGE - 1), problem)


def repo_path(path):
    """Path of a repository file inside a container."""
    return "/repo/" + os.path.relpath(path, ROOT).replace(os.sep, "/")


def work_path(path):
    """Path of a file of the work directory inside a container."""
    return "/work/" + os.path.relpath(path, WORK).replace(os.sep, "/")


def docker(image, args, **kwargs):
    cmd = [
        "docker",
        "run",
        "--rm",
        "--network",
        "none",
        "-m",
        MEMORY,
        "-v",
        ROOT + ":/repo:ro",
        "-v",
        WORK + ":/work",
        image,
    ] + args
    return subprocess.run(cmd, capture_output=True, text=True, **kwargs)


def build_and_run(solution, image, lang, inputs, out):
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    p = docker(
        image,
        [
            "sh",
            "/work/build_and_run.sh",
            lang,
            repo_path(solution),
            work_path(inputs),
            work_path(out),
        ],
    )
    if p.returncode != 0:
        return (p.stdout + p.stderr).strip()
    return None


def same(output, expected, judging):
    if judging == "exact":
        return output.rstrip() == expected.rstrip()
    if judging == "lines":
        return [s.split() for s in output.rstrip().split("\n")] == [
            s.split() for s in expected.rstrip().split("\n")
        ]
    a, b = output.split(), expected.split()
    if judging.startswith("float:"):
        eps = float(judging.split(":", 1)[1])
        if len(a) != len(b):
            return False
        for x, y in zip(a, b):
            if x == y:
                continue
            try:
                fx, fy = float(x), float(y)
            except ValueError:
                return False
            if abs(fx - fy) > eps * max(1.0, abs(fy)):
                return False
        return True
    return a == b


def encode_inputs(inputs, encoding):
    """Test inputs are stored in UTF-8; give them to the solutions in the
    encoding the judge uses."""
    for name in os.listdir(inputs):
        path = os.path.join(inputs, name)
        with open(path, encoding="utf-8", newline="") as f:
            text = f.read()
        with open(path, "wb") as f:
            f.write(text.encode(encoding))


def read(path, encoding="utf-8"):
    with open(path, encoding=encoding, errors="replace") as f:
        return f.read()


def run_problem(problem, only, pypy):
    sol_dir = problem_dir(problem)
    tests_dir = os.path.join(sol_dir, "tests")
    spec = json.load(open(os.path.join(tests_dir, "tests.json"), encoding="utf-8"))
    judging = spec.get("judging", "tokens")
    # the encoding of the inputs and outputs the solutions see; stored files are UTF-8
    encoding = spec.get("input_encoding", "utf-8")
    cases = [c["name"] for c in spec["cases"]]
    base = os.path.join(WORK, problem)
    inputs = os.path.join(base, "inputs")
    expected = os.path.join(base, "expected")
    for d in (inputs, expected):
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)

    # inputs and expected outputs: stored files, generated tests from gen.py
    # and the reference solution
    generated = [c["name"] for c in spec["cases"] if "generator" in c]
    for c in spec["cases"]:
        if "generator" not in c:
            shutil.copy(os.path.join(tests_dir, c["name"] + ".in"), inputs)
            shutil.copy(os.path.join(tests_dir, c["name"] + ".out"), expected)
    if generated:
        with open(os.path.join(WORK, "generate.py"), "w") as f:
            f.write(GENERATE)
        p = docker(
            PYTHON_IMAGE, ["python", "/work/generate.py", repo_path(tests_dir), work_path(inputs)]
        )
        if p.returncode != 0:
            print("%s: generator failed\n%s" % (problem, p.stderr[-2000:]))
            return False
    if "input_encoding" in spec:
        encode_inputs(inputs, spec["input_encoding"])
    if generated:
        reference = os.path.join(sol_dir, spec["reference"])
        image, lang = IMAGES[os.path.splitext(reference)[1]]
        ref_out = os.path.join(base, "reference")
        err = build_and_run(reference, image, lang, inputs, ref_out)
        if err:
            print("%s: reference solution failed\n%s" % (problem, err[-2000:]))
            return False
        for n in generated:
            with open(os.path.join(expected, n + ".out"), "w", encoding="utf-8", newline="") as f:
                f.write(read(os.path.join(ref_out, n + ".out"), encoding))

    solutions = sorted(
        f for f in os.listdir(sol_dir) if os.path.splitext(f)[1] in IMAGES and only in f
    )
    ok = True
    if judging == "checker":
        # the stored answers must pass their own checker
        verdicts = check(problem, tests_dir, base, expected)
        bad = [n for n in cases if n not in generated and verdicts.get(n, [1])[0] != 0]
        if bad:
            print("%s: stored outputs rejected by checker.py: %s" % (problem, ", ".join(bad)))
            ok = False
    for name in solutions:
        ext = os.path.splitext(name)[1]
        image, lang = IMAGES[ext]
        if ext == ".py" and pypy:
            image, lang = PYPY_IMAGE, "pypy"
        out = os.path.join(base, "out", name)
        err = build_and_run(os.path.join(sol_dir, name), image, lang, inputs, out)
        if err:
            print("%-36s [%s] BUILD FAILED\n%s" % (name, image, err[-2000:]))
            ok = False
            continue
        verdicts = check(problem, tests_dir, base, out) if judging == "checker" else {}
        passed, worst = 0, 0
        for n in cases:
            rc = read(os.path.join(out, n + ".rc")).strip()
            worst = max(worst, int(read(os.path.join(out, n + ".ms")).strip() or 0))
            if rc != "0":
                reason = "time limit of %d s" % TEST_TIMEOUT_S if rc == "124" else "exit code " + rc
            elif judging == "checker":
                reason = None if verdicts[n][0] == 0 else verdicts[n][1] or "rejected"
            elif same(
                read(os.path.join(out, n + ".out"), encoding),
                read(os.path.join(expected, n + ".out")),
                judging,
            ):
                reason = None
            else:
                reason = "wrong answer"
            if reason:
                print("  %s: %s" % (n, reason))
            else:
                passed += 1
        status = "OK" if passed == len(cases) else "FAIL"
        ok &= passed == len(cases)
        print("%-36s [%s] %s %d/%d  max %d ms" % (name, image, status, passed, len(cases), worst))
    return ok


def check(problem, tests_dir, base, outputs):
    with open(os.path.join(WORK, "check.py"), "w") as f:
        f.write(CHECK)
    p = docker(
        PYTHON_IMAGE,
        [
            "python",
            "/work/check.py",
            repo_path(tests_dir),
            work_path(os.path.join(base, "inputs")),
            work_path(os.path.join(base, "expected")),
            work_path(outputs),
        ],
    )
    if p.returncode != 0:
        print("%s: checker failed\n%s" % (problem, p.stderr[-2000:]))
        return {}
    return json.loads(p.stdout)


def main():
    parser = argparse.ArgumentParser(description="Run the tests of problems in Docker.")
    parser.add_argument("problems", nargs="+", help="problem numbers")
    parser.add_argument("--only", default="", help="only solutions whose file name contains this")
    parser.add_argument("--pypy", action="store_true", help="run Python solutions under PyPy")
    args = parser.parse_args()
    os.makedirs(WORK, exist_ok=True)
    with open(os.path.join(WORK, "build_and_run.sh"), "w", newline="\n") as f:
        f.write(BUILD_AND_RUN)
    ok = True
    for problem in args.problems:
        ok &= run_problem(problem, args.only, args.pypy)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
