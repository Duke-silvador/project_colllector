import time
from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient("127.0.0.1", port=502, timeout=3)

try:
    if not client.connect():
        print("FAIL: Cannot connect to Modbus TCP.")
        raise SystemExit(1)

    for attempt in range(3):
        response = client.read_holding_registers(
            address=1024,
            count=125,
            device_id=1
        )

        if response.isError():
            print(f"Modbus read failed: {response}")
        else:
            matches = [
                (1024 + i, value)
                for i, value in enumerate(response.registers)
                if value != 0
            ]

            print(f"\nAttempt {attempt + 1}: holding registers 1024-1148")
            if matches:
                for address, value in matches:
                    print(f"Address {address}: {value}")
            else:
                print("All registers in this block are zero.")

        time.sleep(1)

finally:
    client.close()
