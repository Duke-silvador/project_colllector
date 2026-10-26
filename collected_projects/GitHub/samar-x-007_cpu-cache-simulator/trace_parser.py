"""Parse simple memory-access traces for the simulator."""

from typing import List, Tuple


def parse_trace(text: str) -> List[Tuple[int, bool]]:
    operations = []
    for line_number, raw_line in enumerate(text.splitlines(), start=1):
        clean = raw_line.split("#", 1)[0].strip().replace(",", " ")
        if not clean:
            continue
        tokens = clean.split()
        if len(tokens) == 2 and tokens[0].lower() in ("operation", "op") and tokens[1].lower() == "address":
            continue
        if len(tokens) == 1:
            operation, address_text = "R", tokens[0]
        elif len(tokens) == 2:
            if tokens[0].upper() in ("R", "READ", "W", "WRITE"):
                operation, address_text = tokens[0].upper(), tokens[1]
            elif tokens[1].upper() in ("R", "READ", "W", "WRITE"):
                operation, address_text = tokens[1].upper(), tokens[0]
            else:
                raise ValueError(f"Line {line_number}: use an address, or R/W followed by an address.")
        else:
            raise ValueError(f"Line {line_number}: use an address, or R/W followed by an address.")
        try:
            address = int(address_text, 16) if address_text.lower().startswith("0x") else int(address_text, 10)
        except ValueError as exc:
            raise ValueError(f"Line {line_number}: '{address_text}' is not a valid decimal or hexadecimal address.") from exc
        if address < 0 or address > (1 << 64) - 1:
            raise ValueError(f"Line {line_number}: addresses must fit in an unsigned 64-bit value.")
        operations.append((address, operation in ("W", "WRITE")))
    if not operations:
        raise ValueError("Enter at least one memory access.")
    return operations
