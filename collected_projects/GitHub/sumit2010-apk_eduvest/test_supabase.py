
import os
import streamlit as st
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

st.title("EduVest - Supabase Connection Test")

if not url or not key:
    st.error("Credentials missing. Check your .env file.")
    st.stop()

try:
    supabase = create_client(url, key)
    st.success("Supabase client initialized successfully!")

    response = (
        supabase.table("wallets")
        .select("user_id")
        .limit(1)
        .execute()
    )

    st.success("Database access successful!")
    st.write("Wallet records returned:", len(response.data))

except Exception:
    st.error(
        "Database request failed. "
        "Check your Supabase table permissions and configuration."
    )
    st.caption(
        "Check the PowerShell terminal for diagnostic details. "
        "Do not share your credentials."
    )
