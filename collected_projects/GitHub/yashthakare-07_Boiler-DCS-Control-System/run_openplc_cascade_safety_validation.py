"""Run a bounded, simulation-only cascade/safety integration test against OpenPLC.

Place this file in the BOILER DCS project root and run it with the project venv.
It requires model/boiler.py and pymodbus. It temporarily switches the simulated
PLC to automatic, steps steam demand from 1.0 to 1.2 pu at t=10 s, records a CSV,
and restores the previous mode and demand command in a finally block.
This is educational simulation logic, not a certified boiler/burner safety system.
"""

import argparse
import csv
import time
from datetime import datetime
from pathlib import Path

from pymodbus.client import ModbusTcpClient
from model.boiler import BoilerModel

ROOT = Path(__file__).resolve().parent
RUNS = ROOT / "runs"
HOST = "127.0.0.1"
PORT = 502
UNIT_ID = 1

# Zero-based Pymodbus holding-register addresses.
HR_HEARTBEAT = 1124
HR_LEVEL = 1125
HR_FEEDWATER_FLOW = 1126
HR_STEAM_FLOW = 1127
HR_LEVEL_SP = 1128
HR_MANUAL_VALVE = 1129
HR_FEEDWATER_VALVE = 1130
HR_AUTO_MODE = 1131
HR_STATUS = 1132
HR_PRESSURE = 1133
HR_FUEL_FLOW = 1134
HR_STEAM_DEMAND = 1135
HR_FUEL_VALVE = 1136
HR_AIR_DAMPER = 1137
HR_PRESSURE_SP = 1138
HR_TRIP_RESET = 1139


def checked(response, operation):
    if response.isError():
        raise RuntimeError(f"{operation} failed: {response}")
    return response


def clip(value, low, high):
    return max(low, min(high, value))


def scaled_int(value, scale, maximum=2000):
    return int(clip(round(float(value) * scale), 0, maximum))


def read_block(client):
    return checked(
        client.read_holding_registers(address=HR_HEARTBEAT, count=16, device_id=UNIT_ID),
        "Read holding registers 1124-1139",
    ).registers


def write_reg(client, address, value, label):
    checked(
        client.write_register(address=address, value=int(value), device_id=UNIT_ID),
        f"Write {label} at HR {address}",
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--duration", type=float, default=60.0)
    parser.add_argument("--disturbance-time", type=float, default=10.0)
    parser.add_argument("--steam-demand", type=float, default=1.2)
    args = parser.parse_args()

    if args.duration <= 0:
        parser.error("--duration must be positive")
    if args.disturbance_time < 0 or args.disturbance_time >= args.duration:
        parser.error("--disturbance-time must be >= 0 and less than --duration")
    if not 0.0 <= args.steam_demand <= 2.0:
        parser.error("--steam-demand must be between 0.0 and 2.0 pu")

    RUNS.mkdir(parents=True, exist_ok=True)
    trace_path = RUNS / f"cascade_safety_validation_{datetime.now():%Y%m%d_%H%M%S}.csv"
    boiler = BoilerModel()
    client = ModbusTcpClient(HOST, port=PORT, timeout=3)
    auto_was_enabled = False
    original_mode = None
    original_demand = None
    original_pressure_sp = None
    test_completed = False

    fields = [
        "time_s", "plc_heartbeat", "auto_mode", "status_word", "trip_latched",
        "level_pct", "level_setpoint_pct", "feedwater_flow_pu", "steam_flow_pu",
        "steam_demand_pu", "pressure_pu", "pressure_setpoint_pu", "fuel_flow_pu",
        "feedwater_valve_pct", "fuel_valve_pct", "air_damper_pct",
    ]

    try:
        if not client.connect():
            raise RuntimeError(f"Cannot connect to OpenPLC at {HOST}:{PORT}")

        initial = read_block(client)
        original_mode = initial[HR_AUTO_MODE - HR_HEARTBEAT]
        original_demand = initial[HR_STEAM_DEMAND - HR_HEARTBEAT]
        original_pressure_sp = initial[HR_PRESSURE_SP - HR_HEARTBEAT]
        initial_status = initial[HR_STATUS - HR_HEARTBEAT]
        level_raw = initial[HR_LEVEL - HR_HEARTBEAT]
        pressure_raw = initial[HR_PRESSURE - HR_HEARTBEAT]
        level_sp_raw = initial[HR_LEVEL_SP - HR_HEARTBEAT]

        if original_mode != 0:
            raise RuntimeError(
                f"Preflight refused: AUTO selector is {original_mode}, not manual. "
                "Restore manual mode and ensure no other runner is active."
            )
        if initial_status & 32:
            raise RuntimeError(
                f"Preflight refused: safety trip bit is set (status word {initial_status}). "
                "Do not auto-reset it; investigate the initiating condition first."
            )
        if initial_status & 2:
            raise RuntimeError(
                f"Preflight refused: invalid-input status bit is set (status word {initial_status}). "
                "Check the input registers before enabling AUTO."
            )
        if not 2000 < level_raw < 8000:
            raise RuntimeError(f"Preflight refused: drum level input is {level_raw/100:.2f}%")
        if not 500 < pressure_raw < 1500:
            raise RuntimeError(f"Preflight refused: pressure input is {pressure_raw/1000:.3f} pu")
        if not 2000 <= level_sp_raw <= 8000:
            raise RuntimeError(f"Preflight refused: level setpoint is {level_sp_raw/100:.2f}%")

        print("Preflight PASS: heartbeat/register block readable; no latched trip; inputs in operating range.")
        print(f"Initial status word: {initial_status}; current level: {level_raw/100:.2f}%; pressure: {pressure_raw/1000:.3f} pu")
        print(f"Test: AUTO for {args.duration:g}s; steam demand steps to {args.steam_demand:.2f} pu at {args.disturbance_time:g}s.")

        write_reg(client, HR_STEAM_DEMAND, 1000, "nominal steam-demand command")
        # Mark before attempting the write so finally restores mode even if the
        # server applied the write but the response was lost.
        auto_was_enabled = True
        write_reg(client, HR_AUTO_MODE, 1, "AUTO selector")

        # Reuse the bridge's process coupling, but keep mode restoration in this
        # script so an exception/Ctrl+C attempts to return to the prior mode.
        start = time.monotonic()
        next_cycle = start
        count = 0
        with trace_path.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()
            while True:
                values = read_block(client)
                elapsed = time.monotonic() - start
                demand_raw = 1000 if elapsed < args.disturbance_time else scaled_int(args.steam_demand, 1000)
                write_reg(client, HR_STEAM_DEMAND, demand_raw, "steam-demand command")
                demand_pu = demand_raw / 1000.0

                fw_valve_pct = values[HR_FEEDWATER_VALVE - HR_HEARTBEAT] / 10.0
                fuel_valve_pct = values[HR_FUEL_VALVE - HR_HEARTBEAT] / 10.0
                status_word = values[HR_STATUS - HR_HEARTBEAT]
                trip_latched = bool(status_word & 32)

                feedwater_command_pu = clip(fw_valve_pct / 50.0, 0.0, 1.5)
                fuel_command_pu = 0.0 if trip_latched else clip(fuel_valve_pct / 50.0, 0.0, 1.5)
                state = boiler.step(
                    feedwater_command_pu=feedwater_command_pu,
                    steam_demand_pu=demand_pu,
                    fuel_command_pu=fuel_command_pu,
                )

                writes = [
                    (HR_LEVEL, scaled_int(state.drum_level_pct, 100, maximum=10000), "drum-level measurement"),
                    (HR_FEEDWATER_FLOW, scaled_int(state.feedwater_flow_pu, 1000), "feedwater-flow measurement"),
                    (HR_STEAM_FLOW, scaled_int(state.steam_flow_pu, 1000), "steam-flow measurement"),
                    (HR_PRESSURE, scaled_int(state.pressure_pu, 1000), "pressure measurement"),
                    (HR_FUEL_FLOW, scaled_int(state.fuel_flow_pu, 1000), "fuel-flow measurement"),
                ]
                for address, value, label in writes:
                    write_reg(client, address, value, label)

                writer.writerow({
                    "time_s": round(state.time_s, 3),
                    "plc_heartbeat": values[0],
                    "auto_mode": values[HR_AUTO_MODE - HR_HEARTBEAT],
                    "status_word": status_word,
                    "trip_latched": int(trip_latched),
                    "level_pct": round(state.drum_level_pct, 3),
                    "level_setpoint_pct": values[HR_LEVEL_SP - HR_HEARTBEAT] / 100.0,
                    "feedwater_flow_pu": round(state.feedwater_flow_pu, 4),
                    "steam_flow_pu": round(state.steam_flow_pu, 4),
                    "steam_demand_pu": round(demand_pu, 4),
                    "pressure_pu": round(state.pressure_pu, 4),
                    "pressure_setpoint_pu": values[HR_PRESSURE_SP - HR_HEARTBEAT] / 1000.0,
                    "fuel_flow_pu": round(state.fuel_flow_pu, 4),
                    "feedwater_valve_pct": round(fw_valve_pct, 2),
                    "fuel_valve_pct": round(fuel_valve_pct, 2),
                    "air_damper_pct": values[HR_AIR_DAMPER - HR_HEARTBEAT] / 10.0,
                })
                file.flush()

                if count % max(1, round(1.0 / boiler.dt)) == 0:
                    print(
                        f"t={state.time_s:6.1f}s | level={state.drum_level_pct:6.2f}% | "
                        f"pressure={state.pressure_pu:.3f} pu | demand={demand_pu:.2f} pu | "
                        f"FW valve={fw_valve_pct:5.1f}% | fuel valve={fuel_valve_pct:5.1f}% | "
                        f"air={values[HR_AIR_DAMPER - HR_HEARTBEAT]/10.0:5.1f}% | "
                        f"status={status_word} trip={int(trip_latched)}"
                    )

                count += 1
                if state.time_s >= args.duration:
                    test_completed = True
                    break
                next_cycle += boiler.dt
                time.sleep(max(0.0, next_cycle - time.monotonic()))

        print(f"Cycles completed: {count}")

    except KeyboardInterrupt:
        print("\nTest interrupted by operator.")
    finally:
        # Never clear a latched trip here. Restore the previous selector and
        # command only; a trip must remain visible for inspection.
        try:
            if not client.connected:
                client.connect()
            if auto_was_enabled and original_mode is not None:
                write_reg(client, HR_AUTO_MODE, original_mode, "restore prior AUTO selector")
            if original_demand is not None:
                write_reg(client, HR_STEAM_DEMAND, original_demand, "restore prior steam-demand command")
            if original_pressure_sp is not None:
                write_reg(client, HR_PRESSURE_SP, original_pressure_sp, "restore prior pressure setpoint")
            time.sleep(0.5)
            final = read_block(client)
            print("\n--- Final PLC readback (after selector/command restoration) ---")
            labels = [
                "Heartbeat", "Drum level x100", "Feedwater flow x1000", "Steam flow x1000",
                "Level setpoint x100", "Manual valve x10", "Feedwater valve x10", "Auto selector",
                "Status word", "Pressure x1000", "Fuel flow x1000", "Steam demand x1000",
                "Fuel valve x10", "Air damper x10", "Pressure setpoint x1000", "Trip reset",
            ]
            for address, label, value in zip(range(1124, 1140), labels, final):
                print(f"HR {address} | {label:27s} | {value}")
            if final[HR_STATUS - HR_HEARTBEAT] & 32:
                print("WARNING: safety-trip bit is latched. Fuel/air outputs should remain closed; investigate before further tests.")
        except Exception as exc:
            print(f"WARNING: automatic-mode restoration/readback failed: {exc}")
            print("Check the PLC manually before proceeding; do not assume the selector was restored.")
        finally:
            client.close()

    print(f"Trace saved: {trace_path}")
    if not test_completed:
        print("Test did not complete normally; inspect trace and final register state before retrying.")


if __name__ == "__main__":
    main()
