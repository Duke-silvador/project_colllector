"""
eda.py

Step 2:
Perform Exploratory Data Analysis (EDA)
and generate visualization charts.

Charts Included:
1. Watch Time Distribution
2. Favourite Genre Distribution
3. Subscription Type Distribution
4. Engagement by Subscription
5. Movies vs Series Analysis
6. Device Usage Distribution
7. Correlation Heatmap
"""

import matplotlib

# Use non-interactive backend for saving plots
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import seaborn as sns

from preprocessing import FEATURES


# Set visualization style
sns.set_theme(
    style="whitegrid",
    palette="deep"
)


# ==========================================================
# Exploratory Data Analysis Function
# ==========================================================

def run_eda(df, output_folder="outputs"):
    """
    Generate EDA plots from OTT user dataset.

    Parameters:
        df : Cleaned DataFrame
        output_folder : Folder to save generated plots
    """

    # ------------------------------------------------------
    # Main EDA Dashboard
    # ------------------------------------------------------

    fig, axes = plt.subplots(
        2,
        3,
        figsize=(16, 9)
    )


    # 1. Watch Time Distribution

    sns.histplot(
        df["WatchTime"],
        bins=30,
        kde=True,
        ax=axes[0, 0]
    )

    axes[0, 0].set_title(
        "Watch Time (Hours/Week)"
    )


    # 2. Favourite Genre Distribution

    sns.countplot(
        data=df,
        y="FavoriteGenre",
        order=df["FavoriteGenre"].value_counts().index,
        ax=axes[0, 1]
    )

    axes[0, 1].set_title(
        "Favourite Genre"
    )


    # 3. Subscription Type Distribution

    sns.countplot(
        data=df,
        x="SubscriptionType",
        order=[
            "Basic",
            "Standard",
            "Premium"
        ],
        ax=axes[0, 2]
    )

    axes[0, 2].set_title(
        "Subscription Type"
    )


    # 4. Engagement Score by Subscription

    sns.boxplot(
        data=df,
        x="SubscriptionType",
        y="EngagementScore",
        order=[
            "Basic",
            "Standard",
            "Premium"
        ],
        ax=axes[1, 0]
    )

    axes[1, 0].set_title(
        "Engagement by Subscription"
    )


    # 5. Movies vs Series Watched

    sns.scatterplot(
        data=df,
        x="MoviesWatched",
        y="SeriesWatched",
        hue="SubscriptionType",
        alpha=0.6,
        ax=axes[1, 1]
    )

    axes[1, 1].set_title(
        "Movies vs Series"
    )


    # 6. Device Type Distribution

    sns.countplot(
        data=df,
        x="DeviceType",
        ax=axes[1, 2]
    )

    axes[1, 2].set_title(
        "Device Type"
    )


    # Save EDA Overview

    plt.tight_layout()

    plt.savefig(
        f"{output_folder}/eda_overview.png",
        dpi=110
    )

    plt.close()


    # ------------------------------------------------------
    # Correlation Heatmap
    # ------------------------------------------------------

    plt.figure(
        figsize=(8, 6)
    )

    sns.heatmap(
        df[FEATURES].corr(),
        annot=True,
        fmt=".2f",
        cmap="coolwarm"
    )

    plt.title(
        "Feature Correlation Heatmap"
    )

    plt.tight_layout()

    plt.savefig(
        f"{output_folder}/correlation_heatmap.png",
        dpi=110
    )

    plt.close()