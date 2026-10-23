import time
from pymodbus.client import ModbusTcpClient

HOST = "127.0.0.1"
PORT = 502
REGISTER = 100
DEVICE_ID = 1

client = ModbusTcpClient(HOST, port=PORT, timeout=3)

try:
    if not client.connect():
        print("FAIL: Could not connect to OpenPLC Modbus TCP.")
    else:
        print("Connected to Modbus TCP.")
        for i in range(5):
            response = client.read_holding_registers(
                address=REGISTER,
                count=1,
                device_id=DEVICE_ID,
            )
            if response.isError():
                print(f"Read failed: {response}")
                break
            print(f"Read {i + 1}: MW100 = {response.registers[0]}")
            time.sleep(1)
finally:
    client.close()
