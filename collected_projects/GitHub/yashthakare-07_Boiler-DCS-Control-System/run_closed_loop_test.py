import csv
import time
from pathlib import Path

from pymodbus.client import ModbusTcpClient
from model.boiler import BoilerModel

HOST = "127.0.0.1"
PORT = 502
DEVICE_ID = 1

HR_HEARTBEAT = 1124
HR_LEVEL = 1125
HR_FEEDWATER_FLOW = 1126
HR_STEAM_FLOW = 1127
HR_LEVEL_SP = 1128
HR_MANUAL_VALVE = 1129
HR_VALVE_OUTPUT = 1130
HR_AUTO_MODE = 1131

DURATION_S = 120.0
DISTURBANCE_TIME_S = 5.0
STEAM_DEMAND_AFTER_STEP = 1.2

ROOT = Path(__file__).resolve().parent
TRACE_PATH = ROOT / "runs" / "closed_loop_test_trace.csv"


def checked(response, operation):
    if response.isError():
        raise RuntimeError(f"{operation} failed: {response}")
    return response


def write_register(client, address, value):
    checked(
        client.write_register(
            address=address,
            value=int(value),
            device_id=DEVICE_ID,
        ),
        f"Write HR {address}",
    )


def read_registers(client, address, count, operation):
    return checked(
        client.read_holding_registers(
            address=address,
            count=count,
            device_id=DEVICE_ID,
        ),
        operation,
    ).registers


def main():
    boiler = BoilerModel()
    client = ModbusTcpClient(HOST, port=PORT, timeout=3)
    connected = client.connect()

    if not connected:
        client.close()
        raise SystemExit("FAIL: Cannot connect to OpenPLC at 127.0.0.1:502.")

    auto_enabled = False
    count = 0
    levels = []
    valves = []
    start = None

    fields = [
        "elapsed_wall_s",
        "simulation_time_s",
        "plc_heartbeat",
        "steam_demand_pu",
        "fuel_command_pu",
        "level_pct",
        "level_setpoint_pct",
        "level_error_pct",
        "inventory_pu",
        "indicated_swell_pct",
        "pressure_pu",
        "feedwater_flow_pu",
        "steam_flow_pu",
        "valve_pct",
        "feedwater_command_pu",
        "auto_mode",
    ]

    try:
        # Establish a known nominal state in manual mode.
        write_register(client, HR_AUTO_MODE, 0)
        write_register(client, HR_MANUAL_VALVE, 500)
        write_register(client, HR_LEVEL, 5000)
        write_register(client, HR_FEEDWATER_FLOW, 1000)
        write_register(client, HR_STEAM_FLOW, 1000)
        write_register(client, HR_LEVEL_SP, 5000)
        time.sleep(0.3)

        baseline = read_registers(
            client, HR_MANUAL_VALVE, 3, "Read manual baseline"
        )
        if baseline != [500, 500, 0]:
            raise RuntimeError(
                f"Unexpected baseline registers: {baseline}; "
                "expected [500, 500, 0]."
            )

        TRACE_PATH.parent.mkdir(parents=True, exist_ok=True)

        write_register(client, HR_AUTO_MODE, 1)
        auto_enabled = True

        start = time.monotonic()
        next_cycle = start

        print("Closed-loop diagnostic test started.")
        print(f"Duration: {DURATION_S:.0f} seconds.")
        print(
            f"Steam demand steps from 1.0 to "
            f"{STEAM_DEMAND_AFTER_STEP:.2f} pu at "
            f"{DISTURBANCE_TIME_S:.1f} simulation seconds."
        )
        print("Press Ctrl+C to stop; cleanup will restore manual mode.")

        with TRACE_PATH.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()
            file.flush()

            while True:
                cycle_start = time.monotonic()
                elapsed = cycle_start - start

                if elapsed >= DURATION_S:
                    break

                # Read PLC image: heartbeat, level, flows, setpoint,
                # manual command, output and auto selector.
                values = read_registers(
                    client, HR_HEARTBEAT, 8, "Read PLC registers"
                )

                heartbeat = values[0]
                plc_level_pct = values[1] / 100.0
                plc_feedwater_pu = values[2] / 1000.0
                plc_steam_pu = values[3] / 1000.0
                level_sp_pct = values[4] / 100.0
                valve_pct = values[6] / 10.0
                auto_mode = values[7]

                if auto_mode != 1:
                    raise RuntimeError(
                        f"Auto mode changed unexpectedly to {auto_mode}."
                    )

                # Convert valve output to a bounded model command.
                feedwater_command = max(
                    0.0, min(1.5, valve_pct / 50.0)
                )

                demand = (
                    1.0
                    if boiler.state.time_s < DISTURBANCE_TIME_S
                    else STEAM_DEMAND_AFTER_STEP
                )
                fuel_command = 1.0

                # Advance the simulated process by one model timestep.
                state = boiler.step(
                    feedwater_command_pu=feedwater_command,
                    steam_demand_pu=demand,
                    fuel_command_pu=fuel_command,
                )

                # Feed the simulated measurements back to the PLC.
                write_register(
                    client, HR_LEVEL, round(state.drum_level_pct * 100)
                )
                write_register(
                    client,
                    HR_FEEDWATER_FLOW,
                    round(state.feedwater_flow_pu * 1000),
                )
                write_register(
                    client,
                    HR_STEAM_FLOW,
                    round(state.steam_flow_pu * 1000),
                )

                # Error is based on the newly simulated indicated level.
                level_error_pct = level_sp_pct - state.drum_level_pct

                writer.writerow({
                    "elapsed_wall_s": round(elapsed, 3),
                    "simulation_time_s": round(state.time_s, 3),
                    "plc_heartbeat": heartbeat,
                    "steam_demand_pu": round(demand, 3),
                    "fuel_command_pu": round(fuel_command, 3),
                    "level_pct": round(state.drum_level_pct, 3),
                    "level_setpoint_pct": round(level_sp_pct, 2),
                    "level_error_pct": round(level_error_pct, 3),
                    "inventory_pu": round(state.inventory_pu, 5),
                    "indicated_swell_pct": round(
                        state.indicated_swell_pct, 4
                    ),
                    "pressure_pu": round(state.pressure_pu, 5),
                    "feedwater_flow_pu": round(
                        state.feedwater_flow_pu, 4
                    ),
                    "steam_flow_pu": round(state.steam_flow_pu, 4),
                    "valve_pct": round(valve_pct, 2),
                    "feedwater_command_pu": round(
                        feedwater_command, 4
                    ),
                    "auto_mode": auto_mode,
                })
                file.flush()

                levels.append(state.drum_level_pct)
                valves.append(valve_pct)

                if count % 10 == 0:
                    print(
                        f"wall={elapsed:6.2f}s | "
                        f"sim={state.time_s:6.2f}s | "
                        f"demand={demand:.2f} pu | "
                        f"level={state.drum_level_pct:.3f}% | "
                        f"inventory={state.inventory_pu:.4f} pu | "
                        f"swell={state.indicated_swell_pct:.3f}% | "
                        f"valve={valve_pct:.1f}%"
                    )

                count += 1
                next_cycle += boiler.dt
                time.sleep(max(0.0, next_cycle - time.monotonic()))

        print(f"\nCycles completed: {count}")
        print(f"Trace saved to: {TRACE_PATH}")

        if levels:
            peak_index = max(range(len(levels)), key=levels.__getitem__)
            min_index = min(range(len(levels)), key=levels.__getitem__)

            print("\nDRUM-LEVEL SUMMARY")
            print(f"Initial level: {levels[0]:.3f}%")
            print(
                f"Peak level:    {levels[peak_index]:.3f}% "
                f"(sample {peak_index})"
            )
            print(
                f"Minimum level: {levels[min_index]:.3f}% "
                f"(sample {min_index})"
            )
            print(f"Final level:   {levels[-1]:.3f}%")
            print(f"Final error:   {50.0 - levels[-1]:+.3f} percentage points")
            print(f"Valve range:   {min(valves):.1f}% to {max(valves):.1f}%")

    finally:
        # Attempt every restoration write, even if one write fails.
        if auto_enabled:
            try:
                write_register(client, HR_AUTO_MODE, 0)
            except Exception as exc:
                print(f"WARNING: Could not disable auto mode: {exc}")

        for address, value in [
            (HR_MANUAL_VALVE, 500),
            (HR_LEVEL, 5000),
            (HR_FEEDWATER_FLOW, 1000),
            (HR_STEAM_FLOW, 1000),
            (HR_LEVEL_SP, 5000),
        ]:
            try:
                write_register(client, address, value)
            except Exception as exc:
                print(f"WARNING: Could not restore HR {address}: {exc}")

        try:
            time.sleep(0.2)
            restored = read_registers(
                client, HR_MANUAL_VALVE, 3, "Verify restored state"
            )
            print("Restored manual, output, auto:", restored)
            if restored != [500, 500, 0]:
                print("WARNING: Restored registers differ from expected values.")
        except Exception as exc:
            print(f"WARNING: Could not verify restored state: {exc}")
        finally:
            client.close()


if __name__ == "__main__":
    main()
