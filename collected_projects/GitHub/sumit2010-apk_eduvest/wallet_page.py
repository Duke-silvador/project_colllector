
import os
import streamlit as st
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

st.set_page_config(
    page_title="EduVest | Virtual Wallet",
    page_icon="💰",
    layout="wide",
)

st.title("EduVest Virtual Wallet")
st.caption("Practice trading with virtual money — no real funds involved.")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    st.error("Supabase configuration is missing. Check your .env file.")
    st.stop()

# A login session is required before accessing a wallet.
user_id = st.session_state.get("eduvest_user_id")
access_token = st.session_state.get("eduvest_access_token")

if not user_id or not access_token:
    st.warning("Please log in through the EduVest authentication page first.")
    st.code("streamlit run auth_page.py --server.port 8501")
    st.stop()

try:
    supabase = create_client(url, key)

    # Apply the authenticated user's JWT to database requests.
    supabase.postgrest.auth(access_token)

    response = (
        supabase.table("wallets")
        .select("cash_balance, created_at, updated_at")
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    wallet = response.data
    balance = float(wallet["cash_balance"])

    st.success("Wallet loaded successfully.")

    col1, col2 = st.columns(2)

    with col1:
        st.metric(
            "Available Cash",
            f"₹{balance:,.2f}",
        )

    with col2:
        st.metric(
            "Starting Balance",
            "₹1,00,000.00",
        )

    st.caption(
        "This is your cash balance. Portfolio holdings and profit/loss "
        "will be added after the trading engine is implemented."
    )

    with st.expander("Wallet details"):
        st.write("Student ID:", user_id)
        st.write("Created at:", wallet["created_at"])
        st.write("Last updated:", wallet["updated_at"])

except Exception:
    st.error(
        "Could not load your wallet. Check your login session "
        "and database permissions."
    )
