"""Fixed, non-interactive SSH commands and Wake-on-LAN. No arbitrary commands."""
import ipaddress
import json
import re
import socket
import subprocess
import sys
from pathlib import Path

COMMANDS = {"off": "/usr/bin/sudo -n /usr/bin/systemctl poweroff",
            "restart": "/usr/bin/sudo -n /usr/bin/systemctl reboot"}


class Controller:
    def __init__(self, config):
        self.servers = {s["id"]: s for s in config["servers"]}
        self.key = config["ssh"]["identity_file"]
        self.known_hosts = config["ssh"]["known_hosts_file"]
        for path in (self.key, self.known_hosts):
            if not Path(path).is_file():
                raise ValueError(f"Falta el archivo SSH: {path}")
            with open(path, "rb") as stream:
                if not stream.read(1):
                    raise ValueError(f"Archivo SSH vacío: {path}")
        for server in self.servers.values():
            ipaddress.IPv4Address(server["lan_ip"])
            ipaddress.IPv4Address(server["broadcast_address"])
            if not re.fullmatch(r"[a-z_][a-z0-9_-]*", server["ssh_user"]):
                raise ValueError("Usuario SSH inválido")
            if not re.fullmatch(r"(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}", server["mac_address"]):
                raise ValueError("MAC inválida")
            if type(server["ssh_port"]) is not int or not 1 <= server["ssh_port"] <= 65535:
                raise ValueError("Puerto SSH inválido")

    def ssh(self, server, command):
        args = ["ssh", "-F", "/dev/null", "-T", "-i", self.key,
                "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes",
                "-o", "StrictHostKeyChecking=yes", "-o", "UpdateHostKeys=no",
                "-o", f"UserKnownHostsFile={self.known_hosts}",
                "-o", "GlobalKnownHostsFile=/dev/null", "-o", "ConnectTimeout=5",
                "-o", "ConnectionAttempts=1", "-o", "ServerAliveInterval=3",
                "-o", "ServerAliveCountMax=2", "-p", str(server["ssh_port"]),
                f'{server["ssh_user"]}@{server["lan_ip"]}', command]
        return subprocess.run(args, capture_output=True, text=True, timeout=15, check=False)

    def status(self, sid):
        s = self.servers[sid]
        try:
            with socket.create_connection((s["lan_ip"], s["ssh_port"]), timeout=1):
                return "reachable"
        except OSError:
            return "unreachable"

    def execute(self, sid, action):
        s = self.servers[sid]
        if s.get("actions_enabled") is not True:
            raise ValueError("Las acciones reales están deshabilitadas para este servidor.")
        if action == "on":
            mac = bytes.fromhex(s["mac_address"].replace(":", ""))
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as udp:
                udp.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                udp.sendto(b"\xff" * 6 + mac * 16, (s["broadcast_address"], 9))
            return "Paquete Wake-on-LAN enviado. El encendido todavía no está confirmado."
        if action not in COMMANDS:
            raise ValueError("Acción no permitida")
        result = self.ssh(s, COMMANDS[action])
        if result.returncode:
            raise RuntimeError("SSH no confirmó la orden. Comprueba el estado del equipo y los permisos; no se reintentó automáticamente.")
        return "Orden aceptada por SSH. Comprueba el cambio de disponibilidad; no confirma que haya terminado."

    def preflight(self):
        for sid, server in self.servers.items():
            result = self.ssh(server, "hostname")
            if result.returncode:
                raise RuntimeError(f"{sid}: falló SSH: {result.stderr.strip()[:400]}")
            for command in COMMANDS.values():
                result = self.ssh(server, command.replace("sudo -n ", "sudo -n -l "))
                if result.returncode:
                    raise RuntimeError(f"{sid}: falta permiso sudo: {result.stderr.strip()[:400]}")
            print(f"{sid}: SSH y permisos comprobados (sin apagar ni reiniciar).", flush=True)


if __name__ == "__main__":
    try:
        config = json.loads(Path(sys.argv[1] if len(sys.argv) > 1 else "config.example.json").read_text())
        Controller(config).preflight()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
