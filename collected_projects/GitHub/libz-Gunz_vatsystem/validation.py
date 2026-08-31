import pandas as pd
from config import VAT_TREATMENTS, INPUT_OUTPUT, AMOUNT_BASIS, ALLOWABLE_VALUES

def validate_transactions(df):
    errors = []
    warnings = []
    required = [
        "transaction_id", "date", "description", "transaction_type",
        "taxable_amount", "amount_basis", "vat_treatment", "vat_rate",
        "input_output", "import_flag", "allowable_input", "adjustment_type"
    ]
    for col in required:
        if col not in df.columns:
            errors.append(f"Missing column: {col}")
    if errors:
        return {"errors": errors, "warnings": warnings, "error_count": len(errors), "warning_count": 0}

    if df["transaction_id"].isna().any():
        errors.append("One or more transaction IDs are missing.")
    if df["transaction_id"].duplicated().any():
        errors.append("Duplicate transaction IDs detected.")
    if pd.to_numeric(df["taxable_amount"], errors="coerce").isna().any():
        errors.append("One or more taxable amounts are not numeric.")
    if pd.to_numeric(df["vat_rate"], errors="coerce").isna().any():
        errors.append("One or more VAT rates are not numeric.")
    if (~df["vat_treatment"].astype(str).str.upper().isin(VAT_TREATMENTS)).any():
        errors.append("Unsupported VAT treatment found.")
    if (~df["input_output"].astype(str).str.upper().isin(INPUT_OUTPUT)).any():
        errors.append("Input/output must be INPUT or OUTPUT.")
    if (~df["amount_basis"].astype(str).str.upper().isin(AMOUNT_BASIS)).any():
        errors.append("Amount basis must be EXCLUSIVE or INCLUSIVE.")
    if (~df["allowable_input"].astype(str).str.upper().isin(ALLOWABLE_VALUES)).any():
        errors.append("allowable_input must be YES, NO or REVIEW.")
    if (pd.to_numeric(df["vat_rate"], errors="coerce") < 0).any():
        errors.append("VAT rates cannot be negative.")
    if df["date"].isna().any():
        warnings.append("Some dates are blank.")
    return {
        "errors": errors,
        "warnings": warnings,
        "error_count": len(errors),
        "warning_count": len(warnings),
    }
