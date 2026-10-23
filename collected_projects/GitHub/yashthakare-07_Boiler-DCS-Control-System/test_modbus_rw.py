"""Verify Modbus TCP write/read communication with OpenPLC."""

from pymodbus.client import ModbusTcpClient

HOST = "127.0.0.1"
PORT = 502
DEVICE_ID = 1
REGISTER_ADDRESS = 0
TEST_VALUE = 1234


def main():
    client = ModbusTcpClient(HOST, port=PORT, timeout=3)

    try:
        if not client.connect():
            print("FAIL: Could not connect to OpenPLC.")
            return

        print("TCP connection successful.")

        write_response = client.write_register(
            address=REGISTER_ADDRESS,
            value=TEST_VALUE,
            device_id=DEVICE_ID,
        )

        if write_response.isError():
            print(f"FAIL: Write error: {write_response}")
            return

        print(f"Write accepted: {TEST_VALUE}")

        read_response = client.read_holding_registers(
            address=REGISTER_ADDRESS,
            count=1,
            device_id=DEVICE_ID,
        )

        if read_response.isError():
            print(f"FAIL: Read error: {read_response}")
            return

        actual_value = read_response.registers[0]
        print(f"Value read back: {actual_value}")

        if actual_value == TEST_VALUE:
            print("PASS: Modbus write/read round trip successful.")
        else:
            print(
                f"NOT VERIFIED: Expected {TEST_VALUE}, "
                f"received {actual_value}."
            )

    except Exception as exc:
        print(f"FAIL: {type(exc).__name__}: {exc}")

    finally:
        client.close()


if __name__ == "__main__":
    main()
