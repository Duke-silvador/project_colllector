from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient("127.0.0.1", port=502, timeout=3)

if not client.connect():
    raise SystemExit("ERROR: Cannot connect to OpenPLC.")

try:
    for start, count in [(1024, 32), (1056, 32), (1088, 32), (1120, 32)]:
        result = client.read_holding_registers(
            address=start,
            count=count,
            device_id=1
        )

        print(f"\n--- Holding registers {start}-{start + count - 1} ---")

        if result.isError():
            print("Read error:", result)
            continue

        for offset, value in enumerate(result.registers):
            if value != 0:
                print(f"HR {start + offset}: {value}")

finally:
    client.close()
