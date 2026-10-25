import json
import socket
import subprocess
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from app import ROOT, create_app
from control import Controller


class RealControlTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.config = json.loads((ROOT / "config.example.json").read_text(encoding="utf-8-sig"))
        self.config["mode"] = "real"
        self.config["ssh"] = {"identity_file": str(self.root / "key"), "known_hosts_file": str(self.root / "known_hosts")}
        for path in self.config["ssh"].values():
            Path(path).write_text("dummy fixture", encoding="utf-8")
        for server in self.config["servers"]:
            server["actions_enabled"] = True
        self.controller = Controller(self.config)

    def tearDown(self):
        self.temp.cleanup()

    @patch("control.socket.socket")
    def test_wol_packet_and_destination(self, mock_socket):
        self.controller.execute("server1", "on")
        udp = mock_socket.return_value.__enter__.return_value
        mac = bytes.fromhex("e454e860235e")
        udp.sendto.assert_called_once_with(b"\xff" * 6 + mac * 16, ("10.0.0.255", 9))
        udp.setsockopt.assert_called_once_with(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

    @patch("control.subprocess.run")
    def test_fixed_ssh_command_and_host_verification(self, run):
        run.return_value = subprocess.CompletedProcess([], 0, "", "")
        self.controller.execute("server1", "off")
        args = run.call_args.args[0]
        self.assertEqual(args[-2:], ["server1@10.0.0.127", "/usr/bin/sudo -n /usr/bin/systemctl poweroff"])
        self.assertIn("StrictHostKeyChecking=yes", args)
        self.assertIn("BatchMode=yes", args)
        self.assertNotIn("shell", run.call_args.kwargs)
        self.assertEqual(run.call_args.kwargs["timeout"], 15)

    @patch("control.subprocess.run")
    def test_failure_not_reported_as_success_or_retried(self, run):
        run.return_value = subprocess.CompletedProcess([], 255, "", "closed")
        with self.assertRaises(RuntimeError):
            self.controller.execute("server1", "restart")
        self.assertEqual(run.call_count, 1)

    @patch("control.subprocess.run")
    @patch("control.socket.socket")
    def test_disabled_server_has_no_side_effects(self, sock, run):
        self.config["servers"][0]["actions_enabled"] = False
        with self.assertRaises(ValueError):
            self.controller.execute("server1", "on")
        sock.assert_not_called()
        run.assert_not_called()

    @patch("control.subprocess.run")
    def test_preflight_only_lists_privileges(self, run):
        run.return_value = subprocess.CompletedProcess([], 0, "host", "")
        self.controller.preflight()
        commands = [call.args[0][-1] for call in run.call_args_list]
        self.assertEqual(len(commands), 6)
        self.assertTrue(all(c == "hostname" or "sudo -n -l " in c for c in commands))

    @patch("control.socket.create_connection", side_effect=OSError("unreachable"))
    def test_no_connection_is_not_reported_as_off(self, connect):
        self.assertEqual(self.controller.status("server1"), "unreachable")

    @patch("app.Controller")
    def test_real_database_does_not_reuse_simulated_schedules(self, mock_controller):
        path = self.root / "config.json"
        simulation = dict(self.config, mode="simulation")
        path.write_text(json.dumps(simulation))
        with patch("app.ROOT", self.root):
            client = create_app(config_path=path).test_client()
            client.get("/")
            with client.session_transaction() as session:
                headers = {"X-CSRF-Token": session["csrf"]}
            client.post("/api/schedules", headers=headers, json={"server":"server1", "action":"off", "days":[0], "time":"12:00"})
            self.assertEqual(len(client.get("/api/state").get_json()["schedules"]), 1)
            path.write_text(json.dumps(self.config))
            mock_controller.return_value.status.return_value = "reachable"
            real = create_app(config_path=path).test_client()
            self.assertEqual(real.get("/api/state").get_json()["schedules"], [])
            mock_controller.return_value.execute.assert_not_called()

    @patch("app.Controller")
    def test_real_failure_history_and_scheduler_no_retry(self, mock_controller):
        mock_controller.return_value.status.return_value = "reachable"
        mock_controller.return_value.execute.side_effect = RuntimeError("SSH failure")
        path = self.root / "config.json"
        path.write_text(json.dumps(self.config))
        database = self.root / "test.db"
        app = create_app(config_path=path, db_path=database)
        client = app.test_client()
        client.get("/")
        with client.session_transaction() as session:
            headers = {"X-CSRF-Token": session["csrf"]}
        response = client.post("/api/actions", headers=headers, json={"server":"server1", "action":"off", "confirmed":True})
        self.assertEqual(response.status_code, 502)
        events = client.get("/api/state").get_json()["events"]
        self.assertIn("SSH failure", events[0]["detail"])
        client.post("/api/schedules", headers=headers, json={"server":"server1", "action":"on", "days":[6], "time":"01:30"})
        tick = app.extensions["picontrol_tick"]
        tick(datetime(2026, 11, 1, 6, 30, tzinfo=timezone.utc))
        restarted = create_app(config_path=path, db_path=database)
        restarted.extensions["picontrol_tick"](datetime(2026, 11, 1, 7, 30, tzinfo=timezone.utc))
        self.assertEqual(mock_controller.return_value.execute.call_count, 2)


if __name__ == "__main__":
    unittest.main()
