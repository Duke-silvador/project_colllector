from prediction_history import save_prediction
import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "prediction_history.db"


# Test prediction record
save_prediction(
    "2026-09-26",
    "11:00:00",
    "test_leaf.jpg",
    "Apple___Apple_scab",
    0.94
)


# Check whether the record was saved
connection = sqlite3.connect(DATABASE_PATH)
cursor = connection.cursor()

cursor.execute("""
SELECT *
FROM prediction_history
ORDER BY id DESC
LIMIT 1
""")

record = cursor.fetchone()

connection.close()


print("Saved record:")
print(record)