#!/usr/bin/env python3
"""
ARENA-CTL: Master Orchestrator for Information Security Cyber Range Arena 2026
Controls BTC Core (10.10.0.0/24), Distribution Routing, and 27 Team Environments.
"""

import os
import sys
import json
import random
import hmac
import hashlib
import subprocess
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
GENERATED_DIR = BASE_DIR / "generated"
TEMPLATES_DIR = BASE_DIR / "templates"
CORE_DIR = BASE_DIR / "core"

SECRET_KEY = os.environ.get("ARENA_SECRET_KEY", "CyberRange2026_SecretKey_TopSecret")

def ensure_dirs():
    GENERATED_DIR.mkdir(parents=True, exist_ok=True)

def generate_flag(team_id: int, target: str) -> str:
    """Generates a cryptographically signed flag for a specific team and target."""
    raw = f"team:{team_id}:{target}:{SECRET_KEY}".encode("utf-8")
    sig = hashlib.sha256(raw).hexdigest()[:12]
    return f"FLAG{{{target}_Team{team_id:02d}_{sig}}}"

def render_team_compose(team_id: int, mode: str = "exact") -> Path:
    """Renders the docker-compose file for a given team."""
    ensure_dirs()
    template_file = TEMPLATES_DIR / "team-compose.template.yml"
    with open(template_file, "r", encoding="utf-8") as f:
        content = f.read()

    tid_str = f"{team_id:02d}"
    
    # In exact mode, each team has exact IPs from spec
    if mode == "exact":
        vlan20 = "172.16.20"
        vlan201 = "172.16.201"
        vlan202 = "172.16.202"
        vlan203 = "172.16.203"
        vlan204 = "172.16.204"
    else:
        # Multi-team co-hosting on single bridge engine without namespaces
        vlan20 = f"172.{16 + team_id}.20"
        vlan201 = f"172.{16 + team_id}.201"
        vlan202 = f"172.{16 + team_id}.202"
        vlan203 = f"172.{16 + team_id}.203"
        vlan204 = f"172.{16 + team_id}.204"

    rendered = content.replace("{{ team_id }}", tid_str)
    rendered = rendered.replace("{{ vlan20_prefix }}", vlan20)
    rendered = rendered.replace("{{ vlan201_prefix }}", vlan201)
    rendered = rendered.replace("{{ vlan202_prefix }}", vlan202)
    rendered = rendered.replace("{{ vlan203_prefix }}", vlan203)
    rendered = rendered.replace("{{ vlan204_prefix }}", vlan204)

    out_file = GENERATED_DIR / f"docker-compose.team{tid_str}.yml"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(rendered)

    print(f"[+] Generated team {tid_str} compose: {out_file.name}")
    return out_file

def cmd_generate_flags(args):
    """Generates all challenge flags for all 27 teams."""
    ensure_dirs()
    targets = [
        ("esxi", "ESXi_vCenter_Root", 1000, "ESXi/vCenter Management"),
        ("k8s", "K3s_ArgoCD_ClusterAdmin", 500, "Server K8s"),
        ("jenkins", "Jenkins_SupplyChain", 500, "Server - Supply Chain"),
        ("dc01", "DC0153_DomainAdmin", 500, "Server - Active Directory"),
        ("web_aio", "WebAIO_CustomerPortal", 500, "Server - Web Customer"),
        ("vpn", "VPN_Appliance", 300, "Appliance - VPN"),
        ("pfsense", "pfSense_Appliance", 300, "Appliance - Router"),
        ("edge_proxy", "EDGE_Proxy_Appliance", 300, "Appliance - Reverse Proxy"),
        ("ws01", "WS01_LocalAdmin", 100, "Workstation - WS01"),
        ("ws02", "WS02_FinanceUser", 100, "Workstation - WS02")
    ]

    master_flags = {}
    for tid in range(1, 28):
        tkey = f"team{tid:02d}"
        master_flags[tkey] = {
            "team_id": tid,
            "wan_ip": f"10.10.1{tid:02d}.2",
            "flags": {}
        }
        for code, label, pts, desc in targets:
            flag = generate_flag(tid, label)
            master_flags[tkey]["flags"][code] = {
                "flag": flag,
                "points": pts,
                "description": desc
            }

    flags_file = GENERATED_DIR / "master_flags.json"
    with open(flags_file, "w", encoding="utf-8") as f:
        json.dump(master_flags, f, indent=2)

    print(f"[+] Generated flags for 27 teams (270 total flags) -> {flags_file.name}")

def cmd_spawn_teams(args):
    """Spawns configuration files for N teams."""
    count = args.count
    mode = args.mode
    print(f"[*] Generating environments for {count} teams in '{mode}' mode...")
    for tid in range(1, count + 1):
        render_team_compose(tid, mode=mode)
    print(f"[+] Successfully generated configs for {count} teams in ./generated/")

def cmd_up_core(args):
    """Starts the BTC Core infrastructure (CTFd, SIEM, SLA Checker)."""
    core_compose = BASE_DIR / "docker-compose.core.yml"
    print("[*] Starting BTC Core Infrastructure (10.10.0.0/24)...")
    cmd = ["docker", "compose", "-f", str(core_compose), "up", "-d"]
    subprocess.run(cmd, check=True)
    print("\n[+] BTC Core online!")
    print("    - CTFd Scoreboard:    http://localhost:8000")
    print("    - SIEM Dashboard:     http://localhost:5601")
    print("    - SLA Live Matrix:    http://localhost:8081")

def cmd_up_team(args):
    """Starts a specific team environment."""
    tid = args.id
    tid_str = f"{tid:02d}"
    compose_path = GENERATED_DIR / f"docker-compose.team{tid_str}.yml"
    if not compose_path.exists():
        compose_path = render_team_compose(tid)

    print(f"[*] Starting Team {tid_str} environment...")
    cmd = ["docker", "compose", "-f", str(compose_path), "up", "-d"]
    subprocess.run(cmd, check=True)
    print(f"[+] Team {tid_str} is UP!")

def cmd_down_all(args):
    """Stops all running containers and cleans up."""
    print("[*] Stopping all Cyber Range components...")
    # Stop all generated team composes
    for compose_file in GENERATED_DIR.glob("docker-compose.team*.yml"):
        print(f"[*] Stopping {compose_file.name}...")
        subprocess.run(["docker", "compose", "-f", str(compose_file), "down"], check=False)

    # Stop core
    core_compose = BASE_DIR / "docker-compose.core.yml"
    if core_compose.exists():
        print("[*] Stopping BTC Core...")
        subprocess.run(["docker", "compose", "-f", str(core_compose), "down"], check=False)
    print("[+] Arena environment stopped.")

def cmd_sla_status(args):
    """Queries and prints the SLA checker status."""
    import urllib.request
    try:
        url = "http://localhost:8081/api/state"
        req = urllib.request.urlopen(url, timeout=3)
        data = json.loads(req.read().decode("utf-8"))
        print(f"\n=== CYBER RANGE SLA ENGINE (Round #{data['round']}) ===")
        print(f"Teams monitored: {len(data['teams'])}")
        for tkey, t in list(data["teams"].items())[:args.limit]:
            print(f"\n[{t['name']}] Total: {t['score_total']} pts | SLA: {t['score_sla']} | Pwn: {t['score_pwn']}")
            for sname, s in t["services"].items():
                st = "UP" if s["status"] == "UP" else f"DOWN (ports: {s['failed_ports']})"
                print(f"   - {sname:<14}: {st}")
    except Exception as e:
        print(f"[-] Could not query SLA engine at http://localhost:8081: {e}")
        print("    Make sure BTC Core is running (`python arena-ctl.py up-core`).")

def cmd_simulate_attack(args):
    """Simulates an attack, flag submission, and tests stealth rule."""
    import urllib.request
    import urllib.parse
    att = args.attacker
    vic = args.victim
    tgt = args.target

    print(f"[*] Simulating Attack: Team {att:02d} pwning {tgt} on Team {vic:02d}...")
    try:
        url = f"http://localhost:8081/api/pwn?attacker_id={att}&victim_id={vic}&target_category={urllib.parse.quote(tgt)}"
        req = urllib.request.Request(url, method="POST")
        resp = urllib.request.urlopen(req, timeout=3)
        res_data = json.loads(resp.read().decode("utf-8"))
        print("[+] Result from Scoring Engine:")
        print(f"    - Points awarded: +{res_data.get('points_awarded')} pts")
        print(f"    - Stealth rule applied: {res_data.get('stealth_rule_applied')}")
        print(f"    - Message: {res_data.get('message')}")
    except Exception as e:
        print(f"[-] Error contacting scoring engine: {e}")

def main():
    parser = argparse.ArgumentParser(description="Arena Cyber Range CLI Master Controller")
    subparsers = parser.add_subparsers(dest="subcommand", required=True)

    # spawn-teams
    p_spawn = subparsers.add_parser("spawn-teams", help="Generate Docker Compose files for teams")
    p_spawn.add_argument("--count", type=int, default=27, help="Number of teams (1-27)")
    p_spawn.add_argument("--mode", choices=["exact", "multi"], default="exact", help="IP allocation mode")
    p_spawn.set_defaults(func=cmd_spawn_teams)

    # generate-flags
    p_flags = subparsers.add_parser("generate-flags", help="Generate signed flags for all teams")
    p_flags.set_defaults(func=cmd_generate_flags)

    # up-core
    p_up_core = subparsers.add_parser("up-core", help="Start BTC Core (CTFd, SIEM, SLA Checker)")
    p_up_core.set_defaults(func=cmd_up_core)

    # up-team
    p_up_team = subparsers.add_parser("up-team", help="Start a specific team stack")
    p_up_team.add_argument("--id", type=int, required=True, help="Team ID (1-27)")
    p_up_team.set_defaults(func=cmd_up_team)

    # down-all
    p_down = subparsers.add_parser("down-all", help="Stop all arena containers")
    p_down.set_defaults(func=cmd_down_all)

    # sla-status
    p_sla = subparsers.add_parser("sla-status", help="Print live SLA status table")
    p_sla.add_argument("--limit", type=int, default=5, help="Number of teams to show in terminal")
    p_sla.set_defaults(func=cmd_sla_status)

    # simulate-attack
    p_atk = subparsers.add_parser("simulate-attack", help="Simulate an attack and test stealth rule")
    p_atk.add_argument("--attacker", type=int, default=1, help="Attacker team ID")
    p_atk.add_argument("--victim", type=int, default=2, help="Victim team ID")
    p_atk.add_argument("--target", default="Management", help="Target category (Management, Supply Chain, DC-0153, etc.)")
    p_atk.set_defaults(func=cmd_simulate_attack)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()

