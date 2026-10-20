"""
Main Program
Run the complete OTT User Segmentation pipeline.

Run:
    python generate_data.py
    python main.py
"""

import json

from preprocessing import load_and_clean, scale
from eda import run_eda
from clustering import (
    kmeans_search,
    run_kmeans,
    run_dbscan
)
from evaluation import (
    evaluate,
    compare
)
from recommendation import (
    label_clusters,
    recommendation_table,
    recommend_for_user
)
from visualization import (
    elbow_plot,
    pca_plot,
    profile_plots
)

# ======================================================
# Load and Clean Dataset
# ======================================================

df, cleaning_report = load_and_clean()

print("Cleaning Report:")
print(cleaning_report)

# ======================================================
# Data Preprocessing
# ======================================================

X = scale(df)

# ======================================================
# Exploratory Data Analysis
# ======================================================

run_eda(df)

# ======================================================
# K-Means: Find Optimal K
# ======================================================

k_values, inertia, silhouette = kmeans_search(X)

elbow_plot(
    k_values,
    inertia,
    silhouette
)

# ======================================================
# K-Means Clustering
# ======================================================

K = 4      # Selected using Elbow Method + Silhouette Score

df["KMeans_Cluster"] = run_kmeans(X, K)

# ======================================================
# DBSCAN Clustering
# ======================================================

dbscan_labels, dbscan_params = run_dbscan(X)

df["DBSCAN_Cluster"] = dbscan_labels

# ======================================================
# User Segmentation
# ======================================================

segment_names, profile = label_clusters(df)

df["Segment"] = df["KMeans_Cluster"].map(segment_names)

# ======================================================
# PCA Visualization
# ======================================================

pca_plot(
    X,
    df["KMeans_Cluster"].values,
    "K-Means Segments (PCA View)",
    "kmeans_pca.png",
    segment_names
)

pca_plot(
    X,
    dbscan_labels,
    "DBSCAN Clusters (PCA View)",
    "dbscan_pca.png"
)

# ======================================================
# Cluster Profile Visualization
# ======================================================

profile_plots(
    df,
    profile,
    segment_names
)

# ======================================================
# Model Evaluation
# ======================================================

kmeans_result = evaluate(
    X,
    df["KMeans_Cluster"].values,
    "K-Means"
)

dbscan_result = evaluate(
    X,
    dbscan_labels,
    "DBSCAN"
)

comparison = compare([
    kmeans_result,
    dbscan_result
])

# ======================================================
# Recommendation System
# ======================================================

recommendations = recommendation_table(segment_names)

sample_user = recommend_for_user(
    df,
    df["UserID"].iloc[0],
    segment_names
)

# ======================================================
# Save Outputs
# ======================================================

df.to_csv(
    "outputs/clustered_users.csv",
    index=False
)

comparison.to_csv(
    "outputs/model_comparison.csv",
    index=False
)

recommendations.to_csv(
    "outputs/recommendations.csv",
    index=False
)

# ======================================================
# Save JSON Report
# ======================================================

results = {
    "cleaning": cleaning_report,
    "k_values": k_values,
    "inertia": inertia,
    "silhouette": silhouette,
    "dbscan_parameters": dbscan_params,
    "model_comparison": comparison.to_dict("records"),
    "cluster_profile": (
        profile.rename(index=segment_names)
        .round(2)
        .reset_index()
        .rename(columns={"KMeans_Cluster": "Segment"})
        .to_dict("records")
    ),
    "segment_sizes": df["Segment"].value_counts().to_dict(),
    "recommendations": recommendations.to_dict("records"),
    "sample_user": sample_user
}

with open("outputs/results.json", "w") as file:
    json.dump(
        results,
        file,
        indent=4,
        default=str
    )

# ======================================================
# Display Results
# ======================================================

print("\nModel Comparison")
print(comparison.to_string(index=False))

print("\nCluster Profiles")
print(profile.rename(index=segment_names).round(1))

print("\nSample Recommendation")
print(sample_user)