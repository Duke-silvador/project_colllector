"""Compare saved routing output with independently authored acceptance expectations."""
import csv
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
with (root / "data/expected.csv").open(newline="", encoding="utf-8") as source:
    expected = list(csv.DictReader(source))
with (root / "results/actual.csv").open(newline="", encoding="utf-8") as source:
    actual = list(csv.DictReader(source))

failures = []
if len(expected) != len(actual):
    failures.append(f"Row count differs: expected {len(expected)}, actual {len(actual)}")
for want, got in zip(expected, actual):
    for key, value in want.items():
        if got.get(key) != value:
            failures.append(f"Case {want['case_id']}, {key}: expected {value}, actual {got.get(key)}")

lines = ["# Sample verification", "", "Synthetic data only; this measures agreement with the demo rules.", "",
         f"Rows compared: {min(len(expected), len(actual))}. Mismatches: {len(failures)}.", "",
         "| Case | Expected decision / sequence | Actual decision / sequence | Match |",
         "|---|---|---|---|"]
for want, got in zip(expected, actual):
    match = all(got.get(key) == value for key, value in want.items())
    lines.append(f"| {want['case_id']} | {want['decision']} / {want['sequence']} | {got['decision']} / {got['sequence']} | {'PASS' if match else 'FAIL'} |")
lines.extend(["", "Owner assignment is also checked against expected.csv. No CRM writes, messages or enrichment calls occur.", ""])
(root / "results/verification.md").write_text("\n".join(lines), encoding="utf-8")
print("\n".join(failures) if failures else f"PASS: {len(expected)}/{len(expected)} rows match expected decisions, sequences and owners.")
sys.exit(1 if failures else 0)
