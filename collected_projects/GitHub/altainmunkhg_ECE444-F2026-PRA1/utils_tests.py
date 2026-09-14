import utils

try:
    print(utils.reversed("one"))
except Exception as e:
    print(f"Error: {e}")

try: 
    print(utils.reversed(12.34))
except Exception as e:
    print(f"Error: {e}")

try: 
    print(utils.reversed(1234))
except Exception as e:
    print(f"Error: {e}")

try:
    print(utils.formatter("ten"))
except Exception as e:
    print(f"Error: {e}")

try:
    print(utils.formatter(1.1))
except Exception as e:
    print(f"Error: {e}")

try:
    print(utils.formatter(10))
except Exception as e:
    print(f"Error: {e}")
