from datetime import datetime

from history_viewer import (
    get_prediction_history,
    filter_prediction_history
)


# Load all history
history = get_prediction_history()

print("Total records:", len(history))


# --------------------------------------------------------
# TEST 1 — DATE FILTER
# --------------------------------------------------------

selected_date = datetime.strptime(
    "2026-09-26",
    "%Y-%m-%d"
).date()

date_filtered = filter_prediction_history(
    history,
    selected_date=selected_date
)

print("\nDate filter:")
print(date_filtered.to_string(index=False))


# --------------------------------------------------------
# TEST 2 — DISEASE FILTER
# --------------------------------------------------------

disease_filtered = filter_prediction_history(
    history,
    selected_disease="Tomato___Septoria_leaf_spot"
)

print("\nDisease filter:")
print(disease_filtered.to_string(index=False))


# --------------------------------------------------------
# TEST 3 — CONFIDENCE FILTER
# --------------------------------------------------------

confidence_filtered = filter_prediction_history(
    history,
    minimum_confidence=0.95
)

print("\nConfidence >= 95%:")
print(confidence_filtered.to_string(index=False))


print("\nFiltering test completed successfully.")