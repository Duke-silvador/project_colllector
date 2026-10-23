import csv
from pathlib import Path
from model.boiler import BoilerModel

ROOT = Path(__file__).resolve().parent
RUNS = ROOT / "runs"

def run_scenario(name, duration_s, demand_fn):
    b = BoilerModel()
    rows = []
    steps = round(duration_s / b.dt)
    for i in range(steps + 1):
        demand = demand_fn(i*b.dt)
        s = b.state
        rows.append({
            "time_s": round(s.time_s, 3), "drum_level_pct": s.drum_level_pct,
            "inventory_pu": s.inventory_pu, "pressure_pu": s.pressure_pu,
            "feedwater_flow_pu": s.feedwater_flow_pu, "steam_flow_pu": s.steam_flow_pu,
            "fuel_flow_pu": s.fuel_flow_pu, "heat_duty_pu": s.heat_duty_pu,
            "steam_demand_command_pu": demand, "indicated_swell_pct": s.indicated_swell_pct,
        })
        if i < steps:
            b.step(1.0, demand, 1.0)
    path = RUNS / f"{name}.csv"
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    return rows

def main():
    RUNS.mkdir(exist_ok=True)
    nominal = run_scenario("nominal", 60.0, lambda t: 1.0)
    disturbed = run_scenario("steam_demand_step", 60.0, lambda t: 1.2 if t >= 10.0 else 1.0)
    at15 = min(disturbed, key=lambda r: abs(r["time_s"]-15.0))
    end = disturbed[-1]
    summary = (
        "BOILER DIGITAL TWIN — BUILD 01 SUMMARY\n\n"
        f"Nominal final level: {nominal[-1]['drum_level_pct']:.3f} %\n"
        f"Nominal final pressure: {nominal[-1]['pressure_pu']:.4f} pu\n"
        f"Nominal final inventory: {nominal[-1]['inventory_pu']:.4f} pu\n\n"
        "Steam demand step: 1.0 -> 1.2 pu at t=10 s\n"
        f"Level at t=15 s: {at15['drum_level_pct']:.3f} %\n"
        f"Disturbed final level: {end['drum_level_pct']:.3f} %\n"
        f"Disturbed final pressure: {end['pressure_pu']:.4f} pu\n"
        f"Disturbed final inventory: {end['inventory_pu']:.4f} pu\n\n"
        "Synthetic educational model only; not for real equipment control.\n"
    )
    (RUNS / "summary.txt").write_text(summary, encoding="utf-8")
    print(summary)
    print(f"CSV files saved to {RUNS}")

if __name__ == "__main__":
    main()
