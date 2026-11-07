import sqlite3
from pathlib import Path
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "prediction_history.db"


def get_prediction_history():
    """
    Read all prediction records from SQLite.
    """

    connection = sqlite3.connect(DATABASE_PATH)

    query = """
        SELECT
            id,
            prediction_date,
            prediction_time,
            image_reference,
            predicted_class,
            confidence
        FROM prediction_history
        ORDER BY id DESC
    """

    dataframe = pd.read_sql_query(
        query,
        connection
    )

    connection.close()

    return dataframe


def filter_prediction_history(
    history,
    selected_date=None,
    selected_disease="All",
    minimum_confidence=0.0
):
    """
    Filter prediction history by date,
    disease and minimum confidence.
    """

    filtered_history = history.copy()

    # --------------------------------------------------------
    # DATE FILTER
    # --------------------------------------------------------

    if selected_date is not None:

        filtered_history = filtered_history[
            filtered_history["prediction_date"]
            == selected_date.strftime("%Y-%m-%d")
        ]

    # --------------------------------------------------------
    # DISEASE FILTER
    # --------------------------------------------------------

    if selected_disease != "All":

        filtered_history = filtered_history[
            filtered_history["predicted_class"]
            == selected_disease
        ]

    # --------------------------------------------------------
    # CONFIDENCE FILTER
    # --------------------------------------------------------

    filtered_history = filtered_history[
        filtered_history["confidence"]
        >= minimum_confidence
    ]

    return filtered_history


if __name__ == "__main__":

    history = get_prediction_history()

    print("Prediction History")
    print("------------------")

    if history.empty:

        print("No prediction history found.")

    else:

        print(history.to_string(index=False))