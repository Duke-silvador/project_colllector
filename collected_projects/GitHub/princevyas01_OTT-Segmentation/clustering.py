"""
clustering.py

Step 3:
Perform clustering using:
1. K-Means Clustering
   - Elbow Method
   - Silhouette Score

2. DBSCAN Clustering
   - Hyperparameter search for eps and min_samples
"""

import numpy as np

from sklearn.cluster import (
    KMeans,
    DBSCAN
)

from sklearn.metrics import silhouette_score


# ==========================================================
# K-Means: Find Optimal Number of Clusters
# ==========================================================

def kmeans_search(X, cluster_range=range(2, 9)):
    """
    Test different K values for K-Means.

    Metrics calculated:
    - Inertia (for Elbow Method)
    - Silhouette Score

    Parameters:
        X : Scaled feature matrix
        cluster_range : Range of K values

    Returns:
        List of K values,
        Inertia values,
        Silhouette scores
    """

    inertia_values = []
    silhouette_scores = []

    for k in cluster_range:

        model = KMeans(
            n_clusters=k,
            n_init=10,
            random_state=42
        )

        labels = model.fit_predict(X)

        # Store inertia
        inertia_values.append(
            model.inertia_
        )

        # Store silhouette score
        silhouette_scores.append(
            silhouette_score(
                X,
                labels
            )
        )

    return (
        list(cluster_range),
        inertia_values,
        silhouette_scores
    )


# ==========================================================
# K-Means Clustering
# ==========================================================

def run_kmeans(X, clusters):
    """
    Apply K-Means clustering.

    Returns:
        Cluster labels
    """

    model = KMeans(
        n_clusters=clusters,
        n_init=10,
        random_state=42
    )

    return model.fit_predict(X)


# ==========================================================
# DBSCAN Clustering with Parameter Search
# ==========================================================

def run_dbscan(X):
    """
    Find best DBSCAN parameters using silhouette score.

    Searches:
    - eps values: 0.8 to 3.0
    - min_samples: 5, 10, 15

    Returns:
        Best cluster labels
        Best parameters
    """

    best_score = -1
    best_params = None
    best_labels = None


    # Search different eps values
    for eps in np.arange(
        0.8,
        3.01,
        0.2
    ):

        # Search different minimum samples
        for min_samples in (
            5,
            10,
            15
        ):

            model = DBSCAN(
                eps=eps,
                min_samples=min_samples
            )

            labels = model.fit_predict(X)


            # Remove noise points (-1)
            cluster_count = (
                len(set(labels))
                -
                (1 if -1 in labels else 0)
            )

            valid_points = labels != -1


            # Check valid clustering
            if (
                cluster_count >= 2
                and valid_points.sum() > 0.5 * len(X)
            ):

                score = silhouette_score(
                    X[valid_points],
                    labels[valid_points]
                )


                # Store best model
                if score > best_score:

                    best_score = score
                    best_params = (
                        eps,
                        min_samples
                    )
                    best_labels = labels


    # Default DBSCAN if no good result found

    if best_labels is None:

        default_model = DBSCAN(
            eps=2,
            min_samples=10
        )

        return (
            default_model.fit_predict(X),
            (2, 10)
        )


    return (
        best_labels,
        best_params
    )