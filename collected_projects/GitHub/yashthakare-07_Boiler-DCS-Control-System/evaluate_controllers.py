import csv
import math
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from model.boiler import BoilerModel
from control import SingleElementController, ThreeElementController

ROOT = Path(__file__).resolve().parent
RUNS = ROOT / "runs"
PLOTS = RUNS / "plots"

DURATION_S = 60.0
DISTURBANCE_TIME_S = 10.0
LEVEL_SETPOINT_PCT = 50.0
SETTLING_BAND_PCT = 1.0


def simulate(controller_type):
    boiler = BoilerModel()
    controller = controller_type(setpoint_pct=LEVEL_SETPOINT_PCT)
    dt = boiler.dt
    total_steps = round(DURATION_S / dt)
    disturbance_step = round(DISTURBANCE_TIME_S / dt)
    rows = []

    for step_index in range(total_steps):
        state = boiler.state
        demand = 1.0 if step_index < disturbance_step else 1.2

        if controller_type is SingleElementController:
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
            "level_setpoint_pct": LEVEL_SETPOINT_PCT,
            "drum_level_pct": s.drum_level_pct,
            "level_error_pct": LEVEL_SETPOINT_PCT - s.drum_level_pct,
            "inventory_pu": s.inventory_pu,
            "pressure_pu": s.pressure_pu,
            "steam_flow_pu": s.steam_flow_pu,
            "feedwater_flow_pu": s.feedwater_flow_pu,
            "feedwater_command_pu": command,
        })

    return rows, disturbance_step


def calculate_metrics(rows, disturbance_step, dt):
    post = rows[disturbance_step:]
    errors = [row["level_error_pct"] for row in post]

    settling_time = None
    for i, row in enumerate(post):
        if all(
            abs(later["level_error_pct"]) <= SETTLING_BAND_PCT
            for later in post[i:]
        ):
            settling_time = row["time_s"] - DISTURBANCE_TIME_S
            break

    result = {
        "post_disturbance_IAE_pct_s": sum(abs(e) for e in errors) * dt,
        "max_absolute_level_error_pct": max(abs(e) for e in errors),
        "final_level_pct": post[-1]["drum_level_pct"],
        "final_level_error_pct": post[-1]["level_error_pct"],
        "max_feedwater_command_pu": max(
            row["feedwater_command_pu"] for row in post
        ),
        "min_feedwater_command_pu": min(
            row["feedwater_command_pu"] for row in post
        ),
        "settling_time_after_disturbance_s": settling_time,
    }

    for key, value in result.items():
        if value is not None and not math.isfinite(value):
            raise ValueError(f"Non-finite metric {key}: {value}")

    return result


def write_trace(path, rows):
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def write_metrics(path, results):
    keys = list(next(iter(results.values())).keys())
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["metric", "single_element", "three_element"])
        for key in keys:
            writer.writerow([
                key,
                results["single_element"][key],
                results["three_element"][key],
            ])


def plot_comparison(single, three, column, ylabel, title, filename):
    plt.figure(figsize=(10, 5))

    for rows, label in (
        (single, "Single-element"),
        (three, "Three-element"),
    ):
        plt.plot(
            [row["time_s"] for row in rows],
            [row[column] for row in rows],
            label=label,
        )

    plt.axvline(
        DISTURBANCE_TIME_S,
        linestyle="--",
        label="Steam-demand step",
    )

    if column == "drum_level_pct":
        plt.axhline(
            LEVEL_SETPOINT_PCT,
            linestyle=":",
            label="Level setpoint",
        )

    plt.xlabel("Time (s)")
    plt.ylabel(ylabel)
    plt.title(title)
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS / filename, dpi=160)
    plt.close()


def main():
    RUNS.mkdir(exist_ok=True)
    PLOTS.mkdir(exist_ok=True)

    print("Evaluating single-element controller...")
    single, disturbance_step = simulate(SingleElementController)

    print("Evaluating three-element controller...")
    three, _ = simulate(ThreeElementController)

    dt = BoilerModel().dt
    results = {
        "single_element": calculate_metrics(single, disturbance_step, dt),
        "three_element": calculate_metrics(three, disturbance_step, dt),
    }

    write_trace(RUNS / "evaluation_single_element.csv", single)
    write_trace(RUNS / "evaluation_three_element.csv", three)
    write_metrics(RUNS / "evaluation_metrics.csv", results)

    plots = [
        ("drum_level_pct", "Level (%)", "Drum-Level Response",
         "evaluation_level.png"),
        ("pressure_pu", "Pressure (pu)", "Pressure Response",
         "evaluation_pressure.png"),
        ("inventory_pu", "Inventory (pu)", "Inventory Response",
         "evaluation_inventory.png"),
        ("feedwater_flow_pu", "Flow (pu)", "Feedwater Flow Response",
         "evaluation_feedwater_flow.png"),
        ("feedwater_command_pu", "Command (pu)", "Feedwater Command",
         "evaluation_feedwater_command.png"),
    ]

    for column, ylabel, title, filename in plots:
        plot_comparison(single, three, column, ylabel, title, filename)

    print("\nPOST-DISTURBANCE EVALUATION")
    for name, metrics in results.items():
        print(f"\n{name}:")
        for key, value in metrics.items():
            print(f"  {key}: {value}")

    print(f"\nTrace and metrics CSV files: {RUNS}")
    print(f"Plots: {PLOTS}")
    print("Evaluation completed successfully.")


if __name__ == "__main__":
    main()
