import csv
import math
from pathlib import Path

from model.boiler import BoilerModel
from control import SingleElementController, ThreeElementController

ROOT = Path(__file__).resolve().parent
RUNS = ROOT / "runs"
DT = 0.1
DURATION_S = 120.0
SETPOINT_PCT = 50.0
LEVEL_BAND_PCT = 1.0

SCENARIOS = {
    "nominal": [],
    "load_increase_20pct": [(10.0, 1.2)],
    "load_decrease_20pct": [(10.0, 0.8)],
    "load_increase_40pct": [(10.0, 1.4)],
    "load_cycle": [(10.0, 1.2), (40.0, 0.8), (70.0, 1.1)],
}


def demand_at(time_s, changes):
    demand = 1.0
    for change_time, new_demand in changes:
        if time_s >= change_time:
            demand = new_demand
        else:
            break
    return demand


def run_scenario(controller_type, scenario_name, changes):
    boiler = BoilerModel()
    controller = controller_type(setpoint_pct=SETPOINT_PCT)
    rows = []
    total_steps = round(DURATION_S / DT)

    for step_index in range(total_steps):
        state = boiler.state
        demand = demand_at(state.time_s, changes)

        if controller_type is SingleElementController:
            command = controller.update(
                measured_level_pct=state.drum_level_pct,
                dt=DT,
            )
        else:
            command = controller.update(
                measured_level_pct=state.drum_level_pct,
                measured_steam_flow_pu=state.steam_flow_pu,
                measured_feedwater_flow_pu=state.feedwater_flow_pu,
                dt=DT,
            )

        boiler.step(
            feedwater_command_pu=command,
            steam_demand_pu=demand,
            fuel_command_pu=1.0,
        )

        s = boiler.state
        row = {
            "scenario": scenario_name,
            "controller": controller_type.__name__,
            "time_s": s.time_s,
            "steam_demand_pu": demand,
            "level_setpoint_pct": SETPOINT_PCT,
            "drum_level_pct": s.drum_level_pct,
            "level_error_pct": SETPOINT_PCT - s.drum_level_pct,
            "inventory_pu": s.inventory_pu,
            "pressure_pu": s.pressure_pu,
            "steam_flow_pu": s.steam_flow_pu,
            "feedwater_flow_pu": s.feedwater_flow_pu,
            "feedwater_command_pu": command,
        }

        for key, value in row.items():
            if isinstance(value, float) and not math.isfinite(value):
                raise ValueError(
                    f"Non-finite value in {scenario_name}, "
                    f"{controller_type.__name__}, {key}: {value}"
                )

        if not 0.0 <= command <= 1.5:
            raise AssertionError(f"Feedwater command out of bounds: {command}")

        rows.append(row)

    return rows


def calculate_metrics(rows):
    errors = [row["level_error_pct"] for row in rows]
    final_error = errors[-1]

    settling_time = None
    for index, row in enumerate(rows):
        if all(
            abs(later["level_error_pct"]) <= LEVEL_BAND_PCT
            for later in rows[index:]
        ):
            settling_time = row["time_s"]
            break

    return {
        "scenario": rows[0]["scenario"],
        "controller": rows[0]["controller"],
        "IAE_pct_s": sum(abs(error) for error in errors) * DT,
        "maximum_absolute_level_error_pct": max(abs(error) for error in errors),
        "final_level_pct": rows[-1]["drum_level_pct"],
        "final_level_error_pct": final_error,
        "minimum_level_pct": min(row["drum_level_pct"] for row in rows),
        "maximum_level_pct": max(row["drum_level_pct"] for row in rows),
        "minimum_feedwater_command_pu": min(
            row["feedwater_command_pu"] for row in rows
        ),
        "maximum_feedwater_command_pu": max(
            row["feedwater_command_pu"] for row in rows
        ),
        "settling_time_from_start_s": settling_time,
    }


def main():
    RUNS.mkdir(exist_ok=True)
    all_rows = []
    all_metrics = []

    controllers = [
        SingleElementController,
        ThreeElementController,
    ]

    for scenario_name, changes in SCENARIOS.items():
        print(f"\nScenario: {scenario_name}")

        for controller_type in controllers:
            rows = run_scenario(controller_type, scenario_name, changes)
            all_rows.extend(rows)
            metrics = calculate_metrics(rows)
            all_metrics.append(metrics)

            print(
                f"  {controller_type.__name__}: "
                f"IAE={metrics['IAE_pct_s']:.3f} %·s, "
                f"final error={metrics['final_level_error_pct']:.3f}%, "
                f"level range={metrics['minimum_level_pct']:.2f}–"
                f"{metrics['maximum_level_pct']:.2f}%"
            )

    trace_path = RUNS / "scenario_validation_traces.csv"
    metrics_path = RUNS / "scenario_validation_metrics.csv"

    with trace_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(all_rows[0].keys()))
        writer.writeheader()
        writer.writerows(all_rows)

    with metrics_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(all_metrics[0].keys()))
        writer.writeheader()
        writer.writerows(all_metrics)

    print("\nScenario validation completed.")
    print(f"Trace data: {trace_path}")
    print(f"Metrics:    {metrics_path}")
    print(f"Scenarios:  {len(SCENARIOS)}")
    print(f"Runs:       {len(all_metrics)}")


if __name__ == "__main__":
    main()
