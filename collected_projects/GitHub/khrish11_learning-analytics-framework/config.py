"""
config.py
---------
Single source of truth for every path, constant, and tunable parameter
used across the learning_analytics pipeline. Nothing in the scripts/
modules hardcodes a filename or a magic threshold -- everything is
imported from here, so re-pointing the pipeline at a new semester's data
only requires editing this file (or, more commonly, nothing at all,
since files are matched by name inside input/).
"""

from __future__ import annotations

from pathlib import Path

# ---------------------------------------------------------------------------
# Project paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent
INPUT_DIR = PROJECT_ROOT / "input"
OUTPUT_DIR = PROJECT_ROOT / "output"
FIGURES_DIR = PROJECT_ROOT / "figures"
MODELS_DIR = PROJECT_ROOT / "models"
REPORTS_DIR = PROJECT_ROOT / "reports"
LOG_DIR = PROJECT_ROOT / "logs"

for _d in (INPUT_DIR, OUTPUT_DIR, FIGURES_DIR, MODELS_DIR, REPORTS_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Input dataset filenames (produced by the upstream DatasetBuilder project)
# ---------------------------------------------------------------------------
STUDENTS_FILE = INPUT_DIR / "Students.xlsx"
ASSESSMENTS_FILE = INPUT_DIR / "Assessments.xlsx"
QUESTION_METADATA_FILE = INPUT_DIR / "Question_Metadata.xlsx"
MASTER_DATASET_FILE = INPUT_DIR / "Master_Dataset.xlsx"

# ---------------------------------------------------------------------------
# Output dataset filenames
# ---------------------------------------------------------------------------
FEATURE_DATASET_FILE = OUTPUT_DIR / "Feature_Dataset.xlsx"
PREPROCESSED_TRAIN_FILE = OUTPUT_DIR / "train_set.xlsx"
PREPROCESSED_VAL_FILE = OUTPUT_DIR / "validation_set.xlsx"
PREPROCESSED_TEST_FILE = OUTPUT_DIR / "test_set.xlsx"

# ---------------------------------------------------------------------------
# Report filenames
# ---------------------------------------------------------------------------
VALIDATION_REPORT = REPORTS_DIR / "Validation_Report.md"
EDA_REPORT = REPORTS_DIR / "EDA_Report.md"
STATISTICAL_REPORT = REPORTS_DIR / "Statistical_Report.md"
FEATURE_ENGINEERING_REPORT = REPORTS_DIR / "Feature_Engineering_Report.md"
MODEL_REPORT = REPORTS_DIR / "Model_Report.md"

# ---------------------------------------------------------------------------
# Identity / non-feature columns present in Master_Dataset.xlsx
# ---------------------------------------------------------------------------
IDENTITY_COLUMNS = ["Student_ID", "USN", "Student_Name", "Branch", "Semester", "Section"]
PLACEHOLDER_COLUMNS = ["Attendance", "CO_Attainment"]

# ---------------------------------------------------------------------------
# Assessment grouping (prefix each question/assessment column carries in
# Master_Dataset.xlsx, e.g. "TT1_Q1a" -> assessment group "TT1")
# ---------------------------------------------------------------------------
ASSESSMENT_GROUPS = ["Quiz1", "ABA1", "TT1", "TT2", "TT3"]

# Assessments that participate in the "learning trend" (TTx - TTy) features.
# Ordered chronologically.
THEORY_TEST_SEQUENCE = ["TT1", "TT2", "TT3"]

# ---------------------------------------------------------------------------
# Validation thresholds
# ---------------------------------------------------------------------------
# A mark strictly less than this is considered invalid (negative marks).
MIN_VALID_MARK = 0.0

# ---------------------------------------------------------------------------
# ML / preprocessing configuration
# ---------------------------------------------------------------------------
RANDOM_SEED = 42
TRAIN_FRACTION = 0.70
VALIDATION_FRACTION = 0.15
TEST_FRACTION = 0.15

# The candidate target/label columns for supervised learning in Phase 6/7.
# 'At_Risk' is DERIVED automatically in feature_engineering.py from each
# student's own CO-attainment percentage (no external file required -- see
# CO_ATTAINMENT_THRESHOLD_PERCENT below), so it is always available and is
# checked first. 'CO_Attainment' / 'Attendance' remain as candidates in case
# an official, externally-supplied target is later added upstream.
CANDIDATE_TARGET_COLUMNS = ["At_Risk", "CO_Attainment", "Attendance"]

# A student is classified "At Risk" if their overall CO-attainment
# percentage (marks scored / marks possible, summed across every CO-mapped
# question they actually attempted) falls below this cutoff. 65% is the
# institution-specified attainment threshold.
CO_ATTAINMENT_THRESHOLD_PERCENT = 65.0

MODEL_LIST = [
    "LogisticRegression",
    "DecisionTree",
    "RandomForest",
    "GradientBoosting",  # used in place of XGBoost when xgboost is unavailable
    "SVM",
    "KNN",
    "NaiveBayes",
]

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
LOG_LEVEL = "INFO"
