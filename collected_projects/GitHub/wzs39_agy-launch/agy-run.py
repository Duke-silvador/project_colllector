r"""agy-run.py -- one entry point, four launch modes, nothing left implicit.

Why
---
Before 2026-11-13 every launch path had its own copy of the proxy logic:
agy.cmd set HTTP(S)_PROXY and spawned mitmdump, agy-unlock.cmd did the same
with a different port, antigravity-gui-unlock.cmd added --proxy-server for the
Electron layer, and mitm-ensure.cmd quietly resurrected mitmdump every five
minutes. There was no way to say "just run it directly this time" without
editing a batch file.

This script makes the choice explicit and auditable:

  --mode direct   no proxy env at all; process-level only, nothing to undo
  --mode socks    start/reuse socks_forward.py, point the client at socks5h
  --mode mitm     start/reuse mitmdump + agy_unlock_addon.py (the rewriting
                  proxy -- kept for diagnosis on a throwaway account only)
  --mode status   report what is currently listening and what it would use

The environment is set on the child process only. This process never writes
HTTPS_PROXY into the user or machine scope, never installs a CA, and never
kills unrelated processes -- the previous scripts' taskkill /IM mitmdump.exe
hit every mitmdump on the box, including ones belonging to other tools.

Exit codes
----------
  0  launched (or status printed)
  1  prerequisite missing (binary not found, port busy, mitm CA absent)
  2  bad arguments

Examples
--------
  python agy-run.py --mode direct --target cli -- -p "hello"
  python agy-run.py --mode socks  --target cli -- -p "hello"
  python agy-run.py --mode socks  --target gui
  python agy-run.py --mode status
  python agy-run.py --mode mitm   --target cli --port 18080 -- -p "hello"
"""

import argparse
import json
import os
import socket
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
AGY_EXE = os.path.join(os.environ.get("LOCALAPPDATA", ""), "agy", "bin", "agy.exe")
GUI_EXE = os.path.join(os.environ.get("LOCALAPPDATA", ""),
                       "Programs", "antigravity", "Antigravity.exe")

SOCKS_SCRIPT = os.path.join(HERE, "socks_forward.py")
ADDON_SCRIPT = os.path.join(HERE, "agy_unlock_addon.py")
SOCKS_LOG = os.path.join(HERE, "socks-forward.log")
MITM_LOG = os.path.join(HERE, "mitm-proxy.log")

DEFAULT_SOCKS_PORT = 1080
DEFAULT_MITM_PORT = 18080


def say(*parts):
    """flush immediately: otherwise the child's own output races ahead of ours
    and the banner ends up underneath agy's, which reads like misordering."""
    print(*parts, flush=True)


# ------------------------------------------------------------------- utilities

def port_open(host, port, timeout=0.6):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        return True
    except OSError:
        return False
    finally:
        try:
            sock.close()
        except OSError:
            pass


def find_python():
    exe = sys.executable
    return exe if exe and os.path.isfile(exe) else "python"


def find_mitmdump():
    """PATH first, then the Scripts dir next to the running interpreter."""
    from shutil import which
    found = which("mitmdump") or which("mitmdump.exe")
    if found:
        return found
    candidate = os.path.join(os.path.dirname(find_python()), "Scripts", "mitmdump.exe")
    return candidate if os.path.isfile(candidate) else None


def spawn_detached(argv, log_path):
    """Start a helper without a console window, appending to log_path."""
    creationflags = 0
    if os.name == "nt":
        creationflags = 0x08000000  # CREATE_NO_WINDOW
    log = open(log_path, "ab")
    try:
        proc = subprocess.Popen(argv, stdout=log, stderr=log, stdin=subprocess.DEVNULL,
                                creationflags=creationflags, close_fds=True)
    finally:
        log.close()
    return proc


def wait_port(host, port, seconds=6.0):
    deadline = time.time() + seconds
    while time.time() < deadline:
        if port_open(host, port):
            return True
        time.sleep(0.2)
    return False


# ---------------------------------------------------------------------- modes

def ensure_socks(port, upstream):
    if port_open("127.0.0.1", port):
        say("socks   reusing listener on 127.0.0.1:%d" % port)
        return True
    argv = [find_python(), SOCKS_SCRIPT, "--listen", "127.0.0.1:%d" % port]
    if upstream:
        argv += ["--upstream", upstream]
    say("socks   starting %s" % " ".join(argv[1:]))
    spawn_detached(argv, SOCKS_LOG)
    if wait_port("127.0.0.1", port):
        say("socks   up on 127.0.0.1:%d (log: %s)" % (port, SOCKS_LOG))
        return True
    say("socks   FAILED to listen on %d -- see %s" % (port, SOCKS_LOG))
    return False


def ensure_mitm(port):
    """Only used by --mode mitm: needs mitmdump AND a trusted mitm CA."""
    mitmdump = find_mitmdump()
    if not mitmdump:
        say("mitm    mitmdump not found; pip install mitmproxy")
        return None
    ca = os.path.join(os.path.expanduser("~"), ".mitmproxy", "mitmproxy-ca-cert.cer")
    if not os.path.isfile(ca):
        say("mitm    CA missing at %s -- run mitmdump once to generate it" % ca)
        return None
    if not os.path.isfile(ADDON_SCRIPT):
        say("mitm    addon missing at %s" % ADDON_SCRIPT)
        return None
    if port_open("127.0.0.1", port):
        say("mitm    reusing listener on 127.0.0.1:%d" % port)
        return mitmdump
    say("mitm    starting addon proxy on 127.0.0.1:%d" % port)
    spawn_detached([mitmdump, "-s", ADDON_SCRIPT,
                    "--listen-port", str(port),
                    "--listen-host", "127.0.0.1", "--quiet"], MITM_LOG)
    if wait_port("127.0.0.1", port):
        say("mitm    up on 127.0.0.1:%d (log: %s)" % (port, MITM_LOG))
        return mitmdump
    say("mitm    FAILED to listen on %d -- see %s" % (port, MITM_LOG))
    return None


def proxy_env(mode, port):
    """Child-process environment. Empty dict for direct = nothing to inherit."""
    if mode == "direct":
        return {}
    if mode == "socks":
        url = "socks5h://127.0.0.1:%d" % port
    else:
        url = "http://127.0.0.1:%d" % port
    return {
        "HTTP_PROXY": url,
        "HTTPS_PROXY": url,
        "ALL_PROXY": url,
        "NO_PROXY": "localhost,127.0.0.1",
    }


# -------------------------------------------------------------------- targets

def launch_cli(mode, port, passthrough):
    if not os.path.isfile(AGY_EXE):
        say("error   agy.exe not found at %s" % AGY_EXE)
        return 1

    env = os.environ.copy()
    # Strip any inherited proxy so --mode direct really means direct.
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
                "http_proxy", "https_proxy", "all_proxy", "no_proxy"):
        env.pop(key, None)
    env.update(proxy_env(mode, port))

    argv = [AGY_EXE] + passthrough
    say("cli     %s" % " ".join(argv))
    if mode == "direct":
        say("cli     no proxy environment set")
    else:
        say("cli     HTTP(S)_PROXY=%s" % env.get("HTTPS_PROXY"))
    return subprocess.call(argv, env=env)


def launch_gui(mode, port):
    if not os.path.isfile(GUI_EXE):
        say("error   Antigravity.exe not found at %s" % GUI_EXE)
        return 1

    env = os.environ.copy()
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
                "http_proxy", "https_proxy", "all_proxy", "no_proxy"):
        env.pop(key, None)
    env.update(proxy_env(mode, port))

    argv = [GUI_EXE]
    if mode == "socks":
        # Chromium speaks SOCKS5 but not the socks5h alias; give it the plain
        # scheme so it resolves through the proxy rather than locally.
        argv.append("--proxy-server=socks5://127.0.0.1:%d" % port)
    elif mode == "mitm":
        argv.append("--proxy-server=http://127.0.0.1:%d" % port)

    say("gui     %s" % " ".join(argv))
    creationflags = 0x00000008 if os.name == "nt" else 0  # DETACHED_PROCESS
    subprocess.Popen(argv, env=env, creationflags=creationflags, close_fds=True)
    say("gui     launched (Electron --proxy-server covers Chromium, "
        "env covers language_server.exe)")
    return 0


# -------------------------------------------------------------------- status

def print_status(socks_port, mitm_port):
    say("=" * 68)
    say("agy launch status")
    say("=" * 68)

    say("\n[binaries]")
    for label, path in (("agy.exe", AGY_EXE), ("Antigravity.exe", GUI_EXE),
                        ("socks_forward.py", SOCKS_SCRIPT),
                        ("agy_unlock_addon.py", ADDON_SCRIPT)):
        say("  %-20s %s" % (label, "ok" if os.path.isfile(path) else "MISSING"))
    mitmdump = find_mitmdump()
    say("  %-20s %s" % ("mitmdump", mitmdump or "not installed"))

    say("\n[listeners]")
    say("  socks 127.0.0.1:%d  %s" % (
        socks_port, "LISTENING" if port_open("127.0.0.1", socks_port) else "down"))
    say("  mitm  127.0.0.1:%d  %s" % (
        mitm_port, "LISTENING" if port_open("127.0.0.1", mitm_port) else "down"))

    say("\n[parent-process proxy env]")
    any_set = False
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY"):
        val = os.environ.get(key)
        if val:
            any_set = True
            say("  %-12s %s" % (key, val))
    if not any_set:
        say("  (none -- agy-run.py sets proxy per child, never globally)")

    say("\n[mitm CA in CurrentUser\\Root]")
    try:
        out = subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             "$s=New-Object Security.Cryptography.X509Certificates.X509Store('Root','CurrentUser');"
             "$s.Open('ReadOnly');"
             "($s.Certificates | Where-Object { $_.Subject -match 'mitmproxy' }).Count;"
             "$s.Close()"],
            capture_output=True, text=True, timeout=15)
        count = (out.stdout or "").strip() or "?"
        say("  mitmproxy certs: %s  %s" % (
            count, "(trusted -> mitm mode works)" if count not in ("0", "?")
            else "(absent -> only direct/socks will connect)"))
    except (OSError, subprocess.SubprocessError) as exc:
        say("  could not query cert store: %s" % exc)

    # mitm-ensure.cmd used to be scheduled every five minutes; if that task is
    # still registered, --mode direct is undone minutes later by a background
    # mitmdump nobody asked for. Surface it instead of silently fighting it.
    say("\n[autostart]")
    try:
        out = subprocess.run(["schtasks", "/query", "/fo", "CSV", "/nh"],
                             capture_output=True, text=True, timeout=20)
        hits = [line.split(",")[0].strip('"') for line in (out.stdout or "").splitlines()
                if "mitm" in line.lower()]
        if hits:
            say("  scheduled tasks touching mitmproxy: %s" % ", ".join(sorted(set(hits))))
            say("  -> these respawn mitmdump; disable with:")
            for name in sorted(set(hits)):
                say("     schtasks /change /tn \"%s\" /disable" % name)
        else:
            say("  none (no scheduled task will resurrect mitmdump behind you)")
    except (OSError, subprocess.SubprocessError) as exc:
        say("  could not query schtasks: %s" % exc)

    say("\n[next]")
    say("  python agy-run.py --mode direct --target cli -- -p \"hello\"")
    say("  python agy-run.py --mode socks  --target cli -- -p \"hello\"")
    return 0


# ------------------------------------------------------------------ interactive

MENU = """
============================================================
  agy launcher
============================================================

  [1] direct   no proxy              (try first when something breaks)
  [2] socks    socks5, TLS end-to-end (no interception, native JA3)
  [3] mitm     http MITM + rewrite    (diagnostics only)
  [4] status   listeners / binaries / CA / autostart
"""

MODE_BY_PICK = {"1": "direct", "2": "socks", "3": "mitm", "4": "status"}
TARGET_BY_PICK = {"c": "cli", "g": "gui", "": "cli"}


def _ask(prompt, default=""):
    """One prompt, tolerant of EOF: a closed stdin must not hang the launcher."""
    try:
        return input(prompt).strip() or default
    except EOFError:
        return default


def interactive(argv_tail):
    """Menu lives here, not in the .cmd.

    A .cmd is parsed in the console code page, so non-ASCII prompts there get
    split into stray commands, and `set /p` under redirected stdin misbehaves.
    Python handles both correctly, so agy-launch.cmd only forwards to this.
    """
    say(MENU)
    pick = _ask("mode [1-4, default 1]: ", "1")
    mode = MODE_BY_PICK.get(pick)
    if mode is None:
        say("[!] invalid choice: %s" % pick)
        return 2
    if mode == "status":
        return print_status(DEFAULT_SOCKS_PORT, DEFAULT_MITM_PORT)

    say("\n  [c] cli  = agy.exe         (CLI)")
    say("  [g] gui  = Antigravity.exe (desktop)\n")
    tpick = _ask("target [c/g, default c]: ", "c").lower()
    target = TARGET_BY_PICK.get(tpick)
    if target is None:
        say("[!] invalid target: %s" % tpick)
        return 2

    passthrough = list(argv_tail)
    if target == "cli" and not passthrough:
        say('\n  Extra agy arguments (blank = interactive). Example:  -p "hello"')
        raw = _ask("agy args: ")
        if raw:
            # shlex keeps quoted phrases together the way the shell would.
            import shlex
            try:
                passthrough = shlex.split(raw)
            except ValueError:
                passthrough = raw.split()

    say("\n[*] mode=%s  target=%s\n" % (mode, target))

    if mode == "socks":
        if not ensure_socks(DEFAULT_SOCKS_PORT, None):
            return 1
    elif mode == "mitm":
        if ensure_mitm(DEFAULT_MITM_PORT) is None:
            return 1
    else:
        say("direct  no proxy started, no CA needed")

    if target == "gui":
        return launch_gui(mode, DEFAULT_MITM_PORT if mode == "mitm" else DEFAULT_SOCKS_PORT)
    return launch_cli(mode, DEFAULT_MITM_PORT if mode == "mitm" else DEFAULT_SOCKS_PORT,
                      passthrough)


# ---------------------------------------------------------------------- main

def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Explicit launcher for agy / Antigravity GUI: choose direct vs proxy")
    ap.add_argument("--mode", choices=["direct", "socks", "mitm", "status"],
                    default=None,
                    help="omit to get the interactive menu")
    ap.add_argument("--target", choices=["cli", "gui"], default="cli")
    ap.add_argument("--port", type=int, default=None,
                    help="socks default %d, mitm default %d"
                         % (DEFAULT_SOCKS_PORT, DEFAULT_MITM_PORT))
    ap.add_argument("--upstream", default=None,
                    help="socks5h://HOST:PORT chained behind --mode socks")
    ap.add_argument("--json", action="store_true", help="status as JSON")
    # parse_known_args, not REMAINDER: REMAINDER interacts badly with '--' and
    # would also swallow flags that belong to agy. Anything we do not recognise
    # is treated as agy's own argument and forwarded untouched.
    args, passthrough = ap.parse_known_args(argv)
    if passthrough and passthrough[0] == "--":
        passthrough = passthrough[1:]

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    if args.mode is None:
        return interactive(passthrough)

    socks_port = args.port or DEFAULT_SOCKS_PORT
    mitm_port = args.port or DEFAULT_MITM_PORT

    if args.mode == "status":
        if args.json:
            say(json.dumps({
                "agy": os.path.isfile(AGY_EXE),
                "gui": os.path.isfile(GUI_EXE),
                "socks_listening": port_open("127.0.0.1", socks_port),
                "mitm_listening": port_open("127.0.0.1", mitm_port),
                "mitmdump": find_mitmdump(),
            }, indent=2))
            return 0
        return print_status(socks_port, mitm_port)

    if args.mode == "socks":
        if not ensure_socks(socks_port, args.upstream):
            return 1
    elif args.mode == "mitm":
        if ensure_mitm(mitm_port) is None:
            return 1
    else:
        say("direct  no proxy started, no CA needed")

    if args.target == "gui":
        return launch_gui(args.mode, mitm_port if args.mode == "mitm" else socks_port)
    return launch_cli(args.mode, mitm_port if args.mode == "mitm" else socks_port,
                      passthrough)


if __name__ == "__main__":
    sys.exit(main())
