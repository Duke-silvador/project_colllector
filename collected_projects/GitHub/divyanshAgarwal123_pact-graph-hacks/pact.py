"""A small, live FalkorDB feasibility slice for PACT's synthetic case."""

import argparse
import json
import os
from datetime import datetime, timezone
from uuid import uuid4

from falkordb import FalkorDB
from redis.exceptions import ResponseError


GRAPH_NAME = "pact_demo"
GOAL_ID = "school-laptops"
CONTINGENCIES = {
    "baseline": (10, 690, 750),
    "early_w3": (10, 600, 660),
    "slow_w2": (5, 690, 750),
    "rescue_w3": (5, 600, 660),
}


def graph():
    db = FalkorDB(host=os.getenv("FALKORDB_HOST", "127.0.0.1"),
                  port=int(os.getenv("FALKORDB_PORT", "6389")),
                  socket_connect_timeout=3)
    return db.select_graph(GRAPH_NAME)


def seed(g):
    """Reset only the disposable synthetic demo graph."""
    try:
        g.delete()
    except ResponseError as error:
        # A new graph has no key to delete. Other failures must remain visible.
        if "Invalid graph operation on empty key" not in str(error):
            raise
    g.query("CREATE (:Goal {id:$id, label:$label, quantity:$quantity, deadline:$deadline})",
            {"id": GOAL_ID, "label": "20 prepared laptops and a class",
             "quantity": 20, "deadline": 900})
    g.query("CREATE (:Revision {id:'case', value:1, variant:'original'})")

    requirements = [
        ("devices", "20 retired laptops", 20),
        ("wipe", "verified wiping capacity", 20),
        ("repair", "repair capacity", 20),
        ("room", "clinic room in Day 2 window", 1),
    ]
    for key, label, quantity in requirements:
        g.query("""MATCH (goal:Goal {id:$goal})
                   CREATE (goal)-[:REQUIRES]->(:Requirement
                     {id:$id, label:$label, quantity:$quantity})""",
                {"goal": GOAL_ID, "id": key, "label": label, "quantity": quantity})

    offers = [
        ("donor", "Donor D", "device-batch", "devices", 24, 0, 900, 0, 1, 0, 20, 30),
        ("wiper", "Wiping provider W", "wiping-slot", "wipe", 20, 540, 660, 10, 1, 0, 0, 0),
        ("repairer", "Repair group R", "repair-slot", "repair", 20, 540, 960, 0, 2, 12, 0, 0),
        ("school", "School S", "clinic-room", "room", 1, 1980, 2220, 0, 1, 0, 0, 0),
    ]
    for (org_id, org_name, offer_id, requirement_id, quantity, window_start,
         window_end, rate, parallelism, minutes_each, van_capacity, trip_minutes) in offers:
        g.query("""MATCH (r:Requirement {id:$requirement})
                   CREATE (org:Organization {id:$org_id, name:$org_name})
                     -[:MAKES]->(offer:Offer {id:$offer_id, quantity:$quantity,
                       window_start:$window_start, window_end:$window_end,
                       rate_per_hour:$rate, parallelism:$parallelism,
                       minutes_each:$minutes_each, van_capacity:$van_capacity,
                       trip_minutes:$trip_minutes})
                     -[:SATISFIES]->(r)""",
                {"requirement": requirement_id, "org_id": org_id,
                 "org_name": org_name, "offer_id": offer_id, "quantity": quantity,
                 "window_start": window_start, "window_end": window_end,
                 "rate": rate, "parallelism": parallelism,
                 "minutes_each": minutes_each, "van_capacity": van_capacity,
                 "trip_minutes": trip_minutes})
    for number in range(1, 25):
        g.query("""MATCH (offer:Offer {id:'device-batch'})
                   CREATE (offer)-[:INCLUDES]->(:Device {id:$id})""",
                {"id": f"L{number:02d}"})
    g.query("""MATCH (r:Requirement {id:'wipe'})
               CREATE (org:Organization {id:'wiper2', name:'Backup wiping provider W2'})
                 -[:MAKES]->(o:Offer {id:'backup-wiping-slot', quantity:10,
                   window_start:630, window_end:690, rate_per_hour:10,
                   parallelism:1, minutes_each:0, van_capacity:0,
                   trip_minutes:0, active:false})-[:SATISFIES]->(r)
               CREATE (e:Episode {id:'wiper2-rate5-history', kind:'failed_capacity',
                 rate_at_event:5, required_rate:10, simulated:true})-[:INVOLVED]->(org)""")
    g.query("""MATCH (r:Requirement {id:'wipe'})
               CREATE (:Organization {id:'wiper3', name:'Late backup W3'})
                 -[:MAKES]->(:Offer {id:'late-wiping-slot', quantity:10,
                   window_start:690, window_end:750, rate_per_hour:10,
                   parallelism:1, minutes_each:0, van_capacity:0,
                   trip_minutes:0, active:false})-[:SATISFIES]->(r)""")


def simulate_withdrawal(g):
    """One idempotent graph mutation preserves ten synthetic completed wipes."""
    ids = [f"L{number:02d}" for number in range(1, 11)]
    result = g.query("""MATCH (w:Offer {id:'wiping-slot'}),
                            (w2:Offer {id:'backup-wiping-slot'}),
                            (w3:Offer {id:'late-wiping-slot'}),
                            (org:Organization {id:'wiper'}),
                            (revision:Revision {id:'case'})
                      WHERE coalesce(w.active,true) = true
                      MATCH (device:Device) WHERE device.id IN $ids
                      WITH w,w2,w3,org,revision,collect(device) AS devices
                      WHERE size(devices)=size($ids)
                      SET w.active=false, w2.active=true, w3.active=true,
                          revision.value=revision.value+1,
                          revision.variant='baseline'
                      WITH org,devices
                      MERGE (episode:Episode {id:'wiper-withdrawal'})
                      SET episode.kind='withdrawal', episode.minute=600,
                          episode.simulated=true
                      MERGE (episode)-[:INVOLVED]->(org)
                      WITH episode,devices
                      UNWIND devices AS device
                      MERGE (record:WipeRecord {device_id:device.id})
                      SET record.completed_at=600, record.simulated=true
                      MERGE (device)-[:HAS_WIPE_RECORD]->(record)
                      MERGE (record)-[:RECORDED_IN]->(episode)
                      RETURN count(device)""", {"ids": ids})
    written = result.result_set[0][0] if result.result_set else 0
    if written == 0:
        replay = g.ro_query("""MATCH (w:Offer {id:'wiping-slot'}),
                                 (w2:Offer {id:'backup-wiping-slot'}),
                                 (w3:Offer {id:'late-wiping-slot'}),
                                 (r:Revision {id:'case'})
                             OPTIONAL MATCH (d:Device)-[:HAS_WIPE_RECORD]->(record:WipeRecord)
                               -[:RECORDED_IN]->(:Episode {id:'wiper-withdrawal'})
                             WHERE d.id IN $ids AND record.simulated=true
                             RETURN w.active,w2.active,w3.active,r.value,
                                    count(DISTINCT d.id)""", {"ids": ids}).result_set
        if (len(replay) != 1 or replay[0][:3] != [False, True, True]
                or replay[0][3] < 2 or replay[0][4] != len(ids)):
            raise ValueError("Withdrawal did not find every synthetic device")
    elif written != len(ids):
        raise ValueError("Withdrawal did not find every synthetic device")


def revision(g):
    rows = g.ro_query("MATCH (r:Revision {id:'case'}) RETURN r.value").result_set
    if len(rows) != 1:
        raise ValueError("Demo revision missing or duplicated")
    return rows[0][0]


def set_contingency(g, name):
    """Change only the synthetic backup terms, in one revisioned graph write."""
    if name not in CONTINGENCIES:
        raise ValueError("Unknown synthetic contingency")
    rate, start, end = CONTINGENCIES[name]
    rows = g.query("""MATCH (w:Offer {id:'wiping-slot'}),
                         (w2:Offer {id:'backup-wiping-slot'}),
                         (w3:Offer {id:'late-wiping-slot'}),
                         (r:Revision {id:'case'})
                      WHERE w.active=false AND w2.active=true AND w3.active=true
                        AND (w2.rate_per_hour<>$rate OR w3.window_start<>$start
                             OR w3.window_end<>$end OR coalesce(r.variant,'')<>$name)
                      SET w2.rate_per_hour=$rate,
                          w3.window_start=$start,w3.window_end=$end,
                          r.value=r.value+1,r.variant=$name
                      RETURN r.value""", {"rate": rate, "start": start,
                                           "end": end, "name": name}).result_set
    if rows:
        return rows[0][0]
    current = g.ro_query("""MATCH (w:Offer {id:'wiping-slot'}),
                               (w2:Offer {id:'backup-wiping-slot'}),
                               (w3:Offer {id:'late-wiping-slot'}),
                               (r:Revision {id:'case'})
                            RETURN w.active,w2.active,w3.active,
                                   w2.rate_per_hour,w3.window_start,w3.window_end,
                                   r.value""").result_set
    if (len(current) == 1 and current[0][:6] == [False, True, True, rate, start, end]):
        return current[0][6]
    raise ValueError("Contingency requires a complete simulated withdrawal")


def save_proposal(g, expected_revision, selected, delivery_minute, evidence_ids):
    """Atomically decline to record a pending proposal after the case changes."""
    proposal_id = str(uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    rows = g.query("""MATCH (r:Revision {id:'case'})
                      WHERE r.value=$expected
                      CREATE (p:Proposal {id:$id, revision:$expected,
                        status:'pending_human_review', delivery_minute:$delivery,
                        selected_offer_ids:$offers, evidence_ids:$evidence,
                        created_at:$created_at, simulated:true})
                      RETURN p.id""", {"expected": expected_revision,
                                       "id": proposal_id,
                                       "delivery": delivery_minute,
                                       "offers": selected,
                                       "evidence": evidence_ids,
                                       "created_at": created_at}).result_set
    return proposal_id if rows else None


def candidates(g):
    result = g.query("""MATCH (goal:Goal {id:$goal})-[:REQUIRES]->(r:Requirement)
                         <-[:SATISFIES]-(offer:Offer)<-[:MAKES]-(org:Organization)
                      WHERE coalesce(offer.active,true) = true
                      RETURN r.id, r.quantity, org.id, org.name, offer.id,
                             offer.quantity ORDER BY r.id, org.id""",
                     {"goal": GOAL_ID})
    completed_wipes = g.query("""MATCH (d:Device)-[:HAS_WIPE_RECORD]->(:WipeRecord)
                                 RETURN count(DISTINCT d)""").result_set[0][0]
    rows = [{"requirement": row[0], "needed": row[1] - completed_wipes if row[0] == "wipe" else row[1],
             "organization_id": row[2],
             "organization": row[3], "offer_id": row[4], "offered": row[5]}
            for row in result.result_set
            if row[5] >= (row[1] - completed_wipes if row[0] == "wipe" else row[1])]
    required = {row[0] for row in g.query(
        "MATCH (:Goal {id:$goal})-[:REQUIRES]->(r:Requirement) RETURN r.id",
        {"goal": GOAL_ID}).result_set}
    covered = {row["requirement"] for row in rows}
    return {"goal": GOAL_ID, "requirements": sorted(required),
            "covered": sorted(covered), "all_covered": bool(required) and required == covered,
            "candidate_offers": rows}


def scenario(g):
    """Read the current quantity, deadline, and contribution terms from FalkorDB."""
    for _ in range(3):
        before = revision(g)
        result = _scenario_once(g)
        if revision(g) == before:
            result["revision"] = before
            return result
    raise RuntimeError("Graph changed during scenario read; retry")


def _scenario_once(g):
    goals = g.query("MATCH (goal:Goal {id:$id}) RETURN goal.quantity, goal.deadline",
                    {"id": GOAL_ID}).result_set
    if len(goals) != 1:
        raise ValueError("Demo goal missing or duplicated in FalkorDB")
    variant = g.ro_query("MATCH (r:Revision {id:'case'}) RETURN r.variant").result_set
    if len(variant) != 1:
        raise ValueError("Demo variant missing or duplicated in FalkorDB")
    requirements = {row[0]: row[1] for row in g.ro_query("""MATCH (:Goal {id:$id})
                       -[:REQUIRES]->(r:Requirement) RETURN r.id,r.quantity""",
                       {"id": GOAL_ID}).result_set}
    rows = g.query("""MATCH (:Goal {id:$id})-[:REQUIRES]->(r:Requirement)
                      <-[:SATISFIES]-(o:Offer)<-[:MAKES]-(org:Organization)
                      WHERE coalesce(o.active,true) = true
                      RETURN r.id, o.id, o.quantity, o.window_start, o.window_end,
                             o.rate_per_hour, o.parallelism, o.minutes_each,
                             o.van_capacity, o.trip_minutes, org.id, org.name""",
                   {"id": GOAL_ID}).result_set
    completed = [row[0] for row in g.query("""MATCH (d:Device)-[:HAS_WIPE_RECORD]->(record:WipeRecord)
                                                  WHERE record.simulated=true RETURN d.id ORDER BY d.id""").result_set]
    inventory = [row[0] for row in g.query("""MATCH (:Offer {id:'device-batch'})
                                              -[:INCLUDES]->(d:Device)
                                              RETURN d.id ORDER BY d.id""").result_set]
    options = {}
    for row in rows:
        options.setdefault(row[0], []).append({"id": row[1], "quantity": row[2],
            "window_start": row[3], "window_end": row[4],
            "rate_per_hour": row[5], "parallelism": row[6],
            "minutes_each": row[7], "van_capacity": row[8],
            "trip_minutes": row[9], "organization_id": row[10],
            "organization": row[11],
            "path": [GOAL_ID, row[0], row[1], row[10]]})
    for offers in options.values():
        offers.sort(key=lambda offer: offer["id"])
    return {"quantity": goals[0][0], "deadline": goals[0][1],
            "variant": variant[0][0] or "custom",
            "requirement_quantities": requirements,
            "completed_wipe_ids": completed, "device_ids": inventory,
            "offer_options": options}


def memories(g):
    """Retrieve a historical failure and test it against the present offer."""
    rows = g.query("""MATCH (e:Episode {kind:'failed_capacity'})-[:INVOLVED]->
                           (org:Organization)-[:MAKES]->(offer:Offer)
                      RETURN e.id, org.name, e.rate_at_event, e.required_rate,
                             offer.id, offer.rate_per_hour""").result_set
    return [{"episode_id": row[0], "organization": row[1],
             "past_rate": row[2], "required_rate": row[3],
             "current_offer_id": row[4], "current_rate": row[5],
             "applicable_now": row[5] <= row[2],
             "interpretation": ("Present capacity remains at the failed rate" if row[5] <= row[2]
                                else "Past rate is obsolete; recheck the current offer")}
            for row in rows]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("seed", "candidates", "plan", "withdraw", "memory"))
    args = parser.parse_args()
    g = graph()
    if args.command == "seed":
        seed(g)
    elif args.command == "withdraw":
        simulate_withdrawal(g)
    if args.command == "memory":
        result = memories(g)
    elif args.command == "plan":
        from planner import plan
        result = plan(scenario(g))
    else:
        result = candidates(g)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
