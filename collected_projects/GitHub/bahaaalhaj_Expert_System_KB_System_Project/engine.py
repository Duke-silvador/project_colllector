# engine.py
from experta import *
from pathlib import Path
from load_data import load_rules_from_excel
import math

DEFAULT_EXCEL = Path(__file__).parent / "data" / "nutrition_advice.xlsx"

class NutritionExpert(KnowledgeEngine):
    def __init__(self, excel_path: str | Path = None):
        super().__init__()
        self.excel_path = Path(excel_path) if excel_path else DEFAULT_EXCEL
        self.rules_df = load_rules_from_excel(self.excel_path)
        self.advices = []  # list of advice strings
        self.trace = []    # explanation trace

    @DefFacts()
    def _initial(self):
        yield Fact(action="classify")

    def load_user(self, weight_kg: float, height_cm: float, problem: str, activity: str):
        """Load user facts. Height in cm."""
        height_m = height_cm / 100
        bmi = round(weight_kg / (height_m ** 2), 2)

        self.advices = []
        self.trace = []

        problem_norm = (problem or "").strip().lower()
        activity_norm = (activity or "").strip().lower()

        self.declare(Fact(weight=weight_kg))
        self.declare(Fact(height_cm=height_cm))
        self.declare(Fact(bmi=bmi))
        self.declare(Fact(problem=problem_norm))
        self.declare(Fact(activity=activity_norm))

        self.trace.append(f"User facts: weight={weight_kg}kg, height={height_cm}cm, bmi={bmi}, problem='{problem_norm}', activity='{activity_norm}'")

    @Rule(Fact(action="classify"),
          Fact(bmi=MATCH.bmi),
          Fact(problem=MATCH.problem),
          Fact(activity=MATCH.activity))
    def classify(self, bmi, problem, activity):
        matched = 0
        for idx, row in self.rules_df.iterrows():
            bmi_ok = row["BMI_Min"] <= bmi <= row["BMI_Max"]
            problem_ok = (row["Condition"] == "any") or (row["Condition"] == problem)
            activity_ok = (row["Activity"] == "any") or (row["Activity"] == activity)

            self.trace.append(f"Checking rule {idx}: bmi={row['BMI Range']} condition='{row['Condition']}' activity='{row['Activity']}' -> bmi={bmi_ok}, condition={problem_ok}, activity={activity_ok}")

            if bmi_ok and problem_ok and activity_ok:
                self.advices.append({
                    "advice": row["Advice"],
                    "recommended": row["Recommended Foods"],
                    "avoid": row["Avoid Foods"]
                })
                self.trace.append(f"--> Rule {idx} MATCHED. Advice: {row['Advice']}")
                matched += 1

        if matched == 0:
            fallback = {
                "advice": "Follow a balanced diet and regular exercise.",
                "recommended": "Vegetables, Fruits",
                "avoid": "Junk food"
            }
            self.advices.append(fallback)
            self.trace.append("No matching rule found. Added fallback advice.")

    def get_advices(self):
        return self.advices

    def get_trace(self):
        return self.trace
