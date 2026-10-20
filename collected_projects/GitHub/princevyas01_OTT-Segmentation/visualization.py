"""
visualization.py

Step 6:
Generate clustering visualizations.

Includes:
1. Elbow Method Plot
2. Silhouette Score Plot
3. PCA Cluster Visualization
4. Cluster Profile Heatmap
5. Segment Summary Charts
"""

import matplotlib

# Use non-GUI backend
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA


# ==========================================================
# Elbow Method & Silhouette Score
# ==========================================================

def elbow_plot(k_values, inertia, silhouette_scores, output_folder="outputs"):
    """
    Plot Elbow Method and Silhouette Score graphs.
    """

    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

    # Elbow Method
    axes[0].plot(k_values, inertia, marker="o")
    axes[0].set_title("Elbow Method")
    axes[0].set_xlabel("Number of Clusters (K)")
    axes[0].set_ylabel("Inertia")

    # Silhouette Score
    axes[1].plot(
        k_values,
        silhouette_scores,
        marker="o",
        color="darkorange"
    )
    axes[1].set_title("Silhouette Score vs K")
    axes[1].set_xlabel("Number of Clusters (K)")
    axes[1].set_ylabel("Silhouette Score")

    plt.tight_layout()
    plt.savefig(
        f"{output_folder}/elbow_silhouette.png",
        dpi=110
    )
    plt.close()


# ==========================================================
# PCA Cluster Visualization
# ==========================================================

def pca_plot(
    X,
    labels,
    title,
    filename,
    cluster_names=None,
    output_folder="outputs"
):
    """
    Visualize clusters using PCA.
    """

    pca = PCA(
        n_components=2,
        random_state=42
    )

    components = pca.fit_transform(X)

    plt.figure(figsize=(8, 6))

    for label in sorted(set(labels)):

        mask = labels == label

        if label == -1:
            name = "Noise"
            color = "lightgrey"
        else:
            name = (
                cluster_names[label]
                if cluster_names
                else f"Cluster {label}"
            )
            color = None

        plt.scatter(
            components[mask, 0],
            components[mask, 1],
            s=18,
            alpha=0.7,
            label=name,
            color=color
        )

    plt.title(title)
    plt.xlabel("Principal Component 1")
    plt.ylabel("Principal Component 2")

    plt.legend()

    plt.tight_layout()

    plt.savefig(
        f"{output_folder}/{filename}",
        dpi=110
    )

    plt.close()


# ==========================================================
# Cluster Profile Visualizations
# ==========================================================

def profile_plots(df, profile, cluster_names, output_folder="outputs"):
    """
    Generate cluster profile heatmap and summary charts.
    """

    # -------------------------------
    # Heatmap
    # -------------------------------

    standardized = (profile - profile.mean()) / profile.std()

    standardized.index = [
        cluster_names[i]
        for i in standardized.index
    ]

    plt.figure(figsize=(9, 4.5))

    sns.heatmap(
        standardized,
        annot=profile.rename(index=cluster_names).round(1),
        fmt="",
        cmap="YlOrRd"
    )

    plt.title(
        "Cluster Profiles\n(Color = Relative Level, Numbers = Mean)"
    )

    plt.tight_layout()

    plt.savefig(
        f"{output_folder}/cluster_profiles.png",
        dpi=110
    )

    plt.close()

    # -------------------------------
    # Segment Summary Charts
    # -------------------------------

    data = df.assign(
        Segment=df["KMeans_Cluster"].map(cluster_names)
    )

    fig, axes = plt.subplots(
        1,
        2,
        figsize=(13, 4.5)
    )

    # Users per Segment

    data["Segment"].value_counts().plot.bar(
        ax=axes[0],
        color=sns.color_palette("deep")
    )

    axes[0].set_title("Users per Segment")
    axes[0].set_xlabel("")
    axes[0].set_ylabel("Number of Users")
    axes[0].tick_params(axis="x", rotation=20)

    # Genre Distribution

    genre_data = (
        data.groupby(
            ["Segment", "FavoriteGenre"]
        )
        .size()
        .unstack(fill_value=0)
    )

    (
        genre_data.div(
            genre_data.sum(axis=1),
            axis=0
        ) * 100
    ).plot.bar(
        stacked=True,
        ax=axes[1]
    )

    axes[1].set_title("Genre Distribution per Segment (%)")
    axes[1].set_xlabel("")
    axes[1].tick_params(axis="x", rotation=20)

    plt.tight_layout()

    plt.savefig(
        f"{output_folder}/segment_summary.png",
        dpi=110
    )

    plt.close()