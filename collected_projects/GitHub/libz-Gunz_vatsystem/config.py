VAT_CONFIG = {
    # Verify this against the current ZIMRA rate before actual use.
    "standard_rate": 0.15,
    "currency": "USD",
    "rounding_decimals": 2,
    "app_name": "Zimbabwe Automated VAT Return System",
}

VAT_TREATMENTS = ["STANDARD", "ZERO_RATED", "EXEMPT"]
TRANSACTION_TYPES = [
    "SALE", "PURCHASE", "IMPORT_GOODS", "IMPORT_SERVICES",
    "CREDIT_NOTE", "DEBIT_NOTE", "ADJUSTMENT"
]
INPUT_OUTPUT = ["INPUT", "OUTPUT"]
AMOUNT_BASIS = ["EXCLUSIVE", "INCLUSIVE"]
ALLOWABLE_VALUES = ["YES", "NO", "REVIEW"]
