#!/usr/bin/env python3
"""Burnout as a herdr plugin: the fire dock in a 44-col split pane.

  burnout.py dock     pane entrypoint — runs the monitor (fire scene, locked)
  burnout.py open     action — toggle the dock beside the focused pane
  burnout.py close    action — close the dock if it is open

The monitor itself is upstream's claude_monitor.py, vendored at install time
(vendor/usage-monitor) or found as `claude-monitor` on PATH (Homebrew). Pure
stdlib; the only hard dependency is the python3 that runs this file.
"""
import json
import os
import shutil
import subprocess
import sys

PLUGIN_ID = "xyanwert.burnout"
WIDTH = 44                    # the dock's width — claude_monitor.py's WIDTH
MIN_CONSOLE_COLS = 40         # refuse to dock beside a pane narrower than this
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("HERDR_PLUGIN_ROOT") or HERE
VENDORED = os.path.join("vendor", "usage-monitor", "claude_monitor.py")


# ---- herdr CLI ---------------------------------------------------------------

def herdr_bin():
    return os.environ.get("HERDR_BIN_PATH") or shutil.which("herdr")


def herdr(*args):
    """Run the herdr CLI; the parsed JSON "result" ({} if the reply has none)
    or None on any failure — no binary, timeout, bad JSON, or an error reply."""
    exe = herdr_bin()
    if not exe:
        return None
    try:
        out = subprocess.run([exe] + list(args), capture_output=True,
                             text=True, timeout=5)
        data = json.loads(out.stdout or "null")
    except (OSError, ValueError, subprocess.SubprocessError):
        return None
    if not isinstance(data, dict) or "error" in data:
        return None
    res = data.get("result")
    return {} if res is None else res


def pane_info(pane_id):
    res = herdr("pane", "get", pane_id)
    return (res or {}).get("pane") if res else None


def pane_width(pane_id):
    lay = (herdr("pane", "layout", "--pane", pane_id) or {}).get("layout") or {}
    for p in lay.get("panes", []):
        if p.get("pane_id") == pane_id:
            try:
                return int(p["rect"]["width"])
            except (KeyError, TypeError, ValueError):
                return None
    return None


def focused_pane():
    """The pane the action was invoked from, if herdr told us."""
    pid = os.environ.get("HERDR_PANE_ID")
    if pid:
        return pid
    try:
        ctx = json.loads(os.environ.get("HERDR_PLUGIN_CONTEXT_JSON") or "{}")
    except ValueError:
        ctx = {}
    for key in ("focused_pane_id", "pane_id"):
        if ctx.get(key):
            return ctx[key]
    for key in ("pane", "focused_pane"):
        p = ctx.get(key)
        if isinstance(p, dict) and p.get("pane_id"):
            return p["pane_id"]
        if isinstance(p, str) and p:
            return p
    return None


# ---- state: which pane is our dock, per workspace ---------------------------

def state_path():
    d = os.environ.get("HERDR_PLUGIN_STATE_DIR") or os.path.join(
        os.environ.get("XDG_STATE_HOME", os.path.expanduser("~/.local/state")),
        "herdr-burnout")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, "dock.json")


def load_state():
    try:
        with open(state_path(), encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def save_state(state):
    path = state_path()
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(tmp, path)


def dock_alive(entry):
    """True if the remembered dock pane still exists and is still *our* pane
    (herdr may reuse a pane id; the terminal id is unique per process)."""
    pane = pane_info(entry.get("pane_id") or "")
    if not pane:
        return False
    tid = entry.get("terminal_id")
    return not tid or pane.get("terminal_id") == tid


# ---- commands ----------------------------------------------------------------

def find_monitor():
    """Resolve claude_monitor.py: explicit override, the vendored checkout,
    then `claude-monitor` on PATH (Homebrew install)."""
    for cand in (os.environ.get("BURNOUT_MONITOR"),
                 os.path.join(ROOT, VENDORED),
                 os.path.join(HERE, VENDORED),
                 shutil.which("claude-monitor")):
        if cand and os.path.isfile(cand):
            return cand
    return None


def pause(msg):
    print(msg + "\n\npress enter to close", flush=True)
    try:
        input()
    except EOFError:
        pass


def cmd_dock():
    mon = find_monitor()
    if not mon:
        pause("burnout: claude_monitor.py not found\n"
              "  looked for " + os.path.join(ROOT, VENDORED) + "\n"
              "  reinstall:  herdr plugin install xyanwert/herdr-burnout\n"
              "  or:         brew install xyanwert/tap/claude-monitor\n"
              "  or point BURNOUT_MONITOR at a checkout of claude_monitor.py")
        sys.exit(1)
    args = ["--dock", "--scene", "fire", "--lock"]
    if os.environ.get("BURNOUT_FPS"):
        args += ["--fps", os.environ["BURNOUT_FPS"]]
    # a .py runs under our interpreter (no +x needed); anything else — the
    # Homebrew `claude-monitor` — is executed as-is
    argv = ([sys.executable, mon] if mon.endswith(".py") else [mon]) + args
    try:
        rc = subprocess.call(argv)
    except OSError as e:
        pause("burnout: can't run %s (%s)" % (mon, e))
        sys.exit(1)
    if rc:   # keep the pane around so the error is readable
        pause("\nburnout exited with status %d" % rc)
    sys.exit(rc)


def close_dock(entry):
    pid = entry.get("pane_id")
    if herdr("plugin", "pane", "close", pid) is None:
        herdr("pane", "close", pid)


def cmd_open(toggle=True):
    if not os.environ.get("HERDR_ENV") and not herdr_bin():
        sys.exit("burnout: run this inside herdr (tmux users: claude-monitor side)")
    ws = os.environ.get("HERDR_WORKSPACE_ID") or "default"
    state = load_state()
    entry = state.get(ws)
    if entry and dock_alive(entry):
        if toggle:
            close_dock(entry)
            state.pop(ws, None)
            save_state(state)
            print("burnout: dock closed")
        else:
            print("burnout: dock already open in", entry["pane_id"])
        return
    if entry:                      # stale: the user closed the pane by hand
        state.pop(ws, None)
        save_state(state)
    target = focused_pane()
    if target:
        w = pane_width(target)
        if w is not None and w < WIDTH + MIN_CONSOLE_COLS:
            sys.exit("burnout: pane %s is %d cols — need at least %d to dock "
                     "a %d-col fire beside it" % (target, w,
                                                  WIDTH + MIN_CONSOLE_COLS,
                                                  WIDTH))
    args = ["plugin", "pane", "open", "--plugin", PLUGIN_ID,
            "--entrypoint", "dock", "--placement", "split",
            "--direction", "right", "--no-focus"]
    if target:
        args += ["--target-pane", target]
    res = herdr(*args)
    if res is None:
        sys.exit("burnout: herdr refused to open the dock pane "
                 "(herdr plugin log list --plugin %s)" % PLUGIN_ID)
    # herdr 0.9 replies {"plugin_pane": {"pane": {...}, ...}}; tolerate a bare
    # {"pane": {...}} or a bare pane object too
    pane = res.get("plugin_pane") or res
    pane = pane.get("pane") if isinstance(pane.get("pane"), dict) else pane
    pane_id = pane.get("pane_id")
    terminal_id = pane.get("terminal_id")
    if pane_id and not terminal_id:
        terminal_id = (pane_info(pane_id) or {}).get("terminal_id")
    if not pane_id:
        sys.exit("burnout: dock opened but herdr returned no pane id: %r" % res)
    state[ws] = {"pane_id": pane_id, "terminal_id": terminal_id}
    save_state(state)
    print("burnout: dock open in", pane_id)


def cmd_close():
    ws = os.environ.get("HERDR_WORKSPACE_ID") or "default"
    state = load_state()
    entry = state.pop(ws, None)
    if entry and dock_alive(entry):
        close_dock(entry)
        print("burnout: dock closed")
    else:
        print("burnout: no dock open")
    save_state(state)


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "open"
    if cmd == "dock":
        cmd_dock()
    elif cmd == "open":
        cmd_open(toggle=True)
    elif cmd == "close":
        cmd_close()
    elif cmd in ("-h", "--help"):
        print(__doc__.strip())
    else:
        sys.exit("burnout: unknown command %r (dock | open | close)" % cmd)


if __name__ == "__main__":
    main()
