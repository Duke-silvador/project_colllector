"""Acceptance cases catch boundary, precedence and duplicate-handling regressions."""
import unittest
from route_leads import route_batch


def lead(event="evt-1", **changes):
    row = dict(event_id=event, email="contact@example.com", source="website",
               monthly_visits=500, website_fit="pass")
    row.update(changes)
    return row


class RoutingTests(unittest.TestCase):
    def test_traffic_boundaries_select_the_right_sequence(self):
        cases = [(0, "starter"), (499, "starter"), (500, "growth"),
                 (1999, "growth"), (2000, "scale"), (4999, "scale"),
                 (5000, "strategic"), (50000, "strategic")]
        for visits, sequence in cases:
            with self.subTest(visits=visits):
                rows = route_batch([lead(monthly_visits=visits)])
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]["sequence"], sequence)
                self.assertEqual(rows[0]["decision"], "qualified")

    def test_fit_failure_overrides_high_traffic(self):
        rows = route_batch([lead(monthly_visits=9000, website_fit="fail")])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["decision"], "disqualified")
        self.assertEqual(rows[0]["sequence"], "none")

    def test_unknown_or_invalid_enrichment_requires_review(self):
        for value in [None, "", "unknown", -1, "NaN", True, 1.5]:
            with self.subTest(value=value):
                rows = route_batch([lead(monthly_visits=value)])
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]["decision"], "manual_review")

    def test_replayed_event_is_not_routed_twice(self):
        rows = route_batch([lead(), lead(email="other@example.com")])
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1]["decision"], "duplicate_event")
        self.assertEqual(rows[1]["sequence"], "none")

    def test_email_normalization_avoids_duplicate_contacts(self):
        rows = route_batch([lead(), lead("evt-2", email=" CONTACT@EXAMPLE.COM ")])
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1]["decision"], "existing_contact")
        self.assertEqual(rows[1]["sequence"], "none")

    def test_missing_identity_or_unsupported_source_requires_review(self):
        for changes in [{"email": ""}, {"email": "invalid"}, {"event_id": ""},
                        {"source": "unknown"}, {"website_fit": "unknown"}]:
            with self.subTest(changes=changes):
                rows = route_batch([lead(**changes)])
                self.assertEqual(len(rows), 1)
                self.assertEqual(rows[0]["decision"], "manual_review")
                self.assertEqual(rows[0]["sequence"], "none")

    def test_all_intake_sources_follow_the_same_rules(self):
        for source in ["facebook", "app_install", "website"]:
            rows = route_batch([lead(source=source)])
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["decision"], "qualified")

    def test_batches_do_not_share_hidden_state_or_mutate_inputs(self):
        original = lead(email=" CONTACT@EXAMPLE.COM ")
        rows = route_batch([original])
        self.assertEqual(len(rows), 1)
        self.assertEqual(route_batch([original]), rows)
        self.assertEqual(original["email"], " CONTACT@EXAMPLE.COM ")


if __name__ == "__main__":
    unittest.main()
