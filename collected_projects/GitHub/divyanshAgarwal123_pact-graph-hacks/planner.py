"""Bounded schedule solver and independent checker for PACT's first scenario."""

from math import ceil
from itertools import product

from ortools.sat.python import cp_model


KINDS = ("devices", "wipe", "repair", "room")


def _terms(scenario, offers):
    quantity = scenario["quantity"]
    requirements = scenario["requirement_quantities"]
    if (any(requirements.get(kind) != quantity for kind in ("devices", "wipe", "repair"))
            or requirements.get("room") != 1):
        return None, "Goal and requirement quantities disagree"
    completed_ids = scenario["completed_wipe_ids"]
    inventory = scenario["device_ids"]
    if len(inventory) != len(set(inventory)) or len(inventory) < quantity:
        return None, "Insufficient unique device records in the donor offer"
    if len(completed_ids) != len(set(completed_ids)) or not set(completed_ids).issubset(inventory):
        return None, "Invalid completed-device evidence"
    if len(completed_ids) > quantity:
        return None, "More completed wipes than required devices"
    remaining_wipes = quantity - len(completed_ids)
    missing = sorted(set(KINDS) - offers.keys())
    if missing:
        return None, "Missing graph offers: " + ", ".join(missing)
    donor, wiper, repairer, room = (offers[key] for key in
                                    ("devices", "wipe", "repair", "room"))
    if quantity <= 0 or donor["quantity"] < quantity or wiper["quantity"] < remaining_wipes or repairer["quantity"] < quantity or room["quantity"] < 1:
        return None, "Insufficient declared device, wiping, repair, or room quantity"
    if donor["van_capacity"] < quantity:
        return None, "One modeled van trip cannot carry the device batch"
    if wiper["rate_per_hour"] <= 0 or repairer["parallelism"] <= 0 or repairer["minutes_each"] <= 0:
        return None, "Missing positive processing capacity"
    if donor["trip_minutes"] <= 0:
        return None, "Missing transport duration"
    if not (room["window_start"] <= 1980 and room["window_end"] >= 2220):
        return None, "Day 2 clinic and introduction room window is unavailable"
    return {
        "wipe": ceil(remaining_wipes * 60 / wiper["rate_per_hour"]),
        "transfer": donor["trip_minutes"],
        "prepare": ceil(quantity * repairer["minutes_each"] / repairer["parallelism"]),
        "deliver": donor["trip_minutes"],
    }, None


def check_schedule(scenario, steps, offers):
    """Validate a returned witness without trusting the solver's own status."""
    durations, reason = _terms(scenario, offers)
    if reason:
        return False, reason
    for name, duration in durations.items():
        step = steps[name]
        if step["end"] - step["start"] != duration:
            return False, f"Wrong {name} duration"
    if steps["wipe"]["start"] < offers["wipe"]["window_start"] or steps["wipe"]["end"] > offers["wipe"]["window_end"]:
        return False, "Wiping outside provider window"
    if steps["prepare"]["start"] < offers["repair"]["window_start"] or steps["prepare"]["end"] > offers["repair"]["window_end"]:
        return False, "Preparation outside repair window"
    for before, after in (("wipe", "transfer"), ("transfer", "prepare"), ("prepare", "deliver")):
        if steps[after]["start"] < steps[before]["end"]:
            return False, f"{after} starts before {before} finishes"
    if steps["transfer"]["start"] < offers["devices"]["window_start"] or steps["deliver"]["end"] > offers["devices"]["window_end"]:
        return False, "Transport outside donor window"
    if steps["deliver"]["end"] > scenario["deadline"]:
        return False, "Delivery misses goal deadline"
    if steps["clinic"] != {"start": 1980, "end": 2160} or steps["introduction"] != {"start": 2160, "end": 2220}:
        return False, "Day 2 room program is wrong"
    return True, None


def _plan_selection(scenario, offers):
    durations, reason = _terms(scenario, offers)
    if reason:
        return {"status": "blocked", "reason": reason}

    model = cp_model.CpModel()
    starts = {}
    ends = {}
    for name in ("wipe", "transfer", "prepare", "deliver"):
        starts[name] = model.new_int_var(0, 2880, name + "_start")
        ends[name] = model.new_int_var(0, 2880, name + "_end")
        model.add(ends[name] == starts[name] + durations[name])
    model.add(starts["wipe"] >= offers["wipe"]["window_start"])
    model.add(ends["wipe"] <= offers["wipe"]["window_end"])
    model.add(starts["prepare"] >= offers["repair"]["window_start"])
    model.add(ends["prepare"] <= offers["repair"]["window_end"])
    model.add(starts["transfer"] >= offers["devices"]["window_start"])
    model.add(ends["deliver"] <= offers["devices"]["window_end"])
    model.add(ends["deliver"] <= scenario["deadline"])
    for before, after in (("wipe", "transfer"), ("transfer", "prepare"), ("prepare", "deliver")):
        model.add(starts[after] >= ends[before])
    model.minimize(ends["deliver"])
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 3
    status = solver.solve(model)
    if status == cp_model.UNKNOWN:
        return {"status": "unresolved", "reason": "Solver timed out"}
    if status == cp_model.FEASIBLE:
        return {"status": "unresolved", "reason": "Solver found a schedule but did not prove the earliest delivery"}
    if status == cp_model.MODEL_INVALID:
        return {"status": "error", "reason": "Schedule model is invalid"}
    if status == cp_model.INFEASIBLE:
        return {"status": "blocked", "reason": "No schedule fits the declared windows and deadline"}
    if status != cp_model.OPTIMAL:
        return {"status": "unresolved", "reason": "Solver returned an unrecognized status"}
    steps = {name: {"start": solver.value(starts[name]), "end": solver.value(ends[name])}
             for name in starts}
    steps["clinic"] = {"start": 1980, "end": 2160}
    steps["introduction"] = {"start": 2160, "end": 2220}
    valid, error = check_schedule(scenario, steps, offers)
    if not valid:
        return {"status": "error", "reason": "Independent schedule check failed: " + error}
    return {"status": "feasible_within_model", "quantity": scenario["quantity"],
            "delivery_by_minute": steps["deliver"]["end"], "steps": steps,
            "retained_wipe_records": scenario["completed_wipe_ids"],
            "new_wipes": scenario["quantity"] - len(scenario["completed_wipe_ids"]),
            "selected_offers": offers,
            "organizations": {key: offer["organization"] for key, offer in offers.items()},
            "note": "A proposed schedule only; no approval, reservation, or real-world delivery"}


def plan(scenario):
    """Check every bounded partner combination and report rejected graph paths."""
    options = scenario["offer_options"]
    missing = [kind for kind in KINDS if not options.get(kind)]
    if missing:
        return {"status": "blocked", "reason": "Missing graph offers: " + ", ".join(missing),
                "alternatives": []}
    count = 1
    for kind in KINDS:
        count *= len(options[kind])
    if count > 256:
        return {"status": "unresolved", "reason": "Too many partner combinations to review safely",
                "alternatives": []}
    alternatives = []
    best = None
    for choice in product(*(options[kind] for kind in KINDS)):
        selected = dict(zip(KINDS, choice))
        result = _plan_selection(scenario, selected)
        item = {"offer_ids": {kind: offer["id"] for kind, offer in selected.items()},
                "paths": {kind: offer["path"] for kind, offer in selected.items()},
                "status": result["status"]}
        if result["status"] == "feasible_within_model":
            item["delivery_by_minute"] = result["delivery_by_minute"]
            if best is None or result["delivery_by_minute"] < best["delivery_by_minute"]:
                best = result
        else:
            item["reason"] = result["reason"]
        alternatives.append(item)
    alternatives.sort(key=lambda item: tuple(item["offer_ids"][kind] for kind in KINDS))
    uncertain = [item for item in alternatives if item["status"] in ("unresolved", "error")]
    if uncertain:
        return {"status": "unresolved", "reason": "At least one partner combination could not be verified",
                "alternatives": alternatives}
    if best is None:
        return {"status": "blocked", "reason": "No partner combination fits the declared case",
                "alternatives": alternatives}
    best["alternatives"] = alternatives
    return best
