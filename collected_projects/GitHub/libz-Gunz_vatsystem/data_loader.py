import io
import pandas as pd

REQUIRED_COLUMNS = [
    "transaction_id", "date", "description", "transaction_type",
    "taxable_amount", "amount_basis", "vat_treatment", "vat_rate",
    "input_output", "import_flag", "allowable_input", "adjustment_type"
]

def load_transactions(file):
    name = getattr(file, "name", "").lower()
    if name.endswith(".csv"):
        df = pd.read_csv(file)
    elif name.endswith(".xlsx"):
        df = pd.read_excel(file)
    else:
        raise ValueError("Only CSV and Excel (.xlsx) files are supported.")
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError("Missing required columns: " + ", ".join(missing))
    return df

def create_template():
    example = pd.DataFrame([
        ["S001", "2026-08-01", "Sale of goods", "SALE", 10000, "EXCLUSIVE", "STANDARD", 0.15, "OUTPUT", "NO", "NO", ""],
        ["S002", "2026-08-02", "Zero-rated sale", "SALE", 5000, "EXCLUSIVE", "ZERO_RATED", 0, "OUTPUT", "NO", "NO", ""],
        ["S003", "2026-08-03", "Exempt supply", "SALE", 3000, "EXCLUSIVE", "EXEMPT", 0, "OUTPUT", "NO", "NO", ""],
        ["P001", "2026-08-04", "Office supplies", "PURCHASE", 4000, "EXCLUSIVE", "STANDARD", 0.15, "INPUT", "NO", "YES", ""],
        ["I001", "2026-08-05", "Imported goods", "IMPORT_GOODS", 2000, "EXCLUSIVE", "STANDARD", 0.15, "INPUT", "YES", "YES", ""],
        ["C001", "2026-08-06", "Customer credit note", "CREDIT_NOTE", -1000, "EXCLUSIVE", "STANDARD", 0.15, "OUTPUT", "NO", "NO", "CREDIT_NOTE"],
        ["D001", "2026-08-07", "Customer debit note", "DEBIT_NOTE", 500, "EXCLUSIVE", "STANDARD", 0.15, "OUTPUT", "NO", "NO", "DEBIT_NOTE"],
        ["N001", "2026-08-08", "Non-allowable expense", "PURCHASE", 1000, "EXCLUSIVE", "STANDARD", 0.15, "INPUT", "NO", "NO", "NON_ALLOWABLE"],
    ], columns=REQUIRED_COLUMNS)
    return example.to_csv(index=False).encode("utf-8")
