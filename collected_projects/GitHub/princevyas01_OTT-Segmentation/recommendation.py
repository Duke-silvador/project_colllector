"""
recommendation.py

Step 5:
Generate user segment names and provide
rule-based content & subscription recommendations.
"""

import pandas as pd

# ==========================================================
# Recommendation Dictionary
# ==========================================================

RECOMMENDATIONS = {

    "Action Movie Lovers": {
        "movies": "Action blockbusters, Thrillers, Sci-Fi franchises",
        "series": "Crime & Spy series, Short-season Action shows",
        "plan": "Upgrade Standard users with a Premium (4K) free trial."
    },

    "Family Viewers": {
        "movies": "Family dramas, Animation, Comedy movies",
        "series": "Family dramas, Kids & Teen shows",
        "plan": "Recommend Standard Family Plan with multiple profiles and parental controls."
    },

    "Premium Users": {
        "movies": "Award-winning Originals, Early-access releases",
        "series": "Exclusive Originals, International binge-worthy series",
        "plan": "Retain Premium users with annual subscription offers and loyalty rewards."
    },

    "Casual Users": {
        "movies": "Short comedies, Trending movies",
        "series": "Short episodes, Mobile-friendly content",
        "plan": "Recommend Basic Plan with ads and offer discounted Standard trial."
    }

}

# ==========================================================
# Assign Cluster Names
# ==========================================================

def label_clusters(df, cluster_column="KMeans_Cluster"):
    """
    Assign meaningful names to K-Means clusters
    based on cluster statistics.
    """

    profile = df.groupby(cluster_column)[
        [
            "WatchTime",
            "MoviesWatched",
            "SeriesWatched",
            "SubCode",
            "EngagementScore",
            "Age"
        ]
    ].mean()

    cluster_names = {}
    remaining_clusters = set(profile.index)

    # Premium Users
    premium_cluster = (
        profile["SubCode"] +
        profile["EngagementScore"] / profile["EngagementScore"].max()
    ).loc[list(remaining_clusters)].idxmax()

    cluster_names[premium_cluster] = "Premium Users"
    remaining_clusters.remove(premium_cluster)

    # Casual Users
    casual_cluster = (
        profile.loc[list(remaining_clusters)]["WatchTime"]
        .idxmin()
    )

    cluster_names[casual_cluster] = "Casual Users"
    remaining_clusters.remove(casual_cluster)

    # Action Movie Lovers
    movie_ratio = (
        profile["MoviesWatched"] /
        (profile["SeriesWatched"] + 1)
    ).loc[list(remaining_clusters)]

    action_cluster = movie_ratio.idxmax()

    cluster_names[action_cluster] = "Action Movie Lovers"
    remaining_clusters.remove(action_cluster)

    # Remaining Cluster → Family Viewers
    for cluster in remaining_clusters:
        cluster_names[cluster] = "Family Viewers"

    return cluster_names, profile

# ==========================================================
# Recommendation Table
# ==========================================================

def recommendation_table(cluster_names):
    """
    Create a recommendation table
    for all identified user segments.
    """

    recommendations = []

    for segment in cluster_names.values():

        recommendations.append({
            "Cluster": segment,
            **RECOMMENDATIONS[segment]
        })

    return pd.DataFrame(recommendations)

# ==========================================================
# Recommend Content for a Single User
# ==========================================================

def recommend_for_user(df, user_id, cluster_names):
    """
    Return personalized recommendations
    for a given user.
    """

    user = df[df["UserID"] == user_id].iloc[0]

    segment = cluster_names[user["KMeans_Cluster"]]

    return {
        "UserID": user_id,
        "Segment": segment,
        "Favorite Genre": user["FavoriteGenre"],
        **RECOMMENDATIONS[segment]
    }