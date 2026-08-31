import pandas as pd
from config import VAT_CONFIG

def _vat_from_exclusive(amount, rate):
    return round(float(amount) * float(rate), VAT_CONFIG["rounding_decimals"])

def _vat_from_inclusive(amount, rate):
    if rate == 0:
        return 0.0
    return round(float(amount) * float(rate) / (1 + float(rate)), VAT_CONFIG["rounding_decimals"])

def calculate_vat_return(df):
    d = df.copy()
    d["vat_treatment"] = d["vat_treatment"].astype(str).str.upper()
    d["input_output"] = d["input_output"].astype(str).str.upper()
    d["amount_basis"] = d["amount_basis"].astype(str).str.upper()
    d["allowable_input"] = d["allowable_input"].astype(str).str.upper()
    d["taxable_amount"] = pd.to_numeric(d["taxable_amount"])
    d["vat_rate"] = pd.to_numeric(d["vat_rate"])

    d["calculated_vat"] = d.apply(
        lambda r: _vat_from_inclusive(r["taxable_amount"], r["vat_rate"])
        if r["amount_basis"] == "INCLUSIVE"
        else _vat_from_exclusive(r["taxable_amount"], r["vat_rate"]),
        axis=1
    )

    # Zero-rated and exempt supplies do not generate VAT.
    d.loc[d["vat_treatment"].isin(["ZERO_RATED", "EXEMPT"]), "calculated_vat"] = 0.0

    d["allowable_vat"] = 0.0
    input_mask = d["input_output"].eq("INPUT")
    allowable_mask = d["allowable_input"].eq("YES")
    d.loc[input_mask & allowable_mask, "allowable_vat"] = d.loc[input_mask & allowable_mask, "calculated_vat"]

    output_mask = d["input_output"].eq("OUTPUT")
    d["output_vat"] = 0.0
    d.loc[output_mask, "output_vat"] = d.loc[output_mask, "calculated_vat"]

    # Adjustment transactions use their calculated VAT as an adjustment.
    adjustment_mask = d["transaction_type"].astype(str).str.upper().eq("ADJUSTMENT") | d["adjustment_type"].fillna("").astype(str).ne("")
    d["adjustment_vat"] = 0.0
    d.loc[adjustment_mask, "adjustment_vat"] = d.loc[adjustment_mask, "calculated_vat"]

    # Credit/debit notes already carry their signed taxable amount.
    total_output_vat = round(d.loc[output_mask & ~adjustment_mask, "output_vat"].sum(), 2)
    net_adjustments = round(d["adjustment_vat"].sum(), 2)
    domestic_allowable = round(d.loc[input_mask & allowable_mask & (d["import_flag"].astype(str).str.upper() != "YES"), "allowable_vat"].sum(), 2)
    allowable_import = round(d.loc[input_mask & allowable_mask & (d["import_flag"].astype(str).str.upper() == "YES"), "allowable_vat"].sum(), 2)
    non_allowable = round(d.loc[input_mask & ~allowable_mask, "calculated_vat"].sum(), 2)

    total_allowable_input = round(domestic_allowable + allowable_import, 2)
    net_vat = round(total_output_vat + net_adjustments - total_allowable_input, 2)

    status = "VAT PAYABLE" if net_vat > 0 else ("VAT REFUNDABLE / CREDIT" if net_vat < 0 else "NO NET VAT PAYABLE")

    standard_supplies = round(d.loc[output_mask & d["vat_treatment"].eq("STANDARD"), "taxable_amount"].sum(), 2)
    zero_supplies = round(d.loc[output_mask & d["vat_treatment"].eq("ZERO_RATED"), "taxable_amount"].sum(), 2)
    exempt_supplies = round(d.loc[output_mask & d["vat_treatment"].eq("EXEMPT"), "taxable_amount"].sum(), 2)

    d["audit_reason"] = "Calculated from transaction VAT treatment and amount basis."
    d.loc[d["allowable_input"].ne("YES") & input_mask, "audit_reason"] = "Input VAT excluded/reviewed because allowable_input is not YES."
    d.loc[d["vat_treatment"].isin(["ZERO_RATED", "EXEMPT"]), "audit_reason"] = "VAT set to zero according to VAT treatment."
    audit_cols = [
        "transaction_id", "date", "description", "transaction_type",
        "taxable_amount", "amount_basis", "vat_treatment", "vat_rate",
        "input_output", "import_flag", "allowable_input",
        "calculated_vat", "allowable_vat", "output_vat", "adjustment_vat", "audit_reason"
    ]
    audit = d[audit_cols].copy()

    return {
        "total_output_vat": total_output_vat,
        "total_allowable_input_vat": total_allowable_input,
        "domestic_allowable_input_vat": domestic_allowable,
        "allowable_import_vat": allowable_import,
        "non_allowable_input_vat": non_allowable,
        "net_adjustments": net_adjustments,
        "net_vat": net_vat,
        "status": status,
        "standard_rated_supplies": standard_supplies,
        "zero_rated_supplies": zero_supplies,
        "exempt_supplies": exempt_supplies,
        "audit_trail": audit,
    }
