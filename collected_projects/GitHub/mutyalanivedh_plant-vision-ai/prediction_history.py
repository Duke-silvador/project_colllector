import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "prediction_history.db"


def save_prediction(
    prediction_date,
    prediction_time,
    image_reference,
    predicted_class,
    confidence
):
    connection = sqlite3.connect(DATABASE_PATH)

    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO prediction_history (
            prediction_date,
            prediction_time,
            image_reference,
            predicted_class,
            confidence
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            prediction_date,
            prediction_time,
            image_reference,
            predicted_class,
            confidence
        )
    )

    connection.commit()
    connection.close()


print("Prediction history module created successfully.")