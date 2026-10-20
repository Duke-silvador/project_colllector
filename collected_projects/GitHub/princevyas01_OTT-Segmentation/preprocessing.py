"""
preprocessing.py

Step 1:
- Load Dataset
- Remove Duplicates
- Handle Missing Values
- Encode Categorical Data
- Scale Numerical Features
"""

import pandas as pd
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------
# Subscription Encoding
# ---------------------------------------------------------

SUBSCRIPTION_MAP = {
    "Basic": 0,
    "Standard": 1,
    "Premium": 2
}

# ---------------------------------------------------------
# Features Used for Clustering
# ---------------------------------------------------------

FEATURES = [
    "Age",
    "WatchTime",
    "MoviesWatched",
    "SeriesWatched",
    "AvgRating",
    "LoginFrequency",
    "EngagementScore",
    "SubCode"
]

# ---------------------------------------------------------
# Load and Clean Dataset
# ---------------------------------------------------------

def load_and_clean(path="data/ott_users.csv"):
    """
    Load the dataset and perform preprocessing.

    Steps:
    1. Read CSV file
    2. Remove duplicate rows
    3. Fill missing numerical values using median
    4. Fill missing categorical values using mode
    5. Encode SubscriptionType
    """

    # Load dataset
    df = pd.read_csv(path)

    # Cleaning report
    report = {
        "Rows Before Cleaning": len(df),
        "Duplicate Rows": int(df.duplicated().sum()),
        "Missing Values": df.isna().sum()[df.isna().sum() > 0].to_dict()
    }

    # Remove duplicate records
    df = df.drop_duplicates().reset_index(drop=True)

    # Fill missing numerical values
    numeric_columns = df.select_dtypes(include="number").columns

    for column in numeric_columns:
        df[column] = df[column].fillna(df[column].median())

    # Fill missing categorical values
    categorical_columns = df.select_dtypes(include="object").columns

    for column in categorical_columns:
        df[column] = df[column].fillna(df[column].mode()[0])

    # Encode Subscription Type
    df["SubCode"] = df["SubscriptionType"].map(SUBSCRIPTION_MAP)

    # Final row count
    report["Rows After Cleaning"] = len(df)

    return df, report

# ---------------------------------------------------------
# Feature Scaling
# ---------------------------------------------------------

def scale(df):
    """
    Standardize numerical features before clustering.
    """

    scaler = StandardScaler()

    X = scaler.fit_transform(df[FEATURES])

    return X