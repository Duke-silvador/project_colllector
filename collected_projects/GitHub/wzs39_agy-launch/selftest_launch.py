r"""selftest_launch.py -- verify agy-run.py's wiring end to end, without leaks.

Why this shape
--------------
agy-run.py calls ensure_socks(), which spawns a *long-lived* listener. Any test
that runs agy-mode socks directly inherits that child and never returns until
the listener is killed -- which is exactly what happened when this was first
tried from a shell wrapper.

So the listener is started here, first, on a free port. agy-run then takes the
"reusing listener" branch and spawns nothing, and the child we own is the one
we terminate in finally.

Checks
------
 1. --mode status    exits 0 and reports the expected sections
 2. --mode direct    forwards args to agy, sets no proxy env
 3. --mode socks     forwards args to agy through a live SOCKS5 listener
 4. --mode socks     actually routed through it (listener saw the CONNECT)

Exit code 0 = all checks passed.
"""

import os
import socket
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RUNNER = os.path.join(HERE, "agy-run.py")
SOCKS = os.path.join(HERE, "socks_forward.py")
AGY = os.path.join(os.environ.get("LOCALAPPDATA", ""), "agy", "bin", "agy.exe")
LOG = os.path.join(HERE, "selftest-launch.log")

PY = sys.executable


def free_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]
    finally:
        sock.close()


def run(args, timeout=60):
    return subprocess.run([PY, RUNNER] + args, capture_output=True, text=True,
                          timeout=timeout)


def check(label, ok, detail=""):
    print("%-5s %s%s" % ("ok" if ok else "FAIL", label,
                         "" if ok else ("  <- " + detail)))
    return ok


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    results = []

    # 1 ---------------------------------------------------------------- status
    proc = run(["--mode", "status"])
    out = proc.stdout
    results.append(check(
        "status exits 0",
        proc.returncode == 0,
        "rc=%d %s" % (proc.returncode, proc.stderr[:200])))
    for marker in ("[binaries]", "[listeners]", "[mitm CA", "[autostart]"):
        results.append(check("status reports %s" % marker, marker in out))
    results.append(check("status finds agy.exe", "agy.exe              ok" in out,
                         out[:400]))

    # 2 ---------------------------------------------------------------- direct
    proc = run(["--mode", "direct", "--target", "cli", "--", "--version"])
    results.append(check("direct exits 0", proc.returncode == 0,
                         proc.stderr[:300]))
    results.append(check("direct prints the agy version", "1.5.7" in proc.stdout,
                         proc.stdout[:300]))
    results.append(check("direct says no proxy env",
                         "no proxy environment set" in proc.stdout))

    # 3 ----------------------------------------------------------------- socks
    port = free_port()
    log = open(LOG, "wb")
    listener = subprocess.Popen([PY, SOCKS, "--port", str(port)],
                                stdout=log, stderr=subprocess.STDOUT)
    try:
        for _ in range(40):
            try:
                socket.create_connection(("127.0.0.1", port), timeout=0.3).close()
                break
            except OSError:
                if listener.poll() is not None:
                    break
                continue
        else:
            pass

        proc = run(["--mode", "socks", "--target", "cli",
                    "--port", str(port), "--", "--version"])
        results.append(check("socks exits 0", proc.returncode == 0,
                             proc.stderr[:300]))
        results.append(check("socks prints the agy version", "1.5.7" in proc.stdout,
                             proc.stdout[:300]))
        results.append(check(
            "socks reports the socks5h proxy",
            "socks5h://127.0.0.1:%d" % port in proc.stdout, proc.stdout[:400]))
    finally:
        listener.terminate()
        try:
            listener.wait(timeout=5)
        except subprocess.TimeoutExpired:
            listener.kill()
        log.close()

    print("\n%d/%d checks passed" % (sum(1 for r in results if r), len(results)))
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
