
import streamlit as st
from dotenv import load_dotenv
from supabase import create_client
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

st.set_page_config(
    page_title="EduVest | Student Access",
    page_icon="📈",
    layout="centered",
)

st.title("EduVest")
st.caption("Student Investment Analytics & Virtual Trading")

if not SUPABASE_URL or not SUPABASE_KEY:
    st.error("Supabase configuration is missing. Check your .env file.")
    st.stop()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

mode = st.radio(
    "Choose an option",
    ["Login", "Register"],
    horizontal=True,
)

with st.form("auth_form"):
    email = st.text_input("Email address")
    password = st.text_input(
        "Password",
        type="password",
    )

    submitted = st.form_submit_button(
        mode,
        use_container_width=True,
    )

if submitted:
    if not email.strip() or not password:
        st.error("Please enter your email and password.")
    else:
        try:
            if mode == "Register":
                response = supabase.auth.sign_up({
                    "email": email.strip(),
                    "password": password,
                })

                if response.user is None:
                    st.error("Registration could not be completed.")
                elif response.session is None:
                    st.success(
                        "Registration submitted. "
                        "Check your email to confirm your account, "
                        "then log in."
                    )
                else:
                    st.success(
                        "Registration successful! "
                        "Your session is active."
                    )

            else:
                response = supabase.auth.sign_in_with_password({
                    "email": email.strip(),
                    "password": password,
                    "options": {
                        "email_redirect_to": "http://localhost:8501"
                    }
                })

                if response.session:
                    st.session_state["eduvest_access_token"] = (
                        response.session.access_token
                    )
                    st.session_state["eduvest_user_id"] = (
                        str(response.user.id)
                    )
                    st.success("Login successful!")
                    st.info(
                        "Your authenticated session is ready. "
                        "The wallet page will be connected next."
                    )

        except Exception:
            st.error(
                "Authentication failed. Check your credentials, "
                "email confirmation status, and Supabase settings."
            )
