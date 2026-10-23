"""Compare single-element and three-element boiler control."""

import csv
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from model.boiler import BoilerModel
from control import SingleElementController, ThreeElementController

ROOT = Path(__file__).resolve().parent
RUNS = ROOT / "runs"
PLOTS = RUNS / "plots"
RUNS.mkdir(exist_ok=True)
PLOTS.mkdir(exist_ok=True)

DURATION_S = 60.0
STEP_TIME_S = 10.0
SETPOINT = 50.0


def simulate(kind):
    boiler = BoilerModel()
    controller = (
        SingleElementController(setpoint_pct=SETPOINT)
        if kind == "single"
        else ThreeElementController(setpoint_pct=SETPOINT)
    )
    rows = []
    dt = boiler.dt

    for _ in range(round(DURATION_S / dt)):
        state = boiler.state
        demand = 1.0 if state.time_s < STEP_TIME_S else 1.2

        if kind == "single":
            command = controller.update(state.drum_level_pct, dt)
        else:
            command = controller.update(
                state.drum_level_pct,
                state.steam_flow_pu,
                state.feedwater_flow_pu,
                dt,
            )

        boiler.step(
            feedwater_command_pu=command,
            steam_demand_pu=demand,
            fuel_command_pu=1.0,
        )

        s = boiler.state
        rows.append({
            "time_s": s.time_s,
            "steam_demand_pu": demand,
            "level_setpoint_pct": SETPOINT,
            "drum_level_pct": s.drum_level_pct,
            "level_error_pct": SETPOINT - s.drum_level_pct,
            "inventory_pu": s.inventory_pu,
            "pressure_pu": s.pressure_pu,
            "steam_flow_pu": s.steam_flow_pu,
            "feedwater_flow_pu": s.feedwater_flow_pu,
            "feedwater_command_pu": command,
        })
    return rows


def save_csv(path, rows):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


def metrics(rows):
    dt = rows[1]["time_s"] - rows[0]["time_s"]
    post = [r for r in rows if r["time_s"] >= STEP_TIME_S]
    errors = [r["level_error_pct"] for r in post]

    settling = None
    for i, row in enumerate(post):
        if all(abs(r["level_error_pct"]) <= 1.0 for r in post[i:]):
            settling = row["time_s"] - STEP_TIME_S
            break

    return {
        "IAE_pct_s": sum(abs(r["level_error_pct"]) for r in rows) * dt,
        "maximum_absolute_level_error_pct": max(abs(e) for e in errors),
        "positive_level_overshoot_pct": max(0.0, max(-e for e in errors)),
        "final_level_pct": rows[-1]["drum_level_pct"],
        "final_level_error_pct": rows[-1]["level_error_pct"],
        "final_inventory_pu": rows[-1]["inventory_pu"],
        "final_pressure_pu": rows[-1]["pressure_pu"],
        "settling_time_after_step_s": settling,
    }


def plot_signal(single, three, column, ylabel, title, filename):
    plt.figure(figsize=(10, 5))
    for rows, label in ((single, "Single-element"),
                        (three, "Three-element")):
        plt.plot([r["time_s"] for r in rows],
                 [r[column] for r in rows], label=label)

    plt.axvline(STEP_TIME_S, linestyle="--", label="Demand step")
    if column == "drum_level_pct":
        plt.axhline(SETPOINT, linestyle=":", label="Level setpoint")
    plt.xlabel("Time (s)")
    plt.ylabel(ylabel)
    plt.title(title)
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS / filename, dpi=160)
    plt.close()


def main():
    print("Running single-element simulation...")
    single = simulate("single")
    print("Running three-element simulation...")
    three = simulate("three")

    save_csv(RUNS / "single_element.csv", single)
    save_csv(RUNS / "three_element.csv", three)

    results = {
        "single_element": metrics(single),
        "three_element": metrics(three),
    }

    with (RUNS / "controller_comparison.csv").open(
        "w", newline="", encoding="utf-8"
    ) as f:
        writer = csv.writer(f)
        writer.writerow(["metric", "single_element", "three_element"])
        for key in results["single_element"]:
            writer.writerow([
                key,
                results["single_element"][key],
                results["three_element"][key],
            ])

    plot_signal(single, three, "drum_level_pct", "Level (%)",
                "Drum-Level Control Comparison", "controller_level.png")
    plot_signal(single, three, "pressure_pu", "Pressure (pu)",
                "Pressure Comparison", "controller_pressure.png")
    plot_signal(single, three, "inventory_pu", "Inventory (pu)",
                "Inventory Comparison", "controller_inventory.png")
    plot_signal(single, three, "feedwater_flow_pu", "Flow (pu)",
                "Feedwater Flow Comparison", "controller_feedwater.png")
    plot_signal(single, three, "feedwater_command_pu", "Command (pu)",
                "Feedwater Command Comparison", "controller_command.png")

    print("\nCONTROLLER COMPARISON RESULTS")
    for name, values in results.items():
        print(f"\n{name}:")
        for key, value in values.items():
            print(f"  {key}: {value}")

    print("\nCSV files:", RUNS)
    print("Plots:", PLOTS)
    print("Comparison completed.")


if __name__ == "__main__":
    main()
