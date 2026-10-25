import streamlit as st
import pandas as pd
from ucimlrepo import fetch_ucirepo
from pathlib import Path
from urllib.request import urlretrieve
import zipfile
import warnings

import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    ConfusionMatrixDisplay
)
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings("ignore", category=UserWarning)

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DATA_FILE = DATA_DIR / "bank-additional-full.csv"
ZIP_FILE = DATA_DIR / "bank-marketing.zip"
DATASET_URL = "https://archive.ics.uci.edu/static/public/222/bank+marketing.zip"

st.set_page_config(
    page_title="Customer Retail ML",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Soft, light visual theme using Streamlit's native components + custom CSS.
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
html, body, [class*="css"] { font-family: 'DM Sans', sans-serif; }
.stApp { background: linear-gradient(135deg, #fbfaff 0%, #f8f9ff 48%, #fff8fc 100%); color: #172344; }
[data-testid="stSidebar"] { background: linear-gradient(180deg, #f1efff 0%, #f8f7ff 58%, #fff4fa 100%); border-right: 1px solid #e8e5fb; }
[data-testid="stSidebar"] * { color: #26345b; }
h1, h2, h3 { font-family: 'Manrope', sans-serif !important; color: #172344 !important; letter-spacing: -0.03em; }
.hero { padding: 1.5rem 1.7rem; border: 1px solid #e8e5ff; border-radius: 24px; background: linear-gradient(115deg, #f0edff 0%, #fff7fb 54%, #f0f7ff 100%); margin-bottom: 1rem; }
.hero-kicker { color: #8063d9; font-size: .78rem; font-weight: 800; text-transform: uppercase; letter-spacing: .13em; }
.hero-title { font-family: 'Manrope', sans-serif; font-size: clamp(1.8rem, 3vw, 2.8rem); line-height: 1.15; font-weight: 800; color: #19274c; margin: .3rem 0 .55rem; }
.hero-copy { color: #596b94; max-width: 760px; font-size: 1rem; }
.metric-card { background: rgba(255,255,255,.9); border: 1px solid #e8eafb; border-radius: 18px; padding: 1rem 1.1rem; min-height: 118px; box-shadow: 0 7px 24px rgba(63, 57, 130, .045); }
.metric-label { font-size: .82rem; color: #68799e; font-weight: 600; }
.metric-value { font-family: 'Manrope', sans-serif; font-size: 1.8rem; font-weight: 800; color: #202c51; margin: .28rem 0; }
.metric-note { font-size: .75rem; color: #8794b1; }
.panel { background: rgba(255,255,255,.88); border: 1px solid #e7eafa; border-radius: 20px; padding: 1rem 1.1rem; box-shadow: 0 7px 24px rgba(63, 57, 130, .035); margin-bottom: 1rem; }
.panel-sub { color: #7381a2; font-size: .86rem; margin-top: -.5rem; }
.pill { display:inline-block; border-radius: 999px; padding: .35rem .7rem; font-size: .76rem; font-weight: 700; background:#f0ebff; color:#7651d2; }
div.stButton > button { border-radius: 12px; border: 1px solid #ded6ff; background: linear-gradient(100deg,#7654e8,#9a73ef); color:white; font-weight:700; padding:.58rem 1rem; }
div.stButton > button:hover { border-color:#b7a4ff; color:white; filter:brightness(1.04); }
div[data-testid="stMetric"] { background:#fff; border:1px solid #e8eafb; border-radius:16px; padding:14px 16px; box-shadow:0 5px 20px rgba(63,57,130,.04); }
div[data-testid="stDataFrame"] { border:1px solid #e8eafb; border-radius:14px; overflow:hidden; }
hr { border-color:#ecebfa; }
.small-muted { color:#7885a5; font-size:.82rem; }
</style>
""", unsafe_allow_html=True)


@st.cache_data
def load_data():
    bank_marketing = fetch_ucirepo(id=222)

    features = bank_marketing.data.features.copy()
    targets = bank_marketing.data.targets.copy()

    df = features.copy()
    df["y"] = targets.iloc[:, 0].values

    return df



@st.cache_resource(show_spinner=False)
def train_models(test_size, random_state, tree_depth, knn_neighbors):
    """Fit preprocessing and classifiers without leaking test data."""
    df = load_data()
    X = df.drop(columns=["y", "duration"], errors="ignore")
    y = df["y"].map({"no": 0, "yes": 1})

    numeric_features = X.select_dtypes(include=["number"]).columns.tolist()
    categorical_features = X.select_dtypes(exclude=["number"]).columns.tolist()

    numeric_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])
    prep = ColumnTransformer([
        ("numeric", numeric_pipe, numeric_features),
        ("categorical", categorical_pipe, categorical_features),
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    estimators = {
        "Logistic Regression": LogisticRegression(
            max_iter=2000, class_weight="balanced"
        ),
        "Decision Tree": DecisionTreeClassifier(
            max_depth=tree_depth, random_state=random_state, class_weight="balanced"
        ),
        "KNN": KNeighborsClassifier(n_neighbors=knn_neighbors),
    }

    fitted = {}
    rows = []
    predictions = {}
    for name, estimator in estimators.items():
        pipe = Pipeline([("preprocessing", prep), ("model", estimator)])
        pipe.fit(X_train, y_train)
        pred = pipe.predict(X_test)
        fitted[name] = pipe
        predictions[name] = pred
        rows.append({
            "Model": name,
            "Accuracy": accuracy_score(y_test, pred),
            "Precision": precision_score(y_test, pred, zero_division=0),
            "Recall": recall_score(y_test, pred, zero_division=0),
            "F1-score": f1_score(y_test, pred, zero_division=0),
        })

    metrics = pd.DataFrame(rows).sort_values("F1-score", ascending=False)
    return fitted, metrics, X_test, y_test, predictions, numeric_features, categorical_features


def metric_card(label, value, note, icon):
    st.markdown(
        f"""<div class="metric-card">
        <div style="font-size:1.25rem;margin-bottom:.35rem">{icon}</div>
        <div class="metric-label">{label}</div>
        <div class="metric-value">{value}</div>
        <div class="metric-note">{note}</div></div>""",
        unsafe_allow_html=True,
    )


def section_title(title, subtitle=None):
    st.markdown(f"### {title}")
    if subtitle:
        st.markdown(f'<div class="panel-sub">{subtitle}</div>', unsafe_allow_html=True)


def main():
    with st.sidebar:
        st.markdown("## 🛍️ Customer Retail ML")
        st.caption("Predict  ·  Analyze  ·  Grow")
        st.divider()
        page = st.radio(
            "Navigation",
            ["Home", "Customer Analytics", "Campaign Insights", "Model Comparison", "Predict", "About"],
            label_visibility="collapsed",
        )
        st.divider()
        st.markdown("### 🌱 Better insights.")
        st.markdown("### Smarter decisions.")
        st.caption("Use machine learning to explore customer behaviour and campaign response.")
        st.markdown("---")
        st.caption("Built with Python · Pandas · Scikit-learn")

    st.markdown("""
    <div class="hero">
      <div class="hero-kicker">Customer intelligence workspace</div>
      <div class="hero-title">Customer Retail Machine Learning</div>
      <div class="hero-copy">Explore customer data, understand campaign patterns, and compare classification models in one interactive website.</div>
    </div>
    """, unsafe_allow_html=True)

    try:
        with st.spinner("Loading the public customer marketing dataset..."):
            df = load_data()
    except Exception as exc:
        st.error("The dataset could not be downloaded. Check your internet connection and restart the app.")
        st.code(str(exc))
        st.markdown("Dataset source: https://archive.ics.uci.edu/dataset/222/bank+marketing")
        st.stop()

    # Use the actual dataset for headline figures.
    total_customers = len(df)
    yes_count = int((df["y"] == "yes").sum())
    response_rate = (yes_count / total_customers * 100) if total_customers else 0
    features_count = len([c for c in df.columns if c not in ("y", "duration")])

    k1, k2, k3, k4 = st.columns(4)
    with k1: metric_card("Customer records", f"{total_customers:,}", "Rows in loaded dataset", "👥")
    with k2: metric_card("Campaign responses", f"{yes_count:,}", "Customers who subscribed", "🎯")
    with k3: metric_card("Response rate", f"{response_rate:.1f}%", "Calculated from dataset", "💜")
    with k4: metric_card("Input features", str(features_count), "Excludes target and call duration", "📊")

    if page == "Home":
        left, right = st.columns([1.1, 1])
        with left:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            section_title("Customer overview", "A quick look at the dataset you loaded")
            c1, c2 = st.columns(2)
            with c1:
                st.markdown("**Subscription outcome**")
                outcome = df["y"].value_counts().rename(index={"yes": "Subscribed", "no": "Not subscribed"})
                fig, ax = plt.subplots(figsize=(4, 3))
                outcome.plot(kind="pie", autopct="%1.1f%%", startangle=90,
                             colors=["#9878ee", "#f48fbd"], ylabel="", ax=ax,
                             wedgeprops={"width": .38, "edgecolor": "white"})
                st.pyplot(fig, use_container_width=True)
                plt.close(fig)
            with c2:
                st.markdown("**Age distribution**")
                fig, ax = plt.subplots(figsize=(4, 3))
                df["age"].plot(kind="hist", bins=18, color="#9a80ef", edgecolor="white", ax=ax)
                ax.set_xlabel("Age")
                ax.set_ylabel("Customers")
                ax.spines[["top", "right"]].set_visible(False)
                st.pyplot(fig, use_container_width=True)
                plt.close(fig)
            st.markdown('</div>', unsafe_allow_html=True)
        with right:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            section_title("Campaign response insights", "Values below are calculated from the selected dataset")
            channel_col = "contact"
            channel = df.groupby(channel_col)["y"].apply(lambda s: (s == "yes").mean() * 100).sort_values(ascending=False)
            fig, ax = plt.subplots(figsize=(6, 3.3))
            channel.plot(kind="bar", color=["#a68af4", "#f39bc7", "#8ec9f4"][:len(channel)], ax=ax)
            ax.set_ylabel("Response rate (%)")
            ax.set_xlabel("")
            ax.tick_params(axis="x", rotation=0)
            ax.spines[["top", "right"]].set_visible(False)
            ax.grid(axis="y", alpha=.2)
            st.pyplot(fig, use_container_width=True)
            plt.close(fig)
            if len(channel):
                st.info(f"Highest observed response rate by contact type: **{channel.index[0]}** ({channel.iloc[0]:.1f}%). This is a descriptive pattern, not proof that the channel caused the response.")
            st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('<div class="panel">', unsafe_allow_html=True)
        section_title("Start exploring", "Use the navigation on the left to explore customer characteristics, compare models, or try a prediction.")
        a, b, c = st.columns(3)
        a.markdown("**👥 Customer Analytics**  \nExplore age, job, education, and other characteristics.")
        b.markdown("**📣 Campaign Insights**  \nReview response rates across campaign categories.")
        c.markdown("**🧠 Model Comparison**  \nTrain three algorithms and compare measured results.")
        st.markdown('</div>', unsafe_allow_html=True)

    elif page == "Customer Analytics":
        section_title("Customer analytics", "Choose a feature to inspect its distribution.")
        selectable = [c for c in df.columns if c != "y"]
        selected = st.selectbox("Select a customer or campaign feature", selectable, index=selectable.index("age") if "age" in selectable else 0)
        col1, col2 = st.columns([1.1, 1])
        with col1:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            st.markdown(f"**Distribution of {selected}**")
            if pd.api.types.is_numeric_dtype(df[selected]):
                fig, ax = plt.subplots(figsize=(7, 4))
                df[selected].plot(kind="hist", bins=25, color="#9274e9", edgecolor="white", ax=ax)
                ax.set_xlabel(selected.title())
                ax.set_ylabel("Records")
                ax.spines[["top", "right"]].set_visible(False)
                ax.grid(axis="y", alpha=.18)
            else:
                counts = df[selected].fillna("Missing").value_counts().head(15)
                fig, ax = plt.subplots(figsize=(7, 4))
                counts.sort_values().plot(kind="barh", color="#ed91bf", ax=ax)
                ax.set_xlabel("Records")
                ax.set_ylabel("")
                ax.spines[["top", "right"]].set_visible(False)
            st.pyplot(fig, use_container_width=True)
            plt.close(fig)
            st.markdown('</div>', unsafe_allow_html=True)
        with col2:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            st.markdown(f"**{selected} by subscription outcome**")
            if pd.api.types.is_numeric_dtype(df[selected]):
                plot_df = df.assign(outcome=df["y"]).groupby("outcome")[selected].median().reindex(["no", "yes"])
                st.bar_chart(plot_df.rename(index={"no": "Not subscribed", "yes": "Subscribed"}), color="#9b7bea")
                st.caption("Median values for each outcome group.")
            else:
                tmp = df.groupby(selected)["y"].apply(lambda s: (s == "yes").mean() * 100).sort_values(ascending=False).head(12)
                st.bar_chart(tmp, color="#ed91bf")
                st.caption("Observed subscription rate by category (%); small groups may be noisy.")
            st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('<div class="panel">', unsafe_allow_html=True)
        section_title("Dataset preview", "The first 20 rows from the loaded dataset")
        st.dataframe(df.head(20), use_container_width=True, hide_index=True)
        st.download_button("Download dataset CSV", df.to_csv(index=False).encode("utf-8"), "customer_marketing_dataset.csv", "text/csv")
        st.markdown('</div>', unsafe_allow_html=True)

    elif page == "Campaign Insights":
        section_title("Campaign insights", "Explore actual response rates across campaign variables.")
        c1, c2 = st.columns(2)
        options = ["contact", "job", "education", "marital", "month", " poutcome".strip()]
        with c1:
            group_col = st.selectbox("Group responses by", options, index=0)
        with c2:
            top_n = st.slider("Number of categories to show", 5, 15, 10)
        response = df.groupby(group_col).agg(
            Customers=("y", "size"),
            Responses=("y", lambda s: int((s == "yes").sum())),
            Response_Rate=("y", lambda s: (s == "yes").mean() * 100),
        ).sort_values("Response_Rate", ascending=False).head(top_n)
        left, right = st.columns([1, 1])
        with left:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            st.markdown("**Response rate by category**")
            st.bar_chart(response["Response_Rate"], color="#a184ed")
            st.caption("Response rates are descriptive; they do not establish causation.")
            st.markdown('</div>', unsafe_allow_html=True)
        with right:
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            st.markdown("**Campaign response table**")
            show = response.copy()
            show["Response_Rate"] = show["Response_Rate"].map(lambda x: f"{x:.2f}%")
            st.dataframe(show, use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)
        st.caption("Dataset note: this is the public UCI Bank Marketing dataset, not a general retail point-of-sale dataset.")

    elif page == "Model Comparison":
        section_title("Model comparison", "Train and evaluate Logistic Regression, Decision Tree, and KNN.")
        with st.expander("Model settings", expanded=True):
            a, b, c = st.columns(3)
            test_pct = a.slider("Test data (%)", 10, 35, 20, 5)
            tree_depth = b.slider("Decision Tree max depth", 2, 20, 8)
            knn_neighbors = c.slider("KNN neighbors", 3, 21, 7, 2)
            seed = st.number_input("Random seed", min_value=0, max_value=9999, value=42)
        if st.button("Train / retrain models", type="primary"):
            train_models.clear()
            st.session_state["trained_config"] = (test_pct, tree_depth, knn_neighbors, int(seed))
        config = st.session_state.get("trained_config")
        if config is None:
            st.info("Models have not been trained in this session. Choose settings and click **Train / retrain models** to calculate real metrics.")
        else:
            with st.spinner("Training and evaluating models..."):
                fitted, metrics, X_test, y_test, predictions, num_features, cat_features = train_models(
                    config[0] / 100, config[3], config[1], config[2]
                )
            cols = st.columns(3)
            for i, row in metrics.reset_index(drop=True).iterrows():
                with cols[i]:
                    st.markdown('<div class="panel">', unsafe_allow_html=True)
                    st.markdown(f"#### {row['Model']}")
                    st.markdown('<span class="pill">Evaluated on test data</span>', unsafe_allow_html=True)
                    st.metric("Accuracy", f"{row['Accuracy']:.1%}")
                    st.metric("Precision", f"{row['Precision']:.1%}")
                    st.metric("Recall", f"{row['Recall']:.1%}")
                    st.metric("F1-score", f"{row['F1-score']:.1%}")
                    st.markdown('</div>', unsafe_allow_html=True)
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            section_title("Metric comparison", "Higher is not always better in isolation; consider the business objective and class imbalance.")
            chart = metrics.set_index("Model")[["Accuracy", "Precision", "Recall", "F1-score"]]
            st.bar_chart(chart, y=["Accuracy", "Precision", "Recall", "F1-score"])
            st.dataframe(metrics.style.format({
                "Accuracy": "{:.3f}", "Precision": "{:.3f}", "Recall": "{:.3f}", "F1-score": "{:.3f}"
            }), use_container_width=True, hide_index=True)
            st.download_button("Download model metrics CSV", metrics.to_csv(index=False).encode("utf-8"), "model_comparison.csv", "text/csv")
            st.markdown('</div>', unsafe_allow_html=True)

            model_choice = st.selectbox("View confusion matrix", list(fitted.keys()))
            fig, ax = plt.subplots(figsize=(5, 4))
            ConfusionMatrixDisplay.from_predictions(
                y_test, predictions[model_choice],
                display_labels=["No subscription", "Subscription"],
                cmap="Purples", values_format="d", ax=ax
            )
            ax.set_title(f"Confusion Matrix — {model_choice}")
            st.pyplot(fig, use_container_width=False)
            plt.close(fig)
            st.caption("Metrics are computed when you train the models; they are not hard-coded. `duration` is excluded because it is only known after a call and could leak information into a pre-call prediction.")

    elif page == "Predict":
        section_title("Predict campaign response", "Train the models first, then enter customer details to get a model prediction.")
        config = st.session_state.get("trained_config")
        if config is None:
            st.warning("Go to **Model Comparison** and click **Train / retrain models** first.")
        else:
            with st.spinner("Preparing trained models..."):
                fitted, metrics, X_test, y_test, predictions, num_features, cat_features = train_models(
                    config[0] / 100, config[3], config[1], config[2]
                )
            df_for_options = df.drop(columns=["y", "duration"], errors="ignore")
            st.markdown('<div class="panel">', unsafe_allow_html=True)
            with st.form("prediction_form"):
                left, right = st.columns(2)
                user_input = {}
                for i, col in enumerate(df_for_options.columns):
                    target = left if i % 2 == 0 else right
                    with target:
                        if pd.api.types.is_numeric_dtype(df_for_options[col]):
                            median = float(df_for_options[col].median())
                            minv = float(df_for_options[col].min())
                            maxv = float(df_for_options[col].max())
                            user_input[col] = st.number_input(
                                col.replace("_", " ").title(),
                                min_value=minv, max_value=maxv, value=median
                            )
                        else:
                            vals = df_for_options[col].dropna().astype(str).unique().tolist()
                            vals = sorted(vals)
                            user_input[col] = st.selectbox(col.replace("_", " ").title(), vals)
                chosen_model = st.selectbox("Model", list(fitted.keys()))
                submitted = st.form_submit_button("Predict response")
            if submitted:
                sample = pd.DataFrame([user_input], columns=df_for_options.columns)
                for col in cat_features:
                    sample[col] = sample[col].astype(str)
                pred = int(fitted[chosen_model].predict(sample)[0])
                if hasattr(fitted[chosen_model].named_steps["model"], "predict_proba"):
                    prob = float(fitted[chosen_model].predict_proba(sample)[0][1])
                    st.success(f"Prediction: **{'Likely to subscribe' if pred == 1 else 'Unlikely to subscribe'}**")
                    st.progress(prob)
                    st.write(f"Estimated subscription probability: **{prob:.1%}**")
                else:
                    st.success(f"Prediction: **{'Likely to subscribe' if pred == 1 else 'Unlikely to subscribe'}**")
                st.caption("This is an educational prediction based on the public dataset and trained model, not a guarantee of customer behaviour.")
            st.markdown('</div>', unsafe_allow_html=True)

    elif page == "About":
        section_title("About this project", "An interactive machine learning project built for learning and portfolio demonstration.")
        st.markdown("""
        <div class="panel">
        <h3>Project objective</h3>
        Explore customer and campaign attributes and compare three classification algorithms for predicting whether a customer subscribed after a marketing campaign.
        <h3>Machine learning workflow</h3>
        Data loading → exploration → preprocessing → train/test split → model training → evaluation → prediction.
        <h3>Algorithms</h3>
        <b>Logistic Regression</b> — a linear classification baseline. <br>
        <b>Decision Tree</b> — learns decision rules from features. <br>
        <b>K-Nearest Neighbors (KNN)</b> — predicts based on nearby examples in feature space.
        <h3>Dataset and limitations</h3>
        Uses the public UCI Bank Marketing dataset. It is marketing data from a banking context, not a general retail sales dataset. Observed associations are not causal, and the model should not be used for consequential real-world decisions without validation.
        </div>
        """, unsafe_allow_html=True)
        st.markdown("[Open the official UCI dataset page](https://archive.ics.uci.edu/dataset/222/bank+marketing)")

    st.markdown("---")
    st.markdown('<div class="small-muted">Customer Retail ML · Built with Python, Streamlit, Pandas, Matplotlib and Scikit-learn · Metrics are calculated from the dataset when models are trained.</div>', unsafe_allow_html=True)


if __name__ == "__main__":
    main()
