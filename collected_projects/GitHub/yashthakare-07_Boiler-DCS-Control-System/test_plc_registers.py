import time
from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient("127.0.0.1", port=502)

if not client.connect():
    raise SystemExit("ERROR: Could not connect to Modbus TCP.")

try:
    for i in range(5):
        # %MW100 through %MW106 map to holding registers 1124–1130.
        result = client.read_holding_registers(
            address=1124,
            count=7,
            device_id=1
        )

        if result.isError():
            print("Modbus read error:", result)
        else:
            values = result.registers
            print(
                f"Sample {i + 1}: "
                f"Heartbeat={values[0]}, "
                f"DrumLevel={values[1]}, "
                f"FeedwaterFlow={values[2]}, "
                f"SteamFlow={values[3]}, "
                f"LevelSP={values[4]}, "
                f"ManualValve={values[5]}, "
                f"FeedwaterValve={values[6]}"
            )

        time.sleep(1)
finally:
    client.close()
