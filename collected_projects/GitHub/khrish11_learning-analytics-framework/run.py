#!/usr/bin/env python3
"""
run.py
------
Single entry point for the learning_analytics research pipeline.

Usage:
    python run.py

Runs, in order:
    1. validate_data.py         -> reports/Validation_Report.md
    2. feature_engineering.py   -> output/Feature_Dataset.xlsx,
                                    reports/Feature_Engineering_Report.md
    3. eda.py                   -> figures/*.png, reports/EDA_Report.md
    4. statistical_analysis.py  -> reports/Statistical_Report.md
    5. preprocessing.py         -> output/train_set.xlsx,
                                    output/validation_set.xlsx,
                                    output/test_set.xlsx
    6. train_models.py          -> models/*.joblib, reports/Model_Report.md
                                    (trains for real once Attendance /
                                    CO_Attainment are populated; otherwise
                                    writes a clear "skipped" note)
    7. explainability.py        -> figures/*.png, appended to
                                    reports/Model_Report.md
                                    (runs for real once Phase 6 has
                                    trained models; otherwise skipped)

To refresh every dataset, report, figure, and (once labels exist) model
for a NEW semester/section: replace Students.xlsx, Assessments.xlsx,
Question_Metadata.xlsx and Master_Dataset.xlsx in input/ with the new
DatasetBuilder output, then simply re-run this script.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent / "scripts"))

import validate_data
import feature_engineering
import eda
import statistical_analysis
import preprocessing
import train_models
import explainability

from utils import get_logger

logger = get_logger("run")


def main() -> None:
    logger.info("=" * 70)
    logger.info("learning_analytics pipeline starting")
    logger.info("=" * 70)

    logger.info(">>> PHASE 1: Data validation")
    validate_data.main()

    logger.info(">>> PHASE 2: Feature engineering")
    feature_engineering.main()

    logger.info(">>> PHASE 3: Exploratory data analysis")
    eda.main()

    logger.info(">>> PHASE 4: Statistical analysis")
    statistical_analysis.main()

    logger.info(">>> PHASE 5: Preprocessing")
    preprocessing.main()

    logger.info(">>> PHASE 6: Machine learning")
    train_models.main()

    logger.info(">>> PHASE 7: Explainability")
    explainability.main()

    logger.info("=" * 70)
    logger.info("Pipeline complete. Key outputs:")
    logger.info("  output/Feature_Dataset.xlsx")
    logger.info("  output/train_set.xlsx, validation_set.xlsx, test_set.xlsx")
    logger.info("  figures/*.png")
    logger.info("  reports/Validation_Report.md")
    logger.info("  reports/Feature_Engineering_Report.md")
    logger.info("  reports/EDA_Report.md")
    logger.info("  reports/Statistical_Report.md")
    logger.info("  reports/Model_Report.md")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
