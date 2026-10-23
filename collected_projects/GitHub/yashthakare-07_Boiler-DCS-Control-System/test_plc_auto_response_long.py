import time
from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient("127.0.0.1", port=502, timeout=3)

if not client.connect():
    raise SystemExit("FAIL: Could not connect to OpenPLC.")

try:
    # Start from a known manual state.
    for address, value in [
        (1131, 0),     # Auto OFF
        (1125, 5000),  # Level 50%
        (1128, 5000),  # Setpoint 50%
        (1129, 500),   # Manual valve 50%
    ]:
        result = client.write_register(
            address=address, value=value, device_id=1
        )
        if result.isError():
            raise RuntimeError(f"Setup write failed at HR {address}: {result}")

    time.sleep(0.3)

    # Apply a 1-percentage-point low-level error.
    result = client.write_register(address=1125, value=4900, device_id=1)
    if result.isError():
        raise RuntimeError(f"Level write failed: {result}")

    time.sleep(0.1)

    result = client.write_register(address=1131, value=1, device_id=1)
    if result.isError():
        raise RuntimeError(f"Could not enable auto mode: {result}")

    print("Auto response test: level=49%, setpoint=50%, duration=3 s")
    outputs = []

    for i in range(13):
        time.sleep(0.25)
        result = client.read_holding_registers(
            address=1130, count=1, device_id=1
        )
        if result.isError():
            raise RuntimeError(f"Output read failed: {result}")

        output = result.registers[0]
        outputs.append(output)
        print(f"t={(i + 1) * 0.25:.2f} s | valve output={output / 10:.1f}%")

    print(f"Initial sampled output: {outputs[0] / 10:.1f}%")
    print(f"Final sampled output:   {outputs[-1] / 10:.1f}%")

    if outputs[-1] > outputs[0]:
        print("PASS: Output increased during sustained low-level error.")
    else:
        print("FAIL: No measurable increase; inspect scan timing and PLC logic.")

finally:
    # Always restore manual mode and nominal test values.
    try:
        client.write_register(address=1131, value=0, device_id=1)
        client.write_register(address=1125, value=5000, device_id=1)
        client.write_register(address=1128, value=5000, device_id=1)
        client.write_register(address=1129, value=500, device_id=1)
        time.sleep(0.2)

        result = client.read_holding_registers(
            address=1129, count=3, device_id=1
        )
        if not result.isError():
            print("Restored manual, output, auto:", result.registers)
    finally:
        client.close()
