from pymodbus.client import ModbusTcpClient

HOST = "127.0.0.1"
PORT = 502
DEVICE_ID = 1

client = ModbusTcpClient(HOST, port=PORT, timeout=3)

try:
    if not client.connect():
        print("FAIL: Could not connect to Modbus TCP.")
        raise SystemExit(1)

    print("Connected. Performing READ-ONLY register scan.")

    for start, count in [(0, 125), (125, 25)]:
        response = client.read_holding_registers(
            address=start,
            count=count,
            device_id=DEVICE_ID
        )

        if response.isError():
            print(f"Read failed at address {start}: {response}")
            continue

        nonzero = [
            (start + offset, value)
            for offset, value in enumerate(response.registers)
            if value != 0
        ]

        print(f"\nHolding registers {start}-{start + count - 1}:")
        if nonzero:
            for address, value in nonzero:
                print(f"  Address {address}: {value}")
        else:
            print("  All registers in this range are zero.")

finally:
    client.close()
