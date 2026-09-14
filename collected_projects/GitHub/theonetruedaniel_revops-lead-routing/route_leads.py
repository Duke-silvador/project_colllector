"""Offline, synthetic lead-routing work sample."""
import csv
import re
from pathlib import Path


def route_batch(leads):
    """Route in input order; event/contact deduplication lasts for this batch only."""
    events, contacts, results = set(), set(), []
    for lead in leads:
        event = str(lead.get("event_id") or "").strip()
        email = str(lead.get("email") or "").strip().lower()
        result = dict(case_id=lead.get("case_id", ""), event_id=event, email=email,
                      decision="manual_review", sequence="none", owner="review_queue",
                      reason="missing_or_invalid_identity")
        if event and event in events:
            result.update(decision="duplicate_event", owner="none", reason="event_already_seen")
        else:
            if event:
                events.add(event)
            if event and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
                if email in contacts:
                    result.update(decision="existing_contact", owner="existing_owner",
                                  reason="contact_already_seen")
                else:
                    contacts.add(email)
                    visits = str(lead.get("monthly_visits", ""))
                    fit = lead.get("website_fit")
                    if lead.get("source") not in {"facebook", "app_install", "website"}:
                        result["reason"] = "unsupported_source"
                    elif fit == "fail":
                        result.update(decision="disqualified", owner="none", reason="website_fit_failed")
                    elif fit != "pass" or not re.fullmatch(r"[0-9]+", visits):
                        result["reason"] = "unknown_or_invalid_enrichment"
                    else:
                        traffic = int(visits)
                        sequence = ("starter" if traffic < 500 else "growth" if traffic < 2000
                                    else "scale" if traffic < 5000 else "strategic")
                        result.update(decision="qualified", sequence=sequence,
                                      owner="strategic_queue" if traffic >= 5000 else "sales_queue",
                                      reason="fit_passed_and_traffic_known")
        results.append(result)
    return results


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    with (root / "data/leads.csv").open(newline="", encoding="utf-8") as source:
        results = route_batch(csv.DictReader(source))
    output = root / "results/actual.csv"
    output.parent.mkdir(exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as target:
        writer = csv.DictWriter(target, fieldnames=["case_id", "event_id", "email", "decision", "sequence", "owner", "reason"])
        writer.writeheader()
        writer.writerows(results)
    print(f"Routed {len(results)} fictional intake rows to results/actual.csv; no external calls.")
