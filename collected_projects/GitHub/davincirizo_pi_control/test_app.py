import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from app import ROOT, create_app


class PiControlTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.database = Path(self.temp.name) / "test.sqlite3"
        self.app = create_app(db_path=self.database)
        self.client = self.app.test_client()
        self.client.get("/")
        with self.client.session_transaction() as session:
            self.headers = {"X-CSRF-Token": session["csrf"]}

    def tearDown(self):
        self.temp.cleanup()

    def state(self):
        return self.client.get("/api/state").get_json()

    def schedule(self, **kwargs):
        data = dict(server="server1", action="on", time="01:30", days=[6])
        data.update(kwargs)
        return self.client.post("/api/schedules", json=data, headers=self.headers)

    def test_initial_status_is_unknown(self):
        self.assertEqual(self.state()["timezone"], "America/Chicago")
        self.assertTrue(all(s["state"] == "unknown" for s in self.state()["servers"]))

    def test_csrf_and_host_guards(self):
        self.assertEqual(self.client.post("/api/actions", json={}).status_code, 403)
        self.assertEqual(self.client.get("/", headers={"Host": "evil.example"}).status_code, 403)

    def test_action_confirmation_and_persistence(self):
        data = dict(server="server1", action="off")
        self.assertEqual(self.client.post("/api/actions", json=data, headers=self.headers).status_code, 400)
        data["confirmed"] = True
        self.assertEqual(self.client.post("/api/actions", json=data, headers=self.headers).status_code, 200)
        restarted = create_app(db_path=self.database).test_client().get("/api/state").get_json()
        self.assertEqual(restarted["servers"][0]["state"], "off")
        self.assertEqual(len(restarted["events"]), 1)

    def test_schedule_validation(self):
        for change in [dict(days=[]), dict(days=[True]), dict(days=[7]), dict(time="24:00"),
                       dict(time="1:30"), dict(server="other"), dict(action="shell")]:
            self.assertEqual(self.schedule(**change).status_code, 400, change)

    def test_repeated_hour_runs_only_once_even_after_restart(self):
        self.assertEqual(self.schedule().status_code, 201)
        tick = self.app.extensions["picontrol_tick"]
        tick(datetime(2026, 11, 1, 6, 30, tzinfo=timezone.utc))
        tick(datetime(2026, 11, 1, 6, 30, 20, tzinfo=timezone.utc))
        restarted = create_app(db_path=self.database)
        restarted.extensions["picontrol_tick"](datetime(2026, 11, 1, 7, 30, tzinfo=timezone.utc))
        self.assertEqual(len(self.state()["events"]), 1)

    def test_missing_spring_hour_is_skipped(self):
        self.schedule(time="02:30")
        tick = self.app.extensions["picontrol_tick"]
        tick(datetime(2026, 3, 8, 7, 59, tzinfo=timezone.utc))
        tick(datetime(2026, 3, 8, 8, 30, tzinfo=timezone.utc))
        self.assertEqual(len(self.state()["events"]), 0)

    def test_pause_delete_and_missed_runs(self):
        self.schedule()
        sid = self.state()["schedules"][0]["id"]
        self.client.post(f"/api/schedules/{sid}/toggle", json={"enabled": False}, headers=self.headers)
        self.app.extensions["picontrol_tick"](datetime(2026, 11, 1, 6, 30, tzinfo=timezone.utc))
        self.assertEqual(len(self.state()["events"]), 0)
        self.client.post(f"/api/schedules/{sid}/toggle", json={"enabled": True}, headers=self.headers)
        self.app.extensions["picontrol_tick"](datetime(2026, 11, 1, 6, 31, tzinfo=timezone.utc))
        self.assertEqual(len(self.state()["events"]), 0)
        self.assertEqual(self.client.delete(f"/api/schedules/{sid}", headers=self.headers).status_code, 200)
        self.assertEqual(self.state()["schedules"], [])

    def test_real_mode_is_refused(self):
        config = json.loads((ROOT / "config.example.json").read_text(encoding="utf-8-sig"))
        config["mode"] = "real"
        path = Path(self.temp.name) / "config.json"
        path.write_text(json.dumps(config), encoding="utf-8")
        with self.assertRaises(ValueError):
            create_app(config_path=path, db_path=self.database)


if __name__ == "__main__":
    unittest.main()
