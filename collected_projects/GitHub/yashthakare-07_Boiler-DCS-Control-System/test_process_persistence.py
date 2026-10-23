import time
from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient("127.0.0.1", port=502, timeout=3)

try:
    if not client.connect():
        raise RuntimeError("Cannot connect to OpenPLC Modbus TCP.")

    for attempt in range(5):
        response = client.read_holding_registers(
            address=1125,
            count=6,
            device_id=1
        )

        if response.isError():
            print("Read failed:", response)
            break

        print(f"Read {attempt + 1}: registers 1125-1130 = {response.registers}")
        time.sleep(1)

finally:
    client.close()
