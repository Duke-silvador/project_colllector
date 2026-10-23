import csv
from pathlib import Path

from model.boiler import BoilerModel
from control import ThreeElementController
from safety.interlocks import SafetyInterlock

ROOT = Path(__file__).resolve().parent
RUNS = ROOT / "runs"
RUNS.mkdir(exist_ok=True)

DT = 0.1
DURATION_S = 30.0
LEVEL_SETPOINT_PCT = 50.0
FAULT_TIME_S = 10.0


def main():
    boiler = BoilerModel()
    controller = ThreeElementController(
        setpoint_pct=LEVEL_SETPOINT_PCT
    )
    safety = SafetyInterlock()
    rows = []

    for step_index in range(round(DURATION_S / DT)):
        state = boiler.state
        fault_active = state.time_s >= FAULT_TIME_S

        status = safety.evaluate(
            level_pct=state.drum_level_pct,
            pressure_pu=state.pressure_pu,
            sensors_valid=True,
            communication_ok=True,
        )

        command = controller.update(
            measured_level_pct=state.drum_level_pct,
            measured_steam_flow_pu=state.steam_flow_pu,
            measured_feedwater_flow_pu=state.feedwater_flow_pu,
            dt=DT,
        )

        fuel_command = 1.0

        if fault_active:
            status = safety.evaluate(
                level_pct=state.drum_level_pct,
                pressure_pu=state.pressure_pu,
                sensors_valid=False,
                communication_ok=True,
            )

        if status.trip_latched:
            fuel_command = status.fuel_command_pu

        boiler.step(
            feedwater_command_pu=command,
            steam_demand_pu=1.0,
            fuel_command_pu=fuel_command,
        )

        rows.append({
            "time_s": boiler.state.time_s,
            "drum_level_pct": boiler.state.drum_level_pct,
            "pressure_pu": boiler.state.pressure_pu,
            "feedwater_command_pu": command,
            "fuel_command_pu": fuel_command,
            "fault_active": fault_active,
            "trip_latched": status.trip_latched,
            "trip_causes": "|".join(status.trip_causes),
        })

    output = RUNS / "safety_integration_trace.csv"

    with output.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    fault_rows = [
        row for row in rows
        if row["fault_active"]
    ]

    assert fault_rows, "No fault-period samples were recorded."
    assert all(row["trip_latched"] for row in fault_rows), (
        "Safety trip did not remain latched during the fault."
    )
    assert all(row["fuel_command_pu"] == 0.0 for row in fault_rows), (
        "Fuel command was not driven to zero during the fault."
    )

    print("Safety integration checks passed.")
    print(f"Fault injected at: {FAULT_TIME_S:.1f} s")
    print(f"Fault-period samples: {len(fault_rows)}")
    print("Fuel command during fault: 0.0 pu")
    print(f"Trace: {output}")


if __name__ == "__main__":
    main()
