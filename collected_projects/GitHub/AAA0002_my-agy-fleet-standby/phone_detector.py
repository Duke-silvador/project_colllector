#!/usr/bin/env python3
"""
phone_detector.py
Automatic Phone Number Normalizer & Country Code Auto-Detector.
Supports Bangladesh local prefixes (01..., 1...), Pakistan (03...), India (98..., 91...),
as well as international numbers with or without leading '+'.
"""

try:
    import phonenumbers
    from phonenumbers import geocoder
    HAVE_PHONENUMBERS = True
except ImportError:
    phonenumbers = None
    geocoder = None
    HAVE_PHONENUMBERS = False


def get_country_flag(country_code_str: str) -> str:
    """Return flag emoji for 2-letter ISO country code, or globe if unknown."""
    if not country_code_str or len(country_code_str) != 2:
        return "🌐"
    try:
        return chr(127397 + ord(country_code_str[0].upper())) + chr(127397 + ord(country_code_str[1].upper()))
    except Exception:
        return "🌐"


def detect_and_normalize_phone(raw_input: str, default_region: str = "BD"):
    """
    Auto-detect country code and format raw phone input into standard E.164 (+...).

    Supports:
      - BD local: 01943805617, 1943805617, 8801943805617, +8801943805617
      - PK local: 03001234567, 923001234567, +923001234567
      - IN local: 9876543210, 919876543210, +919876543210
      - US / UK / International: 14155552671, +14155552671, 447123456789, etc.

    Returns:
      (formatted_e164_number, country_label) e.g. ('+8801943805617', '🇧🇩 Bangladesh')
    """
    digits = "".join(c for c in raw_input if c.isdigit())
    cleaned = "".join(c for c in raw_input if c.isdigit() or c == "+")
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
        digits = digits[2:]

    # Heuristics for common local formats without country codes
    # Bangladesh: 11 digits starting with 01, or 10 digits starting with 1[3-9]
    if len(digits) == 11 and digits.startswith("01"):
        cleaned = "+88" + digits
    elif len(digits) == 10 and digits.startswith("1") and digits[1] in "3456789":
        cleaned = "+880" + digits
    # Pakistan: 11 digits starting with 03
    elif len(digits) == 11 and digits.startswith("03"):
        cleaned = "+92" + digits[1:]
    # India: 10 digits starting with 6, 7, 8, 9
    elif len(digits) == 10 and digits[0] in "6789":
        cleaned = "+91" + digits
    elif not cleaned.startswith("+"):
        # If digits might already contain international code (e.g. 880..., 1..., 44...)
        if HAVE_PHONENUMBERS:
            try:
                p = phonenumbers.parse("+" + digits, None)
                if phonenumbers.is_valid_number(p):
                    cleaned = "+" + digits
            except Exception:
                pass

    # Parse with phonenumbers
    if HAVE_PHONENUMBERS:
        try:
            if cleaned.startswith("+"):
                parsed = phonenumbers.parse(cleaned, None)
            else:
                parsed = phonenumbers.parse(cleaned, default_region)

            if phonenumbers.is_valid_number(parsed):
                region = phonenumbers.region_code_for_number(parsed) or ""
                flag = get_country_flag(region)
                country = geocoder.country_name_for_number(parsed, "en") or "International"
                formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                return formatted, f"{flag} {country}"
        except Exception:
            pass

    if not cleaned.startswith("+"):
        cleaned = "+" + digits
    return cleaned, "🌐 International"


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        num, label = detect_and_normalize_phone(" ".join(sys.argv[1:]))
        print(f"Detected: {num} ({label})")
    else:
        print("Usage: python phone_detector.py <phone_number>")
