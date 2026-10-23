import time
from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient("127.0.0.1", port=502, timeout=3)

# MW101-MW104: simulated process values and level setpoint
test_values = {
    1125: 5000,  # DrumLevel_x100 = 50.00%
    1126: 1000,  # FeedwaterFlow_x1000 = 1.000
    1127: 1000,  # SteamFlow_x1000 = 1.000
    1128: 5000,  # LevelSP_x100 = 50.00%
}

try:
    if not client.connect():
        raise RuntimeError("Cannot connect to OpenPLC Modbus TCP.")

    print("Connected to OpenPLC Modbus TCP.")

    for address, value in test_values.items():
        result = client.write_register(
            address=address,
            value=value,
            device_id=1
        )
        if result.isError():
            print(f"WRITE FAILED at {address}: {result}")
        else:
            print(f"Wrote {value} to holding register {address}")

    time.sleep(1)

    response = client.read_holding_registers(
        address=1125,
        count=4,
        device_id=1
    )

    if response.isError():
        print("READ FAILED:", response)
    else:
        print("Readback registers 1125-1128:", response.registers)

finally:
    client.close()
