import time
from pymodbus.client import ModbusTcpClient

HOST = "127.0.0.1"
PORT = 502
DEVICE_ID = 1

client = ModbusTcpClient(HOST, port=PORT, timeout=3)

if not client.connect():
    raise SystemExit("FAIL: Could not connect to OpenPLC.")

try:
    # Establish a known starting state with automatic mode OFF.
    for address, value in [
        (1131, 0),     # Auto OFF
        (1125, 5000),  # Drum level 50.00%
        (1128, 5000),  # Setpoint 50.00%
        (1129, 500),   # Manual valve 50.0%
    ]:
        result = client.write_register(
            address=address, value=value, device_id=DEVICE_ID
        )
        if result.isError():
            raise RuntimeError(f"Setup write failed at HR {address}: {result}")

    time.sleep(0.3)

    # Apply a 1-percentage-point low-level error.
    result = client.write_register(
        address=1125, value=4900, device_id=DEVICE_ID
    )
    if result.isError():
        raise RuntimeError(f"Could not set test level: {result}")

    time.sleep(0.1)

    # Enable automatic mode for this short diagnostic only.
    result = client.write_register(
        address=1131, value=1, device_id=DEVICE_ID
    )
    if result.isError():
        raise RuntimeError(f"Could not enable automatic mode: {result}")

    print("Automatic PI test: level=49.00%, setpoint=50.00%")

    samples = []
    for i in range(5):
        time.sleep(0.1)
        result = client.read_holding_registers(
            address=1125, count=7, device_id=DEVICE_ID
        )
        if result.isError():
            raise RuntimeError(f"Read failed: {result}")

        regs = result.registers
        level, feedwater, steam, setpoint, manual, output, auto = regs
        samples.append(output)
        print(
            f"Sample {i+1}: level={level}, setpoint={setpoint}, "
            f"manual={manual}, output={output}, auto={auto}"
        )

    if all(value > 500 for value in samples):
        print("PASS: PI output increased above 50% for low drum level.")
    else:
        print("FAIL: PI output did not consistently rise above 50%.")

finally:
    # Disable automatic mode first, then restore the nominal test state.
    try:
        client.write_register(address=1131, value=0, device_id=DEVICE_ID)
        client.write_register(address=1125, value=5000, device_id=DEVICE_ID)
        client.write_register(address=1128, value=5000, device_id=DEVICE_ID)
        client.write_register(address=1129, value=500, device_id=DEVICE_ID)
        time.sleep(0.2)
        result = client.read_holding_registers(
            address=1129, count=3, device_id=DEVICE_ID
        )
        if not result.isError():
            print(
                "Restored state: manual={}, output={}, auto={}".format(
                    *result.registers
                )
            )
    finally:
        client.close()
