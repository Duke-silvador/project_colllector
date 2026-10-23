import argparse
import csv
import os
import sys
import time
from pathlib import Path

from pymodbus.client import ModbusTcpClient
from model.boiler import BoilerModel

ROOT = Path(__file__).resolve().parent
TRACE = ROOT / "runs" / "openplc_bridge_trace.csv"
FIELDS = [
    "time_s", "plc_heartbeat", "level_pct", "feedwater_flow_pu",
    "steam_flow_pu", "valve_pct", "feedwater_command_pu",
    "level_setpoint_pct",
]

def acquire_mutex():
    if os.name != "nt":
        return None
    import ctypes
    from ctypes import wintypes
    k = ctypes.WinDLL("kernel32", use_last_error=True)
    k.CreateMutexW.argtypes = (wintypes.LPVOID, wintypes.BOOL, wintypes.LPCWSTR)
    k.CreateMutexW.restype = wintypes.HANDLE
    k.CloseHandle.argtypes = (wintypes.HANDLE,)
    k.CloseHandle.restype = wintypes.BOOL
    ctypes.set_last_error(0)
    handle = k.CreateMutexW(None, False, r"Local\BoilerDCS_OpenPLC_Bridge")
    err = ctypes.get_last_error()
    if not handle:
        raise OSError(err, "Cannot create bridge mutex")
    if err == 183:
        k.CloseHandle(handle)
        raise RuntimeError("Another bridge instance is already running.")
    return k, handle

def release_mutex(guard):
    if guard and os.name == "nt":
        guard[0].CloseHandle(guard[1])

def check(r, label):
    if r is None or r.isError():
        raise ConnectionError(f"{label} failed: {r}")
    return r

def connect(client):
    if not client.is_socket_open():
        if not client.connect():
            raise ConnectionError("Modbus TCP connection failed")
        print("Modbus connected.", flush=True)

def read_all(client):
    connect(client)
    return check(
        client.read_holding_registers(address=1124, count=16, device_id=1),
        "Holding-register read"
    ).registers

def write_reg(client, address, value):
    connect(client)
    check(
        client.write_register(address=address, value=value, device_id=1),
        f"Write HR{address}"
    )

def valid_inputs(v):
    return (
        3000 <= v[1] <= 7000 and
        0 <= v[2] <= 2000 and 0 <= v[3] <= 2000 and
        2000 <= v[4] <= 8000 and
        v[7] == 0 and
        800 <= v[9] <= 1200 and
        0 <= v[10] <= 2000 and
        0 <= v[11] <= 2000 and
        500 <= v[14] <= 1500
    )

def nominal(v):
    # Accept valid nominal manual operation without requiring exact
    # instantaneous process measurements.
    return (
        valid_inputs(v)
        and v[7] == 0
        and v[8] == 256
        and v[15] == 0
        and all(0 <= v[i] <= 1000 for i in (5, 6, 12, 13))
    )


def show(label, v):
    print(
        f"{label}: heartbeat={v[0]}, level={v[1]/100:.2f}%, "
        f"FWflow={v[2]/1000:.3f} pu, steamflow={v[3]/1000:.3f} pu, "
        f"FWvalve={v[6]/10:.1f}%, mode={v[7]}, status={v[8]}, "
        f"pressure={v[9]/1000:.3f} pu, fuelvalve={v[12]/10:.1f}%, "
        f"airdamper={v[13]/10:.1f}%",
        flush=True
    )

def ensure_nominal(client):
    v = read_all(client)
    show("PLC BEFORE", v)
    if nominal(v):
        print("PASS: PLC is already in nominal manual state.", flush=True)
        return

    cold_start = (v[1] == 0 and v[9] == 0 and v[8] == 118)
    safe_trip_only = (v[8] == 32 and valid_inputs(v))

    if cold_start:
        print("Recognized cold-start register state; initializing simulated inputs.", flush=True)
        for address, value in [
            (1125, 5000), (1126, 1000), (1127, 1000),
            (1128, 5000), (1129, 500), (1131, 0),
            (1133, 1000), (1134, 1000), (1135, 1000),
            (1138, 1000), (1139, 0),
        ]:
            write_reg(client, address, value)
        time.sleep(0.4)
        v = read_all(client)
        show("PLC INPUTS INITIALIZED", v)
        if not valid_inputs(v):
            raise RuntimeError("Initialized inputs failed validation; refusing trip reset.")
    elif safe_trip_only:
        print("Valid simulated inputs and trip-only status; checking reset conditions.", flush=True)
    else:
        raise RuntimeError(
            f"Unexpected PLC state: status={v[8]}, level={v[1]/100:.2f}%, "
            f"pressure={v[9]/1000:.3f} pu. No reset performed."
        )

    if v[8] & 32:
        write_reg(client, 1139, 1)
        time.sleep(0.15)
        write_reg(client, 1139, 0)
        time.sleep(0.45)

    v = read_all(client)
    show("PLC FINAL CHECK", v)
    if not nominal(v):
        raise RuntimeError("PLC did not reach expected nominal state; bridge loop not started.")
    print("PASS: nominal PLC state verified.", flush=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="192.168.1.18")
    parser.add_argument("--port", type=int, default=502)
    parser.add_argument("--retry-delay", type=float, default=2.0)
    args = parser.parse_args()

    if args.retry_delay < 0.25:
        parser.error("--retry-delay must be at least 0.25 seconds")

    guard = acquire_mutex()
    client = ModbusTcpClient(args.host, port=args.port, timeout=3, retries=1)
    try:
        # Startup verification: retry transient communication errors, but
        # stop on an unsafe or unexpected register state.
        while True:
            try:
                ensure_nominal(client)
                break
            except RuntimeError:
                raise
            except Exception as exc:
                print(f"Startup communication warning: {exc}; retrying.", file=sys.stderr, flush=True)
                client.close()
                time.sleep(args.retry_delay)

        boiler = BoilerModel()
        dt = float(getattr(boiler, "dt", 0.1))
        if dt <= 0:
            raise RuntimeError(f"Invalid BoilerModel timestep: {dt}")

        TRACE.parent.mkdir(parents=True, exist_ok=True)
        need_header = not TRACE.exists() or TRACE.stat().st_size == 0
        start = time.monotonic()
        next_cycle = start
        last_report = -1.0
        cycles = 0
        reconnects = 0

        print(
            f"BRIDGE RUNNING: {args.host}:{args.port}; continuous until Ctrl+C. "
            f"Trace: {TRACE}",
            flush=True
        )

        with TRACE.open("a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDS)
            if need_header:
                writer.writeheader()
                f.flush()

            while True:
                try:
                    connect(client)
                    r = check(
                        client.read_holding_registers(address=1124, count=7, device_id=1),
                        "PLC input read"
                    )
                    v = r.registers
                    heartbeat = v[0]
                    level_sp_pct = v[4] / 100.0
                    valve_pct = v[6] / 10.0

                    feedwater_cmd = max(0.0, min(1.5, valve_pct / 50.0))
                    state = boiler.step(
                        feedwater_command_pu=feedwater_cmd,
                        steam_demand_pu=1.0,
                        fuel_command_pu=1.0
                    )

                    # Match the established bridge interface: three sequential
                    # writes to the verified HR1125-HR1127 measurement registers.
                    for address, value in [
                        (1125, round(state.drum_level_pct * 100)),
                        (1126, round(state.feedwater_flow_pu * 1000)),
                        (1127, round(state.steam_flow_pu * 1000)),
                    ]:
                        write_reg(client, address, value)

                except KeyboardInterrupt:
                    print("\nCtrl+C: bridge stopped cleanly.", flush=True)
                    break
                except Exception as exc:
                    was_open = client.is_socket_open()
                    client.close()
                    if was_open:
                        reconnects += 1
                    print(
                        f"MODBUS WARNING: {type(exc).__name__}: {exc}; "
                        f"retrying in {args.retry_delay}s (reconnects={reconnects}).",
                        file=sys.stderr, flush=True
                    )
                    time.sleep(args.retry_delay)
                    next_cycle = time.monotonic()
                    continue

                elapsed = time.monotonic() - start
                writer.writerow({
                    "time_s": round(elapsed, 3),
                    "plc_heartbeat": heartbeat,
                    "level_pct": round(state.drum_level_pct, 3),
                    "feedwater_flow_pu": round(state.feedwater_flow_pu, 4),
                    "steam_flow_pu": round(state.steam_flow_pu, 4),
                    "valve_pct": round(valve_pct, 2),
                    "feedwater_command_pu": round(feedwater_cmd, 4),
                    "level_setpoint_pct": round(level_sp_pct, 2),
                })
                f.flush()
                cycles += 1

                if last_report < 0 or elapsed - last_report >= 1.0:
                    print(
                        f"t={elapsed:6.1f}s | heartbeat={heartbeat} | "
                        f"level={state.drum_level_pct:.2f}% | valve={valve_pct:.1f}% | "
                        f"FWflow={state.feedwater_flow_pu:.3f} pu | "
                        f"cycles={cycles} | reconnects={reconnects}",
                        flush=True
                    )
                    last_report = elapsed

                next_cycle += dt
                delay = next_cycle - time.monotonic()
                if delay > 0:
                    time.sleep(delay)
                elif abs(delay) > 5 * dt:
                    next_cycle = time.monotonic()

    finally:
        client.close()
        release_mutex(guard)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"BRIDGE STOPPED: {type(exc).__name__}: {exc}", file=sys.stderr, flush=True)
        raise SystemExit(2)
