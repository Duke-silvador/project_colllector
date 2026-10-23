
import argparse
import csv
import time
from pathlib import Path

from pymodbus.client import ModbusTcpClient
from model.boiler import BoilerModel

ROOT = Path(__file__).resolve().parent
LOG_PATH = ROOT / "runs" / "openplc_disturbance_trace.csv"

REG_HEARTBEAT = 1124
REG_LEVEL = 1125
REG_FEEDWATER_FLOW = 1126
REG_STEAM_FLOW = 1127
REG_LEVEL_SP = 1128
REG_FEEDWATER_VALVE = 1130
REG_AUTO_MODE = 1131


def checked(response, operation):
    if response.isError():
        raise RuntimeError(f"{operation} failed: {response}")
    return response


def main():
    parser = argparse.ArgumentParser(
        description="OpenPLC bridge with automatic PI control and a "
                    "simulated steam-demand disturbance."
    )
    parser.add_argument("--duration", type=float, default=30.0)
    parser.add_argument("--disturbance-time", type=float, default=5.0)
    parser.add_argument("--steam-demand", type=float, default=1.2)
    args = parser.parse_args()

    if args.duration <= 0:
        parser.error("--duration must be positive.")
    if not 0 < args.disturbance_time < args.duration:
        parser.error("--disturbance-time must be between 0 and duration.")
    if not 0 <= args.steam_demand <= 1.5:
        parser.error("--steam-demand must be between 0 and 1.5 pu.")

    boiler = BoilerModel()
    client = ModbusTcpClient("127.0.0.1", port=502, timeout=3)
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not client.connect():
        raise SystemExit("Cannot connect to OpenPLC at 127.0.0.1:502.")

    previous_auto_mode = None

    fields = [
        "time_s",
        "plc_heartbeat",
        "auto_mode",
        "steam_demand_pu",
        "level_pct",
        "feedwater_flow_pu",
        "steam_flow_pu",
        "valve_pct",
        "feedwater_command_pu",
        "level_setpoint_pct",
    ]

    start = time.monotonic()
    next_cycle = start
    count = 0

    try:
        # Save the original mode before enabling automatic control.
        response = checked(
            client.read_holding_registers(
                address=REG_AUTO_MODE,
                count=1,
                device_id=1,
            ),
            "Read original automatic mode",
        )
        previous_auto_mode = response.registers[0]

        checked(
            client.write_register(
                address=REG_AUTO_MODE,
                value=1,
                device_id=1,
            ),
            "Enable automatic mode",
        )

        print(f"Previous auto mode: {previous_auto_mode}")
        print("Automatic mode enabled for disturbance test.")

        # Confirm that the PLC accepted the mode command.
        response = checked(
            client.read_holding_registers(
                address=REG_AUTO_MODE,
                count=1,
                device_id=1,
            ),
            "Verify automatic mode",
        )
        if response.registers[0] != 1:
            raise RuntimeError(
                "PLC did not confirm automatic mode. "
                "Check the Modbus register mapping."
            )

        with LOG_PATH.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()

            while time.monotonic() - start < args.duration:
                response = checked(
                    client.read_holding_registers(
                        address=REG_HEARTBEAT,
                        count=7,
                        device_id=1,
                    ),
                    "PLC register read",
                )
                values = response.registers

                heartbeat = values[0]
                level_sp_pct = values[4] / 100.0
                valve_pct = values[6] / 10.0
                feedwater_command = max(
                    0.0, min(1.5, valve_pct / 50.0)
                )

                # Apply the steam-demand step at the specified simulation time.
                demand = (
                    1.0
                    if boiler.state.time_s < args.disturbance_time
                    else args.steam_demand
                )

                state = boiler.step(
                    feedwater_command_pu=feedwater_command,
                    steam_demand_pu=demand,
                    fuel_command_pu=1.0,
                )

                measurements = [
                    (REG_LEVEL, round(state.drum_level_pct * 100)),
                    (
                        REG_FEEDWATER_FLOW,
                        round(state.feedwater_flow_pu * 1000),
                    ),
                    (REG_STEAM_FLOW, round(state.steam_flow_pu * 1000)),
                ]

                for address, value in measurements:
                    checked(
                        client.write_register(
                            address=address,
                            value=value,
                            device_id=1,
                        ),
                        f"Write register {address}",
                    )

                writer.writerow({
                    "time_s": round(state.time_s, 3),
                    "plc_heartbeat": heartbeat,
                    "auto_mode": 1,
                    "steam_demand_pu": round(demand, 3),
                    "level_pct": round(state.drum_level_pct, 3),
                    "feedwater_flow_pu": round(
                        state.feedwater_flow_pu, 4
                    ),
                    "steam_flow_pu": round(state.steam_flow_pu, 4),
                    "valve_pct": round(valve_pct, 2),
                    "feedwater_command_pu": round(
                        feedwater_command, 4
                    ),
                    "level_setpoint_pct": round(level_sp_pct, 2),
                })
                file.flush()

                if count % 10 == 0:
                    print(
                        f"t={state.time_s:6.2f}s | "
                        f"demand={demand:.2f} pu | "
                        f"level={state.drum_level_pct:.2f}% | "
                        f"steam={state.steam_flow_pu:.3f} pu | "
                        f"valve={valve_pct:.1f}%"
                    )

                count += 1
                next_cycle += boiler.dt
                time.sleep(max(0.0, next_cycle - time.monotonic()))

    finally:
        try:
            # Restore the original mode even if the simulation fails.
            if previous_auto_mode is not None and client.connected:
                checked(
                    client.write_register(
                        address=REG_AUTO_MODE,
                        value=previous_auto_mode,
                        device_id=1,
                    ),
                    "Restore original automatic mode",
                )
                print(
                    f"\nRestored automatic mode: {previous_auto_mode}"
                )
        finally:
            client.close()

    print(f"Cycles completed: {count}")
    print(f"Trace saved to: {LOG_PATH}")


if __name__ == "__main__":
    main()
