"""
Customer Churn Prediction App
------------------------------
Task 03 - End-to-End Machine Learning Project
Devixo Solutions | AI/ML Internship

Loads a pre-trained Random Forest model (see notebook/Task_03_ML.ipynb for
the full training pipeline: data prep, feature engineering, model
comparison, and hyperparameter tuning) and serves predictions through a
simple web interface.
"""

import warnings
warnings.filterwarnings("ignore")  # silences sklearn version-mismatch / pandas deprecation noise

import streamlit as st
import pandas as pd
import joblib
from pathlib import Path

# --------------------------------------------------------------------------
# Page configuration
# --------------------------------------------------------------------------
st.set_page_config(
    page_title="Customer Churn Predictor",
    page_icon="📉",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --------------------------------------------------------------------------
# Load model artifacts (cached so this only runs once per session)
# --------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent

@st.cache_resource
def load_artifacts():
    model = joblib.load(BASE_DIR / "best_churn_model.joblib")
    scaler = joblib.load(BASE_DIR / "scaler.joblib")
    columns = joblib.load(BASE_DIR / "model_columns.joblib")
    return model, scaler, columns

try:
    model, scaler, model_columns = load_artifacts()
except FileNotFoundError:
    st.error(
        "⚠️ Model files not found. Make sure `best_churn_model.joblib`, "
        "`scaler.joblib`, and `model_columns.joblib` are in the same "
        "folder as this app.py file."
    )
    st.stop()

SERVICE_COLS = [
    "PhoneService", "MultipleLines", "OnlineSecurity", "OnlineBackup",
    "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies"
]
NUMERIC_COLS = ["tenure", "MonthlyCharges", "TotalCharges", "TotalServices", "AvgMonthlySpend"]

# --------------------------------------------------------------------------
# Sidebar
# --------------------------------------------------------------------------
with st.sidebar:
    st.markdown("## 📉 Churn Predictor")
    st.caption("Maryam Khan")
    st.caption("Task 03 · AI/ML Internship · Devixo Solutions")
    st.markdown("---")
    st.markdown("**Model**")
    st.write("Random Forest Classifier")
    st.write("Tuned via GridSearchCV, 5-fold CV")
    st.markdown("**Dataset**")
    st.write("Telco Customer Churn")
    st.write("7,043 customers · 21 attributes")
    st.markdown("---")
    st.markdown(
        "This app is a demo interface for a churn-prediction model "
        "trained end-to-end: data cleaning, feature engineering, "
        "model comparison, and hyperparameter tuning. See the "
        "accompanying notebook and report for full methodology."
    )
    st.markdown("---")
    st.caption("Developed by Maryam Khan · AI/ML Internship Project")

# --------------------------------------------------------------------------
# Header
# --------------------------------------------------------------------------
st.title("Customer Churn Prediction")
st.write(
    "Estimate the likelihood that a telecom customer will churn, "
    "based on their account, billing, and service details."
)
st.markdown("---")

# --------------------------------------------------------------------------
# Input form
# --------------------------------------------------------------------------
with st.form("churn_form"):
    st.subheader("Customer Profile")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("**Demographics**")
        gender = st.selectbox("Gender", ["Male", "Female"])
        senior_citizen = st.selectbox("Senior Citizen", [0, 1], format_func=lambda x: "Yes" if x else "No")
        partner = st.selectbox("Partner", ["Yes", "No"])
        dependents = st.selectbox("Dependents", ["Yes", "No"])

    with col2:
        st.markdown("**Account**")
        tenure = st.slider("Tenure (months)", 0, 72, 12)
        contract = st.selectbox("Contract", ["Month-to-month", "One year", "Two year"])
        paperless_billing = st.selectbox("Paperless Billing", ["Yes", "No"])
        payment_method = st.selectbox(
            "Payment Method",
            ["Electronic check", "Mailed check", "Bank transfer (automatic)", "Credit card (automatic)"]
        )

    with col3:
        st.markdown("**Billing**")
        monthly_charges = st.number_input("Monthly Charges ($)", min_value=0.0, value=70.0, step=1.0)
        total_charges = st.number_input("Total Charges ($)", min_value=0.0, value=800.0, step=10.0)

    st.markdown("**Services**")
    scol1, scol2, scol3, scol4 = st.columns(4)

    with scol1:
        phone_service = st.selectbox("Phone Service", ["Yes", "No"])
        multiple_lines = st.selectbox("Multiple Lines", ["Yes", "No", "No phone service"])

    with scol2:
        internet_service = st.selectbox("Internet Service", ["DSL", "Fiber optic", "No"])
        online_security = st.selectbox("Online Security", ["Yes", "No", "No internet service"])

    with scol3:
        online_backup = st.selectbox("Online Backup", ["Yes", "No", "No internet service"])
        device_protection = st.selectbox("Device Protection", ["Yes", "No", "No internet service"])

    with scol4:
        tech_support = st.selectbox("Tech Support", ["Yes", "No", "No internet service"])
        streaming_tv = st.selectbox("Streaming TV", ["Yes", "No", "No internet service"])

    streaming_movies = st.selectbox("Streaming Movies", ["Yes", "No", "No internet service"])

    submitted = st.form_submit_button("Predict Churn", type="primary", use_container_width=True)

# --------------------------------------------------------------------------
# Preprocessing 
# --------------------------------------------------------------------------
def preprocess_input(raw: dict) -> pd.DataFrame:
    df = pd.DataFrame([raw])

    df["TotalServices"] = sum((df[c] == "Yes").astype(int) for c in SERVICE_COLS)
    df["AvgMonthlySpend"] = df["TotalCharges"] / df["tenure"].replace(0, 1)

    cat_cols = df.select_dtypes(include=["object"]).columns.tolist()
    df_encoded = pd.get_dummies(df, columns=cat_cols, drop_first=False)
    df_encoded = df_encoded.reindex(columns=model_columns, fill_value=0)

    df_encoded[NUMERIC_COLS] = scaler.transform(df_encoded[NUMERIC_COLS])
    return df_encoded

# --------------------------------------------------------------------------
# Prediction & result display
# --------------------------------------------------------------------------
if submitted:
    raw_input = {
        "gender": gender, "SeniorCitizen": senior_citizen, "Partner": partner,
        "Dependents": dependents, "tenure": tenure, "PhoneService": phone_service,
        "MultipleLines": multiple_lines, "InternetService": internet_service,
        "OnlineSecurity": online_security, "OnlineBackup": online_backup,
        "DeviceProtection": device_protection, "TechSupport": tech_support,
        "StreamingTV": streaming_tv, "StreamingMovies": streaming_movies,
        "Contract": contract, "PaperlessBilling": paperless_billing,
        "PaymentMethod": payment_method, "MonthlyCharges": monthly_charges,
        "TotalCharges": total_charges
    }

    try:
        processed = preprocess_input(raw_input)
        prediction = model.predict(processed)[0]
        probability = model.predict_proba(processed)[0][1]
    except Exception as e:
        st.error(f"Something went wrong while generating the prediction: {e}")
        st.stop()

    st.markdown("---")
    st.subheader("Prediction Result")

    rcol1, rcol2 = st.columns([1, 2])

    with rcol1:
        if prediction == 1:
            st.error("⚠️ Likely to Churn")
        else:
            st.success("✅ Likely to Stay")
        st.metric("Churn Probability", f"{probability:.1%}")

    with rcol2:
        st.progress(probability)
        if prediction == 1:
            st.write(
                "This profile shares traits with past churners in the training "
                "data — commonly short tenure, a month-to-month contract, or "
                "fiber optic internet with electronic check payments."
            )
        else:
            st.write(
                "This profile shares traits with retained customers — "
                "commonly longer tenure and longer-term contracts."
            )

    with st.expander("View processed model input"):
        st.dataframe(processed)

st.markdown("---")
st.caption("Model: Random Forest · scikit-learn · Streamlit — Maryam Khan")