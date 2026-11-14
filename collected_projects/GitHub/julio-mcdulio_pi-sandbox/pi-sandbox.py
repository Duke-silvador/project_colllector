#!/usr/bin/env python3
"""Run pi (pi-coding-agent) inside a microsandbox (msb) microVM.

What it does
  * Mounts the directory you give it as /workspace inside the sandbox.
  * Builds and loads a reusable base image with pi preinstalled (one-time).
  * Auto-generates pi's models.json so pi talks to the model container
    running on this host (default 127.0.0.1:8090) via
    http://host.microsandbox.internal:PORT/v1.
  * --no-internet blocks all egress except the model endpoint (+ DNS).

Usage
  ./pi-sandbox.py [DIR] [--model-port 8090] [--model HOST] [--model-id ID]
                  [--no-internet] [--prompt TEXT] [--image TAG]
                  [--cpus N] [--memory SIZE] [--root-disk SIZE]
                  [--name NAME] [--timeout SECS] [--dry-run]
                  [-- EXTRA_PI_ARGS...]
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request

DEFAULT_IMAGE = "pi-sandbox:v2"
DEFAULT_MODEL_HOST = "127.0.0.1"
DEFAULT_MODEL_PORT = 8090
GUEST_WORKDIR = "/workspace"
GUEST_MODELS_JSON = "/root/.pi/agent/models.json"
SANDBOX_USER = "root"

DOCKERFILE = """\
FROM node:24-bookworm-slim

RUN apt-get update \\
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep curl \\
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent pnpm
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

WORKDIR /workspace
"""

LOCAL_HOSTS = {"127.0.0.1", "::1", "localhost", "host.docker.internal"}


def die(msg: str, code: int = 1) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(code)


def run(cmd, capture=False, timeout=None):
    """Run a host command; returns CompletedProcess."""
    try:
        return subprocess.run(
            cmd,
            capture_output=capture,
            text=True,
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError:
        die(f"required command not found on host: {cmd[0]}")
    except subprocess.TimeoutExpired:
        die(f"timed out running: {' '.join(cmd)}")


def info(msg: str) -> None:
    print(f"  {msg}")


def have(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def image_present(tag: str) -> bool:
    r = run(["msb", "image", "list"], capture=True)
    if r.returncode != 0:
        die("failed to list msb images:\n" + r.stderr)
    for line in r.stdout.splitlines():
        if line.split() and line.split()[0] == tag:
            return True
    return False


def ensure_base_image(tag: str, dry_run: bool) -> None:
    """Build (via docker) and load a reusable pi base image into msb."""
    if image_present(tag):
        info(f"base image {tag!r} already in msb image store")
        return
    if not have("docker"):
        die(
            f"base image {tag!r} is not in msb yet and docker is not available.\n"
            "  build any image with pi preinstalled, then: msb image load <tar> -t {tag}"
        )
    if dry_run:
        info(f"would build+load base image {tag!r} (docker build, docker save, msb load)")
        return
    info(f"building base image {tag!r} (one-time, ~1 min)...")
    with tempfile.TemporaryDirectory(prefix="pi-sandbox-build-") as tmp:
        dockerfile = os.path.join(tmp, "Dockerfile")
        with open(dockerfile, "w") as f:
            f.write(DOCKERFILE)
        r = run(["docker", "build", "-t", tag, "-f", dockerfile, tmp], timeout=900)
        if r.returncode != 0:
            die("docker build failed:\n" + (r.stderr or r.stdout))
        tarball = os.path.join(tmp, "image.tar")
        r = run(["docker", "save", "-o", tarball, tag], timeout=600)
        if r.returncode != 0:
            die("docker save failed:\n" + (r.stderr or r.stdout))
        r = run(["msb", "load", "-i", tarball, "-t", tag], timeout=600)
        if r.returncode != 0:
            die("msb load failed:\n" + (r.stderr or r.stdout))
    info(f"base image {tag!r} ready")


def fetch_model_ids(model_host: str, model_port: int) -> list:
    """Query the llama.cpp server on the host for available models."""
    url = f"http://{model_host}:{model_port}/v1/models"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            body = json.loads(resp.read().decode())
    except Exception as e:
        die(
            f"cannot reach the model container at {url} ({e}).\n"
            "  start it first, e.g.:\n"
            "  docker run -d -p 8090:8080 --rm -v /path/to/ggufs:/models huggingface.co/ggml-org/llama.cpp:server"
        )
    entries = body.get("models") or body.get("data") or []
    ids = [e.get("model") or e.get("id") or e.get("name") for e in entries if isinstance(e, dict)]
    return [i for i in ids if i]


def slugify(path: str) -> str:
    base = os.path.basename(os.path.normpath(path)) or "pi"
    return re.sub(r"[^A-Za-z0-9._-]", "-", base)[:40] or "pi"


def guest_model_host(model_host: str) -> str:
    """Address of the model as seen from inside the sandbox."""
    return model_host if model_host not in LOCAL_HOSTS else "host.microsandbox.internal"


def build_models_json(model_host: str, model_port: int, model_id: str,
                      context_window: int, reasoning: bool, tmpdir: str) -> str:
    config = {
        "$schema": "https://pi.dev/schemas/models.schema.json",
        "providers": {
            "local-model": {
                "name": "Local model container",
                "baseUrl": f"http://{guest_model_host(model_host)}:{model_port}/v1",
                "api": "openai-completions",
                "apiKey": "not-needed",
                "models": [
                    {
                        "id": model_id,
                        "name": f"local:{os.path.basename(model_id)}",
                        "reasoning": reasoning,
                        "input": ["text"],
                        "cost": {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0},
                        "contextWindow": context_window,
                        "maxTokens": 8192,
                    }
                ],
            }
        },
    }
    path = os.path.join(tmpdir, "models.json")
    with open(path, "w") as f:
        json.dump(config, f, indent=2)
    return path


def build_msb_command(args, workdir_host, models_json_path, pi_command, sandbox_name) -> list:
    cmd = [
        "msb", "run",
        "--name", sandbox_name,
        "--replace",
        "--cpus", str(args.cpus),
        "--memory", args.memory,
        "--root-disk", args.root_disk,
        "-u", SANDBOX_USER,
        "-v", f"{workdir_host}:{GUEST_WORKDIR}",
        "--workdir", GUEST_WORKDIR,
        "--copy-file", f"{models_json_path}:{GUEST_MODELS_JSON}",
    ]
    if args.no_internet:
        target = "host" if args.model_host in LOCAL_HOSTS else args.model_host
        cmd += ["--no-net", f"--net-rule", f"allow@{target}:tcp:{args.model_port}", "--net-rule", "allow@dns"]
    else:
        cmd += ["--net", "host,public"]
    if args.prompt is not None:
        cmd.append("--no-tty")
    else:
        cmd.append("-t")
    if args.timeout:
        cmd += ["--timeout", str(args.timeout)]
    cmd += [args.image, "--"] + pi_command
    return cmd


def main() -> None:
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("dir", nargs="?", default=".", help="host directory pi works on (mounted as /workspace)")
    p.add_argument("--model-host", default=DEFAULT_MODEL_HOST,
                   help=f"model container address as seen from the host (default {DEFAULT_MODEL_HOST})")
    p.add_argument("--model-port", type=int, default=DEFAULT_MODEL_PORT,
                   help=f"published port of the model container (default {DEFAULT_MODEL_PORT})")
    p.add_argument("--model-id", default=None,
                   help="model id to use (default: first model served by the container)")
    p.add_argument("--context-window", type=int, default=60000, help="context window in tokens")
    p.add_argument("--reasoning", action="store_true", help="mark the model as reasoning-capable")
    p.add_argument("--no-internet", action="store_true",
                   help="block all external network access except the model endpoint and DNS")
    p.add_argument("--prompt", "-p", default=None,
                   help="run pi one-shot with this prompt and exit (default: interactive)")
    p.add_argument("--image", default=DEFAULT_IMAGE, help=f"msb base image tag (default {DEFAULT_IMAGE})")
    p.add_argument("--cpus", type=int, default=2, help="sandbox vCPUs (default 2)")
    p.add_argument("--memory", default="2G", help="sandbox memory (default 2G)")
    p.add_argument("--root-disk", default="4G", help="sandbox root disk (default 4G)")
    p.add_argument("--name", default=None, help="sandbox name (default derived from DIR)")
    p.add_argument("--timeout", type=int, default=None, help="msb run timeout in seconds")
    p.add_argument("--dry-run", action="store_true", help="print the msb command without running it")
    p.epilog = "Extra args after -- are passed to pi, e.g.  -- -p '...'  or  -- --continue"
    argv = sys.argv[1:]
    if "--" in argv:
        i = argv.index("--")
        args = p.parse_args(argv[:i])
        args.pi_args = argv[i + 1:]
    else:
        args = p.parse_args(argv)
        args.pi_args = []

    workdir_host = os.path.abspath(os.path.expanduser(args.dir))
    if not os.path.isdir(workdir_host):
        die(f"not a directory: {workdir_host}")

    if not have("msb"):
        die("msb is not installed (see: pip install msb or the microsandbox docs)")

    ensure_base_image(args.image, args.dry_run)

    model_ids = fetch_model_ids(args.model_host, args.model_port)
    if not model_ids:
        die(f"model container at {args.model_host}:{args.model_port} reports no models")
    model_id = args.model_id or model_ids[0]
    if args.model_id and model_id not in model_ids:
        info(f"warning: {model_id!r} not in served models {model_ids}; using it anyway")

    with tempfile.TemporaryDirectory(prefix="pi-sandbox-run-") as tmpdir:
        models_json = build_models_json(args.model_host, args.model_port, model_id,
                                        args.context_window, args.reasoning, tmpdir)
        pi_command = ["pi"]
        if args.prompt is not None:
            pi_command += ["-p", args.prompt]
        pi_command += args.pi_args

        sandbox_name = args.name or "pi-" + slugify(workdir_host)
        cmd = build_msb_command(args, workdir_host, models_json, pi_command, sandbox_name)

        print(f"pi sandbox")
        print(f"  workdir    {workdir_host}  ->  {GUEST_WORKDIR}")
        print(f"  model      {model_id}  (via http://{guest_model_host(args.model_host)}:{args.model_port}/v1)")
        print(f"  network    {'model + DNS only' if args.no_internet else 'host + public internet'}")
        print(f"  sandbox    {sandbox_name}")
        if args.dry_run:
            print("  command    " + " ".join(repr(a) for a in cmd))
            return
        r = run(cmd)
        sys.exit(r.returncode)


if __name__ == "__main__":
    main()
