
import os

import streamlit as st
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()


def get_supabase_client():
    """Create a Supabase client using project configuration."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        raise RuntimeError(
            "Supabase configuration is missing. Check your .env file."
        )

    return create_client(url, key)


def check_session_diagnostic():
    """Check session validity without exposing credentials."""
    access_token = st.session_state.get("eduvest_access_token")
    user_id = st.session_state.get("eduvest_user_id")

    result = {
        "access_token_present": bool(access_token),
        "user_id_present": bool(user_id),
        "supabase_token_valid": False,
    }

    if not access_token or not user_id:
        return result

    try:
        client = get_supabase_client()
        response = client.auth.get_user(access_token)
        user = response.user

        result["supabase_token_valid"] = bool(
            user and str(user.id) == str(user_id)
        )
    except Exception:
        result["supabase_token_valid"] = False

    return result


def get_authenticated_client():
    """Return a Supabase client if the stored session is valid."""
    access_token = st.session_state.get("eduvest_access_token")
    user_id = st.session_state.get("eduvest_user_id")

    if not access_token or not user_id:
        return None

    try:
        client = get_supabase_client()
        client.postgrest.auth(access_token)

        response = client.auth.get_user(access_token)
        user = response.user

        if not user or str(user.id) != str(user_id):
            st.session_state.pop("eduvest_access_token", None)
            st.session_state.pop("eduvest_user_id", None)
            return None

        return client

    except Exception:
        st.session_state.pop("eduvest_access_token", None)
        st.session_state.pop("eduvest_user_id", None)
        return None
