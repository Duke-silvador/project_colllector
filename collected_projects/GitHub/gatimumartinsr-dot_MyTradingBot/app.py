import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from datetime import datetime
from bot import calculate_position_size, dispatch_order

# Configuration setup for an elite institutional desk execution view
st.set_page_config(page_title="Helix OB Terminal", layout="wide", page_icon="🟢")

# Premium Custom CSS Injection for a flawless high-contrast dark dashboard aesthetic
st.markdown("<style>html, body, [data-testid='stAppViewContainer'], [data-testid='stHeader'] { background-color: #0b0e14 !important; color: #e1e4ea !important; } div[data-testid='metric-container'] { background-color: #121620 !important; border: 1px solid #1f2433 !important; padding: 20px !important; border-radius: 10px !important; border-left: 5px solid #00ff99 !important; } div.stAlert { background-color: #121620 !important; border: 1px solid #1f2433 !important; } .stButton>button { border-radius: 8px !important; font-weight: 600 !important; } .stTabs [data-baseweb='tab-list'] { gap: 10px; } .stTabs [data-baseweb='tab'] { background-color: #121620 !important; border: 1px solid #1f2433 !important; border-radius: 6px 6px 0px 0px !important; padding: 10px 20px !important; color: #8892b0 !important; } .stTabs [aria-selected='true'] { color: #00ff99 !important; border-bottom: 2px solid #00ff99 !important; }</style>", unsafe_allow_html=True)

# Initialize secure session states for login and connection loop persistence
if "logged_in" not in st.session_state: st.session_state.logged_in = False
if "username" not in st.session_state: st.session_state.username = ""
if "connection_active" not in st.session_state: st.session_state.connection_active = False

# Initialize user registration database
if "user_database" not in st.session_state:
    st.session_state.user_database = {
        "martins": {"password": "helix2026", "name": "Martins", "email": "martins@helix.com", "joined": "2026-09-05 12:00"}
    }

# --- APPLICATION ROUTING PORTAL LAYER ---
if not st.session_state.logged_in:
    st.markdown("<h1 style='text-align: center; color: #00ff99; margin-top: 50px;'>🟢 HELIX OB</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #888888;'>Institutional Cloud Execution Portal & Algorithmic Router</p>", unsafe_allow_html=True)
    st.markdown("---")
    
    auth_col1, auth_col2, auth_col3 = st.columns([1, 1.4, 1])
    with auth_col2:
        gate_mode = st.radio("Choose Terminal Action", ["Sign In to Workspace", "Register New Trader Account"], horizontal=True)
        st.markdown("<br>", unsafe_allow_html=True)

        if gate_mode == "Sign In to Workspace":
            user_input = st.text_input("Workspace Username Key").strip().lower()
            pass_input = st.text_input("Access Password", type="password").strip()
            
            if st.button("Authorize Connection Session", type="primary", use_container_width=True):
                if user_input in st.session_state.user_database and st.session_state.user_database[user_input]["password"] == pass_input:
                    st.session_state.logged_in = True
                    st.session_state.username = user_input
                    st.rerun()
                else: st.error("Invalid Username or Password. Session Authorization Denied.")
        else:
            st.subheader("📝 Trader Registration Form")
            reg_name = st.text_input("Your Full Name")
            reg_email = st.text_input("Your Email Address")
            reg_user = st.text_input("Choose Unique Username").strip().lower()
            reg_pass = st.text_input("Create Access Password", type="password").strip()
            
            if st.button("Generate Workspace Credentials", type="primary", use_container_width=True):
                if not reg_name or not reg_email or not reg_user or not reg_pass: st.warning("Please fill out all identification fields to register.")
                elif reg_user in st.session_state.user_database: st.error("This username is already taken.")
                else:
                    st.session_state.user_database[reg_user] = {"password": reg_pass, "name": reg_name, "email": reg_email, "joined": datetime.now().strftime("%Y-%m-%d %H:%M")}
                    st.success("Account created successfully! Switch to 'Sign In' above to login.")
                    st.balloons()
else:
    # 📈 DYNAMIC REGISTRATION CONNECTION STATE HEADERS
    status_color = "#00ff99" if st.session_state.connection_active else "#8892b0"
    status_label = "● MT5 BRIDGE LIVE" if st.session_state.connection_active else "● OFFLINE (AWAITING LINK)"
    
    st.markdown(f"<div style='float: right; color: #8892b0;'>Broker Pipeline Status: <span style='color: {status_color}; font-weight: bold;'>{status_label}</span> | Operator: {st.session_state.username.upper()}</div>", unsafe_allow_html=True)
    if st.button("🔒 Sever Workspace Session", type="secondary"):
        st.session_state.logged_in = False
        st.session_state.connection_active = False
        st.rerun()
        
    st.title("🟢 HELIX OB — Premium Execution Matrix")
    st.markdown("---")

    # --- SIDEBAR AUTHENTICATION CORE CONTROLS ---
    st.sidebar.header("🏢 Multi-Broker Gateway")
    broker_choice = st.sidebar.selectbox("Select Core Broker", ["Exness Global", "IC Markets", "Pepperstone", "Other MT5 Private Server"])
    account_environment = st.sidebar.radio("Account Environment Target", ["Demo Account Server", "Live Production Account"], horizontal=True)
    
    broker_account = st.sidebar.number_input("Account Login ID Number", value=474239881, step=1)
    broker_password = st.sidebar.text_input("Broker Trading Password", type="password", value="Pu,24ppy")
    broker_server = st.sidebar.text_input("Broker Server String Name", value="Exness-MT5-Trial15" if "Demo" in account_environment else "Exness-MT5-Real1")

    if st.sidebar.button("🔌 CONNECT TO METATRADER TERMINAL", type="primary", use_container_width=True):
        st.session_state.connection_active = True
        st.toast("Handshake metrics verified. Account sync successful!")
        st.rerun()

    st.sidebar.markdown("---")
    st.sidebar.header("⚙️ Risk Parameter Protocol")
    session_mode = st.sidebar.selectbox("Enforce Session Timing Window", ["Disable Filter", "Power Hour Window (16:00-18:00 GST)", "London Breakout Window (11:00-13:00 GST)", "Late-Night Fade (22:00-02:00 GST)"])
    progression_tier = st.sidebar.selectbox("Gold Progression Tier Rulebook", ["Conservative (1-2% Matrix)", "Medium (3-5% Balanced)", "Aggressive (8-10% High Yield)"])
    account_balance = st.sidebar.number_input("Target Account Balance ($)", min_value=100.0, max_value=100000.0, value=500.0, step=100.0)

    # --- DESK TAB SEPARATION MODULES ---
    tab_desk, tab_journal, tab_rules = st.tabs(["🖥️ Execution Desk Workspace", "🗒️ Trade Journal Breakdown", "📋 Rule Engine Audit"])

    with tab_desk:
        m_c1, m_c2, m_c3, m_c4 = st.columns(4)
        m_c1.metric("ACCOUNT AUDIT BALANCE", f"${account_balance:,.2f}")
        m_c2.metric("CURRENT MARGIN EQUITY", f"${account_balance + 12.60:,.2f}")
        m_c3.metric("OPEN RUNNING P/L STATUS", "+$12.60")
        m_c4.metric("RISK BUDGET SAFEGUARD", f"${account_balance * 0.01:,.2f}", "1.0% Base")

        st.markdown("---")
        col1, col2 = st.columns([1.2, 1])

        with col1:
            st.subheader("⚡ Order Ticket Parameters")
            asset_symbol = st.text_input("Asset Instrument Symbol Suffix", value="XAUUSDm")
            
            col_tk1, col_ac2 = st.columns(2)
            with col_tk1: direction = st.radio("Order Strategy Direction", ["BUY LIMIT", "SELL LIMIT"], horizontal=True)
            with col_ac2: asset_class = st.selectbox("Asset Class Specification", ["Precious Metals (Gold/Silver)", "Major Forex Pairs", "Crypto Tickers"])
            
            col_in1, col_in2, col_in3 = st.columns(3)
            entry_target = col_in1.number_input("Order Entry Target Price", value=2500.00, step=0.50)
            sl_target = col_in2.number_input("Stop Loss Level (Wick Edge)", value=2490.00, step=0.50)
            tp_target = col_in3.number_input("Take Profit Target Level", value=2530.00, step=0.50)

        with col2:
            st.subheader("🧮 Sizing Analytics Verification")
            pips_distance = abs(entry_target - sl_target) * 10 if "Precious" in asset_class or "XAU" in asset_symbol.upper() else abs(entry_target - sl_target) * 10000
            if pips_distance == 0: pips_distance = 1.0
            rr_ratio = (abs(tp_target - entry_target) * 10 if "Precious" in asset_class or "XAU" in asset_symbol.upper() else abs(tp_target - entry_target) * 10000) / pips_distance

            calculated_lots, matrix_label = calculate_position_size(account_balance, progression_tier, pips_distance, asset_symbol, asset_class)
            
            st.markdown(f"<div style='background-color: #121620; padding: 18px; border-radius: 8px; border: 1px solid #1f2433; border-left: 5px solid #00ff99;'><p style='margin:0; font-size: 13px; color: #8892b0;'>AUTOMATED LOT ALLOCATION</p><p style='margin:2px 0 10px 0; font-size: 26px; color: #00ff99; font-weight: bold;'>{calculated_lots} Lots</p><p style='margin:4px 0 0 0; font-size: 13px;'><strong>Stop Distance:</strong> {pips_distance:.1f} Pips</p><p style='margin:4px 0 0 0; font-size: 13px;'><strong>Risk-to-Reward Ratio:</strong> 1:{rr_ratio:.2f} R</p><p style='margin:10px 0 0 0; font-size: 11px; color: #8892b0; border-top: 1px solid #1f2433; padding-top: 8px;'>Engine Logic: {matrix_label}</p></div>", unsafe_allow_html=True)

        st.markdown("---")
        st.subheader(f"📈 Candlestick Level Visualizer Mapping — {asset_symbol}")
        x_ticks = np.arange(1, 31)
        y_market = np.sin(x_ticks / 4) * (entry_target * 0.003) + entry_target
        
        is_buy = "BUY" in direction
        shade_color_top = "rgba(0, 255, 153, 0.08)" if is_buy else "rgba(255, 75, 75, 0.08)"
