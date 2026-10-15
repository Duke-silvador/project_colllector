"""Compare bounded partner search with a first-active-offer policy on the same graph facts."""

import json
import os

from falkordb import FalkorDB

from pact import memories, scenario, seed, set_contingency, simulate_withdrawal
from planner import KINDS, _plan_selection, plan


GRAPH_NAME = "pact_evaluate"
CASES = ("baseline", "early_w3", "slow_w2", "rescue_w3")


def run():
    g = FalkorDB(host=os.getenv("FALKORDB_HOST", "127.0.0.1"),
                 port=int(os.getenv("FALKORDB_PORT", "6389"))).select_graph(GRAPH_NAME)
    try:
        seed(g)
        simulate_withdrawal(g)
        results = []
        for name in CASES:
            set_contingency(g, name)
            current = scenario(g)
            first = {kind: current["offer_options"][kind][0] for kind in KINDS}
            baseline = _plan_selection(current, first)
            pact = plan(current)
            results.append({
                "case": name,
                "first_offer_status": baseline["status"],
                "first_offer_delivery_minute": baseline.get("delivery_by_minute"),
                "pact_status": pact["status"],
                "pact_offer": pact.get("selected_offers", {}).get("wipe", {}).get("id"),
                "pact_delivery_minute": pact.get("delivery_by_minute"),
                "w2_history_applicable": memories(g)[0]["applicable_now"],
            })
        assert [(row["first_offer_status"], row["pact_status"],
                 row["pact_delivery_minute"]) for row in results] == [
            ("feasible_within_model", "feasible_within_model", 870),
            ("feasible_within_model", "feasible_within_model", 840),
            ("blocked", "blocked", None),
            ("blocked", "feasible_within_model", 840),
        ]
        print(json.dumps(results, indent=2))
    finally:
        g.delete()


if __name__ == "__main__":
    run()
