"""Integration checks against a disposable FalkorDB graph, never pact_demo."""

import asyncio
import os
from concurrent.futures import ThreadPoolExecutor
from threading import Event
from unittest.mock import patch

from falkordb import FalkorDB

from agent import _mcp_call
from mcp_server import create_server
from pact import (memories, revision, save_proposal, scenario, seed,
                  set_contingency, simulate_withdrawal)
from planner import _plan_selection, cp_model, plan


NAME = "pact_verify"


def connection():
    return FalkorDB(host=os.getenv("FALKORDB_HOST", "127.0.0.1"),
                    port=int(os.getenv("FALKORDB_PORT", "6389"))).select_graph(NAME)


def checked(value, message):
    if not value:
        raise AssertionError(message)


def run():
    g = connection()
    try:
        seed(g)
        original = plan(scenario(g))
        checked(original["status"] == "feasible_within_model" and
                original["delivery_by_minute"] == 840, "Original case must deliver at 14:00")
        mcp_tools = create_server(lambda: g)
        checked(asyncio.run(_mcp_call(mcp_tools, "inspect_connections"))["all_covered"] is True,
                "MCP connection inspection must read the disposable graph")
        checked(asyncio.run(_mcp_call(mcp_tools, "check_schedule"))["delivery_by_minute"] == 840,
                "MCP schedule tool must use the current graph")
        checked(asyncio.run(_mcp_call(mcp_tools, "recall_failure"))[0]["episode_id"] == "wiper2-rate5-history",
                "MCP memory tool must return the graph episode")
        try:
            set_contingency(g, "early_w3")
        except ValueError:
            pass
        else:
            raise AssertionError("Counterfactual changes require withdrawal first")

        simulate_withdrawal(g)
        recovered = scenario(g)
        result = plan(recovered)
        checked(recovered["revision"] == 2 and len(recovered["completed_wipe_ids"]) == 10,
                "Withdrawal must retain exactly ten records in revision 2")
        checked(result["status"] == "feasible_within_model" and
                result["selected_offers"]["wipe"]["id"] == "backup-wiping-slot" and
                result["delivery_by_minute"] == 870, "W2 must deliver by 14:30")
        checked(len(result["alternatives"]) == 2 and
                any(a["offer_ids"]["wipe"] == "late-wiping-slot" and
                    a["status"] == "blocked" for a in result["alternatives"]),
                "Late W3 offer must be rejected explicitly")
        def one_unresolved(case, offers):
            if offers["wipe"]["id"] == "late-wiping-slot":
                return {"status": "unresolved", "reason": "Simulated solver timeout"}
            return _plan_selection(case, offers)
        with patch("planner._plan_selection", side_effect=one_unresolved):
            checked(plan(recovered)["status"] == "unresolved",
                    "An unchecked alternative must not produce a definitive recommendation")
        with patch.object(cp_model.CpSolver, "solve", return_value=cp_model.FEASIBLE):
            checked(_plan_selection(recovered, result["selected_offers"])["status"] == "unresolved",
                    "A merely feasible solver status must not claim earliest delivery")
        simulate_withdrawal(g)
        checked(revision(g) == 2 and len(scenario(g)["completed_wipe_ids"]) == 10,
                "Withdrawal replay must be idempotent")

        g.query("MATCH (:Device {id:'L10'})-[:HAS_WIPE_RECORD]->(r:WipeRecord) DETACH DELETE r")
        try:
            simulate_withdrawal(g)
        except ValueError:
            pass
        else:
            raise AssertionError("Incomplete recovery must not pass as an idempotent replay")
        seed(g)
        simulate_withdrawal(g)

        selected = [o["id"] for o in result["selected_offers"].values()]
        checked(save_proposal(g, 1, selected, 870, selected) is None,
                "Stale revision must reject a proposal")
        proposal_id = save_proposal(g, 2, selected, 870, selected)
        checked(proposal_id is not None, "Current revision must accept a pending proposal")
        rows = connection().ro_query("MATCH (p:Proposal {id:$id}) RETURN p.revision,p.status",
                                     {"id": proposal_id}).result_set
        checked(rows == [[2, "pending_human_review"]], "Proposal must survive a new connection")

        checked(set_contingency(g, "slow_w2") == 3,
                "Slower W2 must advance the case revision")
        checked(plan(scenario(g))["status"] == "blocked", "Both backups must fail at current rate")
        checked(memories(g)[0]["applicable_now"] is True,
                "Old W2 rate episode must become applicable at the same current rate")
        checked(2 != revision(g), "Saved proposal must be stale after a changed offer")
        checked(set_contingency(g, "rescue_w3") == 4,
                "Earlier W3 must rescue the case when W2 slows")
        switched = plan(scenario(g))
        checked(switched["status"] == "feasible_within_model" and
                switched["selected_offers"]["wipe"]["id"] == "late-wiping-slot" and
                switched["delivery_by_minute"] == 840 and
                memories(g)[0]["applicable_now"] is True,
                "W3 must recover the goal without erasing applicable W2 history")
        checked(set_contingency(g, "early_w3") == 5,
                "Restored W2 rate with earlier W3 must advance the case revision")
        checked(plan(scenario(g))["selected_offers"]["wipe"]["id"] == "late-wiping-slot",
                "Earlier W3 must still be the quickest choice")
        checked(set_contingency(g, "early_w3") == 5 and revision(g) == 5,
                "Repeated counterfactual must not change revision")
        simulate_withdrawal(g)
        checked(revision(g) == 5 and len(scenario(g)["completed_wipe_ids"]) == 10,
                "Withdrawal replay must remain safe after a later case revision")
        checked(set_contingency(g, "baseline") == 6 and
                plan(scenario(g))["selected_offers"]["wipe"]["id"] == "backup-wiping-slot",
                "Baseline restoration must recover W2")

        seed(g)
        g.query("MATCH (o:Offer {id:'device-batch'}) SET o.quantity=18")
        checked(plan(scenario(g))["status"] == "blocked", "Insufficient donor quantity must block")
        seed(g)
        g.query("MATCH (goal:Goal {id:'school-laptops'}) SET goal.deadline=810")
        checked(plan(scenario(g))["status"] == "blocked", "Earlier deadline must block")
        seed(g)
        g.query("MATCH (o:Offer {id:'clinic-room'}) SET o.quantity=0")
        checked(plan(scenario(g))["status"] == "blocked", "Missing room capacity must block")
        seed(g)
        g.query("MATCH (r:Requirement {id:'devices'}) SET r.quantity=18")
        checked(plan(scenario(g))["status"] == "blocked", "Contradictory requirement must block")
        seed(g)
        for number in range(20, 25):
            g.query("MATCH (d:Device {id:$id}) DETACH DELETE d",
                    {"id": f"L{number:02d}"})
        checked(plan(scenario(g))["status"] == "blocked", "Missing donor devices must block")

        seed(g)
        g.query("MATCH (d:Device {id:'L10'}) DETACH DELETE d")
        try:
            simulate_withdrawal(g)
        except ValueError:
            pass
        else:
            raise AssertionError("Missing device must reject the whole withdrawal")
        checked(revision(g) == 1 and
                g.ro_query("MATCH (w:Offer {id:'wiping-slot'}) RETURN w.active").result_set == [[None]] and
                not g.ro_query("MATCH (r:WipeRecord) RETURN r").result_set,
                "Failed withdrawal must leave the case untouched")

        seed(g)
        started = Event()

        def read_snapshots():
            started.set()
            seen = []
            for _ in range(20):
                snapshot = scenario(connection())
                seen.append((snapshot["revision"], len(snapshot["completed_wipe_ids"])))
            return seen

        with ThreadPoolExecutor(max_workers=2) as pool:
            reading = pool.submit(read_snapshots)
            started.wait()
            simulate_withdrawal(g)
            seen = reading.result()
        checked(set(seen) <= {(1, 0), (2, 10)}, f"Partial snapshot observed: {seen}")
        checked((2, 10) == (revision(g), len(scenario(g)["completed_wipe_ids"])),
                "Recovered case must remain complete")
        print("PASS: MCP graph tools, base, competing offers, solver uncertainty, live contingencies, partner switch, "
              "replay integrity, "
              "stale and persisted proposals, six blocked constraints, "
              "failed atomic withdrawal, concurrent snapshots")
    finally:
        g.delete()


if __name__ == "__main__":
    run()
