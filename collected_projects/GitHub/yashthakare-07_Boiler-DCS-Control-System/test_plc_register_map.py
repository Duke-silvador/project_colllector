from pymodbus.client import ModbusTcpClient

HOST = "127.0.0.1"
PORT = 502
DEVICE_ID = 1

client = ModbusTcpClient(HOST, port=PORT, timeout=3)

if not client.connect():
    raise SystemExit("ERROR: Could not connect to OpenPLC Modbus TCP.")

try:
    # Read the expected PLC register window without writing anything.
    result = client.read_holding_registers(
        address=1124,
        count=8,
        device_id=DEVICE_ID
    )

    if result.isError():
        print("Modbus read failed:", result)
    else:
        print("Holding registers 1124-1131:")
        for address, value in enumerate(result.registers, start=1124):
            print(f"HR {address}: {value}")

finally:
    client.close()
