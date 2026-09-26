# loaddata.py
import pandas as pd
from pathlib import Path

DEFAULT_PATH = Path(__file__).parent / "data" / "nutrition_advice.xlsx"

def load_rules_from_excel(path: str | Path = None) -> pd.DataFrame:
    """
    Load nutrition rules from Excel and normalize the columns.
    Expected columns in Excel:
        Condition, BMI Range, Activity, Advice, Recommended Foods, Avoid Foods
    Adds BMI_Min and BMI_Max numeric columns for easier comparison.
    """
    p = Path(path) if path else DEFAULT_PATH
    if not p.exists():
        raise FileNotFoundError(f"Excel file not found: {p}")

    df = pd.read_excel(p)

    # Normalize column names
    df.columns = [c.strip() for c in df.columns]

    required_columns = {"Condition", "BMI Range", "Activity", "Advice", "Recommended Foods", "Avoid Foods"}
    missing = required_columns - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns in Excel: {missing}")

    # Clean text columns
    df["Condition"] = df["Condition"].astype(str).str.strip().str.lower()
    df["Activity"] = df["Activity"].astype(str).str.strip().str.lower()
    df["Advice"] = df["Advice"].astype(str).str.strip()
    df["Recommended Foods"] = df["Recommended Foods"].astype(str).str.strip()
    df["Avoid Foods"] = df["Avoid Foods"].astype(str).str.strip()

    # Parse BMI Range
    bmi_min, bmi_max = [], []
    for rng in df["BMI Range"]:
        rng = str(rng).strip()
        if rng.lower() == "any":
            bmi_min.append(float("-inf"))
            bmi_max.append(float("inf"))
        elif rng.startswith(">"):
            bmi_min.append(float(rng[1:]))
            bmi_max.append(float("inf"))
        elif rng.startswith("<"):
            bmi_min.append(float("-inf"))
            bmi_max.append(float(rng[1:]))
        elif "-" in rng:
            parts = rng.split("-")
            bmi_min.append(float(parts[0]))
            bmi_max.append(float(parts[1]))
        else:
            bmi_min.append(float(rng))
            bmi_max.append(float(rng))

    df["BMI_Min"] = bmi_min
    df["BMI_Max"] = bmi_max

    return df
