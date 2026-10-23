import csv
from pathlib import Path

from model.boiler import BoilerModel
from control.cascade_pressure import CascadePressureController

ROOT = Path(__file__).resolve().parent
RUNS = ROOT / "runs"
RUNS.mkdir(exist_ok=True)

DT = 0.1
DURATION_S = 120.0
DISTURBANCE_TIME_S = 10.0
INITIAL_DEMAND_PU = 1.0
DISTURBED_DEMAND_PU = 1.2
PRESSURE_SETPOINT_PU = 1.0


def run_case(use_controller):
    boiler = BoilerModel()
    controller = CascadePressureController(
        setpoint_pu=PRESSURE_SETPOINT_PU
    )
    rows = []

    for _ in range(round(DURATION_S / DT)):
        state = boiler.state
        demand = (
            DISTURBED_DEMAND_PU
            if state.time_s >= DISTURBANCE_TIME_S
            else INITIAL_DEMAND_PU
        )

        if use_controller:
            fuel_command = controller.update(
                measured_pressure_pu=state.pressure_pu,
                dt=DT,
            )
        else:
            fuel_command = 1.0

        boiler.step(
            feedwater_command_pu=1.0,
            steam_demand_pu=demand,
            fuel_command_pu=fuel_command,
        )

        state = boiler.state
        rows.append({
            "time_s": state.time_s,
            "pressure_setpoint_pu": PRESSURE_SETPOINT_PU,
            "pressure_pu": state.pressure_pu,
            "pressure_error_pu": PRESSURE_SETPOINT_PU - state.pressure_pu,
            "steam_demand_pu": demand,
            "fuel_command_pu": fuel_command,
            "fuel_flow_pu": state.fuel_flow_pu,
            "heat_duty_pu": state.heat_duty_pu,
        })

    return rows


def calculate_metrics(rows):
    disturbed = [
        row for row in rows
        if row["time_s"] >= DISTURBANCE_TIME_S
    ]
    errors = [abs(row["pressure_error_pu"]) for row in disturbed]

    return {
        "post_disturbance_iae_pu_s": sum(errors) * DT,
        "max_abs_pressure_error_pu": max(errors),
        "final_pressure_pu": rows[-1]["pressure_pu"],
        "final_pressure_error_pu": rows[-1]["pressure_error_pu"],
        "max_fuel_command_pu": max(
            row["fuel_command_pu"] for row in rows
        ),
        "min_fuel_command_pu": min(
            row["fuel_command_pu"] for row in rows
        ),
    }


def main():
    cases = {
        "fixed_fuel": run_case(use_controller=False),
        "pressure_control": run_case(use_controller=True),
    }

    for name, rows in cases.items():
        output = RUNS / f"pressure_control_{name}.csv"
        with output.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

        metrics = calculate_metrics(rows)
        print(f"\n{name}")
        for key, value in metrics.items():
            print(f"  {key}: {value:.6f}")
        print(f"  trace: {output}")

    baseline_iae = calculate_metrics(
        cases["fixed_fuel"]
    )["post_disturbance_iae_pu_s"]
    controlled_iae = calculate_metrics(
        cases["pressure_control"]
    )["post_disturbance_iae_pu_s"]

    print("\nComparison")
    print(f"  baseline IAE: {baseline_iae:.6f} pu*s")
    print(f"  controlled IAE: {controlled_iae:.6f} pu*s")

    if baseline_iae > 0:
        improvement = 100.0 * (baseline_iae - controlled_iae) / baseline_iae
        print(f"  IAE improvement: {improvement:.2f}%")

    if controlled_iae < baseline_iae:
        print("  Result: pressure controller reduced integrated absolute error.")
    else:
        print("  Result: pressure controller did not reduce integrated absolute error.")
        print("  Controller tuning or model response needs investigation.")


if __name__ == "__main__":
    main()
