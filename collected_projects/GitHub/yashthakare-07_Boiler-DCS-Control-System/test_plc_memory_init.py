import time
from pymodbus.client import ModbusTcpClient

HOST = "127.0.0.1"
PORT = 502
DEVICE_ID = 1

initial_values = {
    1125: 5000,  # Drum level: 50.00%
    1126: 1000,  # Feedwater flow: 1.000 pu
    1127: 1000,  # Steam flow: 1.000 pu
    1128: 5000,  # Level setpoint: 50.00%
    1129: 500,   # Manual valve: 50.0%
    1131: 0,     # Auto mode OFF
}

client = ModbusTcpClient(HOST, port=PORT, timeout=3)

if not client.connect():
    raise SystemExit("FAIL: Could not connect to OpenPLC on port 502.")

try:
    for address, value in initial_values.items():
        result = client.write_register(
            address=address,
            value=value,
            device_id=DEVICE_ID,
        )
        if result.isError():
            raise RuntimeError(
                f"Write failed at HR {address}: {result}"
            )
        print(f"Write accepted: HR {address} = {value}")

    time.sleep(0.5)

    result = client.read_holding_registers(
        address=1124,
        count=8,
        device_id=DEVICE_ID,
    )

    if result.isError():
        raise RuntimeError(f"Read failed: {result}")

    print("\nRead-back: holding registers 1124-1131")
    for address, value in enumerate(result.registers, start=1124):
        print(f"HR {address}: {value}")

finally:
    client.close()
