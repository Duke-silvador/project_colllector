from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient("127.0.0.1", port=502, timeout=3)

if not client.connect():
    raise SystemExit("FAIL: Could not connect to OpenPLC.")

try:
    result = client.read_holding_registers(
        address=1129,
        count=3,
        device_id=1,
    )

    if result.isError():
        raise RuntimeError(f"Modbus read failed: {result}")

    manual, output, auto = result.registers

    print(f"Manual command (HR 1129): {manual}")
    print(f"Valve output (HR 1130):   {output}")
    print(f"Auto selector (HR 1131):  {auto}")

    if manual == 500 and output == 500 and auto == 0:
        print("PASS: Restored safe test state confirmed.")
    else:
        print("CHECK REQUIRED: Values differ from the expected restored state.")

finally:
    client.close()
