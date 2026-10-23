import csv
from pathlib import Path

from model.boiler import BoilerModel
from control import ThreeElementController
from control.cascade_pressure import CascadePressureController
from safety.interlocks import SafetyInterlock

ROOT = Path(__file__).resolve().parent
RUNS = ROOT / "runs"
RUNS.mkdir(exist_ok=True)

DT = 0.1
DURATION_S = 40.0
FAULT_TIME_S = 20.0


def main():
    boiler = BoilerModel()
    level_controller = ThreeElementController(setpoint_pct=50.0)
    pressure_controller = CascadePressureController(setpoint_pu=1.0)
    safety = SafetyInterlock()
    rows = []

    for _ in range(round(DURATION_S / DT)):
        state = boiler.state
        fault_active = state.time_s >= FAULT_TIME_S

        status = safety.evaluate(
            level_pct=state.drum_level_pct,
            pressure_pu=state.pressure_pu,
            sensors_valid=not fault_active,
            communication_ok=True,
        )

        feedwater_command = level_controller.update(
            measured_level_pct=state.drum_level_pct,
            measured_steam_flow_pu=state.steam_flow_pu,
            measured_feedwater_flow_pu=state.feedwater_flow_pu,
            dt=DT,
        )

        requested_fuel_command = pressure_controller.update(
            measured_pressure_pu=state.pressure_pu,
            dt=DT,
        )

        fuel_command = (
            0.0 if status.trip_latched else requested_fuel_command
        )

        boiler.step(
            feedwater_command_pu=feedwater_command,
            steam_demand_pu=1.0,
            fuel_command_pu=fuel_command,
        )

        state = boiler.state
        rows.append({
            "time_s": state.time_s,
            "drum_level_pct": state.drum_level_pct,
            "pressure_pu": state.pressure_pu,
            "feedwater_command_pu": feedwater_command,
            "requested_fuel_command_pu": requested_fuel_command,
            "fuel_command_pu": fuel_command,
            "fault_active": fault_active,
            "trip_latched": status.trip_latched,
            "trip_causes": "|".join(status.trip_causes),
        })

    output = RUNS / "cascade_safety_integration.csv"
    with output.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    fault_rows = [row for row in rows if row["fault_active"]]

    assert fault_rows, "No fault-period samples were recorded."
    assert all(row["trip_latched"] for row in fault_rows), (
        "Trip did not remain latched."
    )
    assert all(row["fuel_command_pu"] == 0.0 for row in fault_rows), (
        "Safety interlock failed to override fuel demand."
    )
    assert all(
        0.0 <= row["feedwater_command_pu"] <= 1.5 for row in rows
    ), "Feedwater command exceeded its limits."

    print("Cascade and safety integration checks passed.")
    print(f"Fault injected at: {FAULT_TIME_S:.1f} s")
    print(f"Fault-period samples: {len(fault_rows)}")
    print("Fuel command during trip: 0.0 pu")
    print("Feedwater command bounds: passed")
    print(f"Trace: {output}")


if __name__ == "__main__":
    main()
