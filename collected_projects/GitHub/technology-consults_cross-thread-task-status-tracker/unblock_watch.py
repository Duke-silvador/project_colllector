#!/usr/bin/env python3
"""Board unblock watcher: prints tasks that newly became actionable.

A task is actionable when:
- status is 'todo', 'blocked', or 'blocked_approved', AND
- every blockedBy entry of kind 'task' points to a task with status 'done', AND
- every blockedBy entry of kind 'external' has a verifiable gate date that has arrived
  (gate = ISO date in the note, else the task's 'due' field; no date -> still blocked), AND
- no 'start' field dated in the future.

A task that never had any blockers or start gate is never surfaced here: with
nothing that could have blocked it there is no unblock event, and brand-new
todos are announced by the board publish flow. (2026-09-29: a never-gated todo
was misreported as an "unblock notice".)

Prints a JSON list of newly actionable tasks, excluding ids already recorded
in the state file. The caller (cron worker) decides per task whether the work
is mine to do or BalRam's step, acts accordingly, then records handled ids.

With --sweep, additionally prints tasks the hourly unblock check would never
re-surface:
- reason "idle": status todo, blockers already clear, never handled
  (covers state resets, downtime, or a pickup the worker never completed).
- reason "stalled": status in_progress, last update over STALL_DAYS ago,
  not recurring/standing work. Report-only: the caller must NOT auto-act,
  only surface a brief note naming the task and its last-update date.
- reason "completed_stalled": status completed, last update over a day ago —
  the post-review actions (push/tag/deploy) should finish the same day, so an
  older completed task means the automation failed or stalled. Report-only:
  surface a brief note naming the task and its last-update date.

Each sweep entry carries "reason" and an "owner_hint" ("his" when the task is
assigned to BalRam, else "mine").
"""
import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
TASKS = os.path.join(BASE, "tasks.json")
STATE = os.path.join(BASE, "hidden_files", "unblock_watch_state.json")

ISO = re.compile(r"(\d{4}-\d{2}-\d{2})")
STALL_DAYS = 3
RECURRING = re.compile(r"\b(daily|weekly|recurring|standing|ongoing|cron|digest|watchdog)\b", re.I)
HIS_STEP = re.compile(r"\(yours\)|\bhis step\b|balram'?s step", re.I)


def load(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def blockers_clear(t, byid, today):
    for b in t.get("blockedBy") or []:
        kind = b.get("kind")
        if kind == "task":
            ref = byid.get(b.get("id"))
            if not (ref and ref.get("status") == "done"):
                return False
        elif kind == "external":
            m = ISO.search(b.get("note", "") or "")
            gate = m.group(1) if m else t.get("due")
            if not gate or gate > today:
                return False
        # unknown kinds: ignore (don't block on what we can't interpret)
    start = t.get("start")
    if start and start > today:
        return False
    return True


def owner_hint(t):
    if t.get("assigned_to") == "BalRam":
        return "his"
    if t.get("assigned_to") == "Bandhu":
        return "mine"
    text = " ".join(str(t.get(k) or "") for k in ("title", "detail"))
    return "his" if HIS_STEP.search(text) else "mine"


def was_gated(t):
    """True when the task ever had something that could block it.

    A task with no blockedBy entries and no start gate was never blocked, so
    it can never "become" actionable -- it was always actionable. Such tasks
    are announced by the board publish flow, never by this watcher.
    """
    return bool(t.get("blockedBy")) or bool(t.get("start"))


def main():
    import argparse
    from datetime import date, timedelta

    ap = argparse.ArgumentParser()
    ap.add_argument("--thread", default=None, help="only consider tasks with this thread value (e.g. sv, tr, vh)")
    ap.add_argument("--sweep", action="store_true",
                    help="list idle todo tasks and possibly-stalled in_progress tasks, with reason + owner_hint")
    args = ap.parse_args()

    data = load(TASKS, {})
    items = data if isinstance(data, list) else data.get("tasks", data.get("items", []))
    byid = {t.get("id"): t for t in items}
    state = load(STATE, {})
    handled = set(state.get("handled", []))
    today = date.today().isoformat()
    stall_cutoff = (date.today() - timedelta(days=STALL_DAYS)).isoformat()

    fields = ("id", "thread", "title", "status", "due", "detail", "where", "assigned_to")
    out = []
    for t in items:
        tid = t.get("id")
        if not tid or tid in handled:
            continue
        if args.thread and t.get("thread") != args.thread:
            continue
        status = t.get("status")
        if args.sweep:
            if status == "todo" and blockers_clear(t, byid, today):
                if not was_gated(t):
                    continue  # never gated: publish flow announces new todos
                entry = {k: t.get(k) for k in fields}
                entry.update(reason="idle", owner_hint=owner_hint(t))
                out.append(entry)
            elif status == "in_progress":
                text = " ".join(str(t.get(k) or "") for k in ("title", "detail"))
                if RECURRING.search(text):
                    continue
                upd = t.get("updated") or ""
                if upd and upd >= stall_cutoff:
                    continue
                entry = {k: t.get(k) for k in fields}
                entry.update(reason="stalled", owner_hint=owner_hint(t))
                out.append(entry)
            elif status == "completed":
                upd = t.get("updated") or ""
                if upd and upd >= today:
                    continue  # completed today: post-actions may still be running
                entry = {k: t.get(k) for k in fields}
                entry.update(reason="completed_stalled", owner_hint=owner_hint(t))
                out.append(entry)
            continue
        if status not in ("todo", "blocked", "blocked_approved"):
            continue
        if not blockers_clear(t, byid, today):
            continue
        if not was_gated(t):
            continue  # never gated: nothing ever blocked it, no unblock event
        out.append({k: t.get(k) for k in fields})
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
