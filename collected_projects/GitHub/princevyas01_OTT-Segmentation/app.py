"""
app.py  -  Streamlit front end for the OTT User Segmentation project.
Run:  streamlit run app.py      (run python main.py once first so outputs/ exists)
"""
import os
import numpy as np
import pandas as pd
import streamlit as st
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler

st.set_page_config(page_title="OTT User Segmentation", page_icon="🎬", layout="wide")
OUT = "outputs"
FEATURES = ["Age", "WatchTime", "MoviesWatched", "SeriesWatched", "AvgRating", "LoginFrequency", "EngagementScore", "SubCode"]
SUB_MAP = {"Basic": 0, "Standard": 1, "Premium": 2}
sns.set_theme(style="darkgrid")
plt.rcParams.update({"figure.facecolor": "#1a2232", "axes.facecolor": "#1a2232", "text.color": "#e8e6df",
                     "axes.labelcolor": "#e8e6df", "xtick.color": "#e8e6df", "ytick.color": "#e8e6df", "axes.titlecolor": "#e8e6df"})

try:
    from recommendation import RECOMMENDATIONS as RECS
except Exception:
    r = pd.read_csv(f"{OUT}/recommendations.csv").set_index("Cluster")
    RECS = r.to_dict("index")

@st.cache_data
def load():
    df = pd.read_csv(f"{OUT}/clustered_users.csv")
    cmp = pd.read_csv(f"{OUT}/model_comparison.csv")
    return df, cmp

if not os.path.exists(f"{OUT}/clustered_users.csv"):
    st.error("outputs/ not found. Run  python generate_data.py  and  python main.py  first.")
    st.stop()
df, cmp = load()

# scaler + centroids (used to place a NEW user into a segment)
scaler = StandardScaler().fit(df[FEATURES])
centroids = pd.DataFrame(scaler.transform(df[FEATURES]), columns=FEATURES).groupby(df["Segment"].values).mean()

def predict_segment(row):
    z = scaler.transform(pd.DataFrame([row])[FEATURES])[0]
    d = ((centroids.values - z) ** 2).sum(axis=1)
    return centroids.index[int(np.argmin(d))]

# ---------------- header ----------------
st.title("🎬 OTT User Segmentation & Recommendation")
st.caption("K-Means and DBSCAN clustering of viewer behaviour, with segment-based content and plan recommendations.")

# ---------------- sidebar filters ----------------
st.sidebar.header("Filters")
segs = st.sidebar.multiselect("Segment", sorted(df.Segment.unique()), default=sorted(df.Segment.unique()))
subs = st.sidebar.multiselect("Subscription", ["Basic", "Standard", "Premium"], default=["Basic", "Standard", "Premium"])
devs = st.sidebar.multiselect("Device", sorted(df.DeviceType.unique()), default=sorted(df.DeviceType.unique()))
a0, a1 = int(df.Age.min()), int(df.Age.max())
age = st.sidebar.slider("Age range", a0, a1, (a0, a1))
f = df[df.Segment.isin(segs) & df.SubscriptionType.isin(subs) & df.DeviceType.isin(devs) & df.Age.between(*age)]
st.sidebar.metric("Users selected", f"{len(f)} / {len(df)}")

tabs = st.tabs(["📊 Overview", "🔎 Explore data", "👥 Segments", "⚖️ K-Means vs DBSCAN", "🎯 Recommendations", "🧪 Try a new user"])

# ---------------- Overview ----------------
with tabs[0]:
    c = st.columns(4)
    c[0].metric("Users", len(f))
    c[1].metric("Avg watch time (hrs/wk)", round(f.WatchTime.mean(), 1) if len(f) else 0)
    c[2].metric("Avg engagement", round(f.EngagementScore.mean(), 1) if len(f) else 0)
    c[3].metric("Premium share", f"{(f.SubscriptionType.eq('Premium').mean() * 100 if len(f) else 0):.0f}%")
    if len(f):
        l, r = st.columns(2)
        with l:
            st.subheader("Users per segment")
            st.bar_chart(f.Segment.value_counts())
        with r:
            st.subheader("Average engagement per segment")
            st.bar_chart(f.groupby("Segment").EngagementScore.mean())
    else:
        st.info("No users match the filters.")

# ---------------- Explore ----------------
with tabs[1]:
    if len(f):
        a, b = st.columns(2)
        with a:
            st.subheader("Watch time distribution")
            fig, ax = plt.subplots(figsize=(6, 3.6)); sns.histplot(f.WatchTime, bins=25, kde=True, color="#d9661f", ax=ax); st.pyplot(fig)
        with b:
            st.subheader("Favourite genre")
            fig, ax = plt.subplots(figsize=(6, 3.6)); sns.countplot(data=f, y="FavoriteGenre", order=f.FavoriteGenre.value_counts().index, color="#4c8bd9", ax=ax); st.pyplot(fig)
        a, b = st.columns(2)
        with a:
            st.subheader("Movies vs series")
            fig, ax = plt.subplots(figsize=(6, 3.6)); sns.scatterplot(data=f, x="MoviesWatched", y="SeriesWatched", hue="Segment", alpha=.7, ax=ax); st.pyplot(fig)
        with b:
            st.subheader("Engagement by subscription")
            fig, ax = plt.subplots(figsize=(6, 3.6)); sns.boxplot(data=f, x="SubscriptionType", y="EngagementScore", order=["Basic", "Standard", "Premium"], ax=ax); st.pyplot(fig)
        st.subheader("Correlation heatmap")
        fig, ax = plt.subplots(figsize=(8, 4.5)); sns.heatmap(f[FEATURES].corr(), annot=True, fmt=".2f", cmap="coolwarm", ax=ax); st.pyplot(fig)
        st.subheader("User table")
        st.dataframe(f.drop(columns=["KMeans_Cluster", "DBSCAN_Cluster"], errors="ignore"), use_container_width=True, hide_index=True)
        st.download_button("Download filtered users (CSV)", f.to_csv(index=False).encode(), "filtered_users.csv", "text/csv")

# ---------------- Segments ----------------
with tabs[2]:
    prof = df.groupby("Segment")[["Age", "WatchTime", "MoviesWatched", "SeriesWatched", "LoginFrequency", "EngagementScore"]].mean().round(1)
    prof["Users"] = df.Segment.value_counts()
    st.subheader("Segment profiles (average values)")
    st.dataframe(prof, use_container_width=True)
    a, b = st.columns(2)
    with a:
        st.image(f"{OUT}/kmeans_pca.png", caption="K-Means segments (PCA view)")
    with b:
        st.image(f"{OUT}/cluster_profiles.png", caption="Cluster profile heatmap")
    st.image(f"{OUT}/segment_summary.png", caption="Segment sizes and genre mix")
    st.image(f"{OUT}/elbow_silhouette.png", caption="Elbow method and silhouette score (k = 4 chosen)")

# ---------------- Compare ----------------
with tabs[3]:
    st.subheader("Clustering quality")
    st.dataframe(cmp, use_container_width=True, hide_index=True)
    km, db = cmp.iloc[0], cmp.iloc[1]
    st.success(f"K-Means gives {int(km.Clusters)} clusters with silhouette {km.Silhouette} and no noise. "
               f"DBSCAN gives {int(db.Clusters)} clusters, silhouette {db.Silhouette}, and marks {int(db.Noise)} users as noise. "
               "K-Means is more suitable for this dataset.")
    a, b = st.columns(2)
    with a: st.image(f"{OUT}/kmeans_pca.png", caption="K-Means")
    with b: st.image(f"{OUT}/dbscan_pca.png", caption="DBSCAN (grey = noise)")

# ---------------- Recommendations ----------------
with tabs[4]:
    st.subheader("Recommendations by segment")
    for name, rec in RECS.items():
        with st.expander(f"{name}  ({int((df.Segment == name).sum())} users)", expanded=False):
            st.markdown(f"**🎥 Movies:** {rec['movies']}\n\n**📺 Series:** {rec['series']}\n\n**💳 Plan:** {rec['plan']}")
    st.subheader("Look up an existing user")
    uid = st.selectbox("User ID", df.UserID)
    u = df[df.UserID == uid].iloc[0]
    st.write(f"**{uid}** is in **{u.Segment}** (favourite genre: {u.FavoriteGenre}, plan: {u.SubscriptionType}).")
    st.info(f"Movies: {RECS[u.Segment]['movies']}  |  Series: {RECS[u.Segment]['series']}  |  Plan: {RECS[u.Segment]['plan']}")

# ---------------- New user ----------------
with tabs[5]:
    st.subheader("Enter viewing behaviour to find the segment")
    a, b, c = st.columns(3)
    age_i = a.number_input("Age", 14, 80, 30)
    wt = a.number_input("Watch time (hrs/week)", 0.0, 80.0, 15.0)
    lg = a.number_input("Logins per week", 0.0, 20.0, 4.0)
    mv = b.number_input("Movies watched", 0, 100, 10)
    sr = b.number_input("Series watched", 0, 100, 10)
    rt = b.number_input("Average rating", 1.0, 5.0, 3.5, 0.1)
    sub = c.selectbox("Subscription", list(SUB_MAP), index=1)
    eng = c.slider("Engagement score", 1, 100, 45)
    if st.button("Find segment", type="primary"):
        seg = predict_segment(dict(Age=age_i, WatchTime=wt, MoviesWatched=mv, SeriesWatched=sr, AvgRating=rt,
                                   LoginFrequency=lg, EngagementScore=eng, SubCode=SUB_MAP[sub]))
        st.success(f"Predicted segment: **{seg}**")
        st.write(f"🎥 {RECS[seg]['movies']}\n\n📺 {RECS[seg]['series']}\n\n💳 {RECS[seg]['plan']}")
