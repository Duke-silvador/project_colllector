"""
evaluation.py

Step 4:
Evaluate clustering performance using different metrics.

Metrics Used:
1. Silhouette Score
2. Davies-Bouldin Index
3. Calinski-Harabasz Score
"""

import pandas as pd

from sklearn.metrics import (
    silhouette_score,
    davies_bouldin_score,
    calinski_harabasz_score
)


# ==========================================================
# Evaluate Clustering Model
# ==========================================================

def evaluate(X, labels, algorithm_name):
    """
    Evaluate the clustering algorithm using standard metrics.

    Parameters:
        X : Scaled feature matrix
        labels : Cluster labels
        algorithm_name : Name of clustering algorithm

    Returns:
        Dictionary containing evaluation metrics.
    """

    # Ignore DBSCAN noise points (-1)
    valid_points = labels != -1

    # Number of valid clusters
    cluster_count = len(set(labels[valid_points]))

    # If fewer than 2 clusters exist, evaluation is not possible
    if cluster_count < 2:
        return {
            "Algorithm": algorithm_name,
            "Clusters": cluster_count,
            "Noise": int((~valid_points).sum()),
            "Silhouette": None,
            "Davies-Bouldin": None,
            "Calinski-Harabasz": None
        }

    # Calculate evaluation metrics
    return {
        "Algorithm": algorithm_name,
        "Clusters": cluster_count,
        "Noise": int((~valid_points).sum()),

        "Silhouette": round(
            silhouette_score(
                X[valid_points],
                labels[valid_points]
            ),
            3
        ),

        "Davies-Bouldin": round(
            davies_bouldin_score(
                X[valid_points],
                labels[valid_points]
            ),
            3
        ),

        "Calinski-Harabasz": round(
            calinski_harabasz_score(
                X[valid_points],
                labels[valid_points]
            ),
            1
        )
    }


# ==========================================================
# Compare Multiple Algorithms
# ==========================================================

def compare(results):
    """
    Convert evaluation results into a DataFrame.

    Parameters:
        results : List of dictionaries

    Returns:
        Pandas DataFrame
    """

    return pd.DataFrame(results)