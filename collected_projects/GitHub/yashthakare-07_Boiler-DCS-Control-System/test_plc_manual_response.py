import time
from pymodbus.client import ModbusTcpClient

HOST = "127.0.0.1"
PORT = 502
DEVICE_ID = 1

client = ModbusTcpClient(HOST, port=PORT, timeout=3)

if not client.connect():
    raise SystemExit("FAIL: Could not connect to OpenPLC.")

try:
    # Ensure automatic mode is OFF and set manual valve to 60%.
    for address, value in [(1131, 0), (1129, 600)]:
        result = client.write_register(
            address=address, value=value, device_id=DEVICE_ID
        )
        if result.isError():
            raise RuntimeError(f"Write failed at HR {address}: {result}")

    print("Commanded manual valve = 60.0%; automatic mode = OFF")

    for sample in range(1, 6):
        time.sleep(0.2)
        result = client.read_holding_registers(
            address=1129, count=3, device_id=DEVICE_ID
        )
        if result.isError():
            raise RuntimeError(f"Read failed: {result}")

        manual_command, valve_output, auto_mode = result.registers
        print(
            f"Sample {sample}: manual={manual_command}, "
            f"output={valve_output}, auto={auto_mode}"
        )

        if auto_mode != 0:
            raise RuntimeError("Automatic mode is unexpectedly enabled.")

    if valve_output != 600:
        raise SystemExit(
            f"FAIL: Expected valve output 600, received {valve_output}."
        )

    print("PASS: PLC follows the 60.0% manual command.")

finally:
    # Restore the original 50% manual command; keep automatic mode OFF.
    try:
        client.write_register(address=1129, value=500, device_id=DEVICE_ID)
        client.write_register(address=1131, value=0, device_id=DEVICE_ID)
    finally:
        client.close()
