"""
Creates a realistic synthetic OTT user behaviour dataset
and saves it as data/ott_users.csv
"""

import numpy as np
import pandas as pd

# Random number generator for reproducibility
rng = np.random.default_rng(42)

# ------------------------------------------------------------------
# User Groups Configuration
# (share, age, watch_hours, movies, series, login_frequency,
#  genre probabilities, subscription probabilities, device probabilities)
# ------------------------------------------------------------------

GROUPS = {
    "action": (
        0.28,
        (24, 5),
        (22, 5),
        (30, 6),
        (8, 3),
        (6, 1.5),
        {
            "Action": 0.60,
            "Thriller": 0.20,
            "Sci-Fi": 0.15,
            "Comedy": 0.05
        },
        {
            "Basic": 0.20,
            "Standard": 0.60,
            "Premium": 0.20
        },
        {
            "Mobile": 0.40,
            "Smart TV": 0.30,
            "Laptop": 0.30
        }
    ),

    "family": (
        0.27,
        (40, 7),
        (16, 4),
        (12, 4),
        (20, 5),
        (4, 1.2),
        {
            "Family": 0.45,
            "Drama": 0.35,
            "Comedy": 0.15,
            "Kids": 0.05
        },
        {
            "Basic": 0.25,
            "Standard": 0.65,
            "Premium": 0.10
        },
        {
            "Mobile": 0.15,
            "Smart TV": 0.70,
            "Laptop": 0.15
        }
    ),

    "premium": (
        0.20,
        (33, 8),
        (34, 6),
        (28, 6),
        (26, 6),
        (9, 1.5),
        {
            "Drama": 0.30,
            "Sci-Fi": 0.25,
            "Action": 0.20,
            "Thriller": 0.25
        },
        {
            "Basic": 0.00,
            "Standard": 0.10,
            "Premium": 0.90
        },
        {
            "Mobile": 0.20,
            "Smart TV": 0.50,
            "Laptop": 0.30
        }
    ),

    "casual": (
        0.25,
        (28, 10),
        (5, 2.5),
        (4, 2),
        (3, 1.5),
        (1.5, 0.8),
        {
            "Comedy": 0.40,
            "Action": 0.20,
            "Drama": 0.20,
            "Family": 0.20
        },
        {
            "Basic": 0.80,
            "Standard": 0.20,
            "Premium": 0.00
        },
        {
            "Mobile": 0.75,
            "Smart TV": 0.10,
            "Laptop": 0.15
        }
    )
}

# ------------------------------------------------------------------
# Generate Synthetic Dataset
# ------------------------------------------------------------------

N = 1000
rows = []

for group, (
    share,
    age,
    watch,
    movies,
    series,
    login,
    genres,
    subscriptions,
    devices
) in GROUPS.items():

    for _ in range(int(N * share)):

        watch_time = max(0.5, rng.normal(*watch))
        movies_watched = max(0, int(rng.normal(*movies)))
        series_watched = max(0, int(rng.normal(*series)))
        login_frequency = max(0.2, rng.normal(*login))

        avg_rating = np.clip(
            rng.normal(
                3.4 + (watch_time * 0.02 / 2) +
                (0.3 if group == "premium" else 0),
                0.5
            ),
            1,
            5
        )

        engagement = np.clip(
            watch_time * 1.4 +
            login_frequency * 3 +
            movies_watched * 0.3 +
            series_watched * 0.3 +
            rng.normal(0, 4),
            1,
            100
        )

        rows.append({

            "Age": int(np.clip(rng.normal(*age), 14, 75)),

            "Gender": rng.choice(
                ["Male", "Female", "Other"],
                p=[0.48, 0.48, 0.04]
            ),

            "WatchTime": round(watch_time, 1),

            "MoviesWatched": movies_watched,

            "SeriesWatched": series_watched,

            "FavoriteGenre": rng.choice(
                list(genres.keys()),
                p=list(genres.values())
            ),

            "AvgRating": round(float(avg_rating), 1),

            "SubscriptionType": rng.choice(
                list(subscriptions.keys()),
                p=list(subscriptions.values())
            ),

            "LoginFrequency": round(login_frequency, 1),

            "DeviceType": rng.choice(
                list(devices.keys()),
                p=list(devices.values())
            ),

            "EngagementScore": round(float(engagement), 1)

        })

# ------------------------------------------------------------------
# Create DataFrame
# ------------------------------------------------------------------

df = pd.DataFrame(rows)

# Shuffle rows
df = df.sample(frac=1, random_state=1).reset_index(drop=True)

# Add User IDs
df.insert(
    0,
    "UserID",
    [f"U{i:04d}" for i in range(1, len(df) + 1)]
)

# ------------------------------------------------------------------
# Inject Missing Values (~2%)
# ------------------------------------------------------------------

for column in ["AvgRating", "Age", "WatchTime"]:
    missing_index = rng.choice(len(df), 20, replace=False)
    df.loc[missing_index, column] = np.nan

# ------------------------------------------------------------------
# Inject Duplicate Records
# ------------------------------------------------------------------

duplicates = df.sample(10, random_state=3)
df = pd.concat([df, duplicates], ignore_index=True)

# ------------------------------------------------------------------
# Save Dataset
# ------------------------------------------------------------------

df.to_csv("data/ott_users.csv", index=False)

print("Dataset Saved Successfully!")
print("Shape :", df.shape)
print(df.head())