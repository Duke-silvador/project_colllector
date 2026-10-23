from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient("127.0.0.1", port=502, timeout=3)

try:
    if not client.connect():
        print("FAIL: Could not connect to Modbus TCP server.")
    else:
        print("TCP connection successful.")

        response = client.read_holding_registers(address=0, count=1)

        if response.isError():
            print("Modbus request returned an error:", response)
        else:
            print("SUCCESS: Modbus read worked.")
            print("Holding register 0:", response.registers)
finally:
    client.close()
