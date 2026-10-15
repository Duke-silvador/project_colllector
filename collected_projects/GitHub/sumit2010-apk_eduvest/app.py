
import os
import uuid
from datetime import date

import pandas as pd
import plotly.express as px
import requests
import streamlit as st
from dotenv import load_dotenv

from auth_utils import (
    get_supabase_client,
    get_authenticated_client,
    check_session_diagnostic,
)

load_dotenv()


st.set_page_config(
    page_title="EduVest | Investment Research",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)


# STYLING

st.markdown(
    """
    <style>
        .stApp {
            background-color: #f7f9f7;
        }
        [data-testid="stSidebar"] {
            background-color: #edf3ee;
        }
        .main-title {
            font-size: 2.3rem;
            font-weight: 750;
            color: #173c2b;
            margin-bottom: 0;
        }
        .subtitle {
            color: #617166;
            margin-top: 0.35rem;
        }
        .disclaimer {
            background: #fff8e7;
            border-left: 4px solid #d9a441;
            padding: 12px;
            border-radius: 4px;
            color: #604b20;
        }
    </style>
    """,
    unsafe_allow_html=True,
)


# API HELPERS


def get_trade_function_url():
    """Build the Supabase Edge Function URL."""
    project_url = os.getenv("SUPABASE_URL", "").strip()

    if not project_url:
        raise RuntimeError(
            "SUPABASE_URL is missing from your .env file."
        )

    return (
        f"{project_url.rstrip('/')}"
        "/functions/v1/eduvest-trade"
    )


def call_trade_function(payload):
    """Call the Edge Function with the authenticated user token."""
    access_token = st.session_state.get(
        "eduvest_access_token"
    )

    if not access_token:
        raise RuntimeError(
            "Your session has expired. Please log in again."
        )

    response = requests.post(
        get_trade_function_url(),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30,
    )

    try:
        body = response.json()
    except ValueError:
        body = {"error": response.text[:500]}

    if not response.ok:
        message = body.get(
            "error",
            f"Request failed with HTTP {response.status_code}.",
        )
        raise RuntimeError(
            f"{message} (HTTP {response.status_code})"
        )

    if not isinstance(body, dict):
        raise RuntimeError(
            "The Edge Function returned an unexpected response."
        )

    return body


def valid_symbol(symbol):
    """Validate a stock symbol before sending it to the server."""
    return (
        bool(symbol)
        and len(symbol) <= 30
        and all(
            character.isalnum() or character in ".-"
            for character in symbol
        )
    )


def test_eduvest_quote(symbol="RELIANCE"):
    """Test quote retrieval without executing a trade."""
    try:
        with st.spinner("Fetching stock quote..."):
            result = call_trade_function(
                {
                    "mode": "quote",
                    "symbol": symbol,
                }
            )

        if result.get("success") is True:
            st.success("Quote test succeeded!")
            st.json(result)
        else:
            st.error("The quote request did not succeed.")
            st.json(result)

    except (requests.RequestException, RuntimeError) as exc:
        st.error(f"Quote test failed: {exc}")


def get_current_quote(symbol):
    """Get a validated quote for portfolio display."""
    result = call_trade_function(
        {
            "mode": "quote",
            "symbol": symbol,
        }
    )

    quote = result.get("quote", {})
    price = quote.get("price")

    if (
        result.get("success") is not True
        or not isinstance(price, (int, float))
        or isinstance(price, bool)
        or price <= 0
    ):
        raise RuntimeError("A valid quote was not returned.")

    return float(price)


def save_portfolio_snapshot(
    client,
    user_id,
    cash_balance,
    invested_cost,
    holdings_market_value,
):
    """Save or update today's portfolio snapshot."""
    total_value = cash_balance + holdings_market_value
    unrealized_pnl = holdings_market_value - invested_cost

    snapshot = {
        "user_id": user_id,
        "snapshot_date": date.today().isoformat(),
        "cash_balance": round(cash_balance, 2),
        "invested_cost": round(invested_cost, 2),
        "holdings_market_value": round(
            holdings_market_value, 2
        ),
        "total_portfolio_value": round(total_value, 2),
        "unrealized_pnl": round(unrealized_pnl, 2),
    }

    return (
        client.table("portfolio_snapshots")
        .upsert(
            snapshot,
            on_conflict="user_id,snapshot_date",
        )
        .execute()
    )



# SIDEBAR


st.sidebar.title("EduVest")
st.sidebar.caption("Student Investment Research")


# AUTHENTICATION


client = None

try:
    client = get_authenticated_client()
except Exception:
    st.session_state.pop("eduvest_access_token", None)
    st.session_state.pop("eduvest_user_id", None)

if client is None:
    st.title("Welcome to EduVest")
    st.write(
        "Sign in or create your student account to continue."
    )

    mode = st.radio(
        "Account",
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
            st.error("Enter your email and password.")
        else:
            try:
                supabase = get_supabase_client()

                if mode == "Register":
                    response = supabase.auth.sign_up(
                        {
                            "email": email.strip(),
                            "password": password,
                            "options": {
                                "email_redirect_to": (
                                    "http://localhost:8501"
                                ),
                            },
                        }
                    )

                    if response.user and response.session:
                        st.session_state[
                            "eduvest_access_token"
                        ] = response.session.access_token

                        st.session_state[
                            "eduvest_user_id"
                        ] = str(response.user.id)

                        st.success("Registration successful!")
                        st.rerun()

                    elif response.user:
                        st.success(
                            "Registration submitted. Confirm your "
                            "email, then return here and log in."
                        )
                    else:
                        st.error(
                            "Registration could not be completed."
                        )

                else:
                    response = (
                        supabase.auth.sign_in_with_password(
                            {
                                "email": email.strip(),
                                "password": password,
                            }
                        )
                    )

                    if response.session and response.user:
                        st.session_state[
                            "eduvest_access_token"
                        ] = response.session.access_token

                        st.session_state[
                            "eduvest_user_id"
                        ] = str(response.user.id)

                        st.rerun()
                    else:
                        st.error(
                            "Login failed. Please try again."
                        )

            except Exception as exc:
                import logging
                import re

                error_message = str(exc)

                error_message = re.sub(
                    r"(?i)(access_token|refresh_token|api[_-]?key|"
                    r"authorization|password|secret)\s*[:=]\s*['\"]?[^,\s'\"]+",
                    r"\1=[REDACTED]",
                    error_message,
                )
                error_message = re.sub(
                    r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",
                    "[REDACTED_TOKEN]",
                    error_message,
                )

                logging.error(
                    "EduVest authentication failed (%s): %s",
                    type(exc).__name__,
                    error_message[:300],
                )

                st.error(
                    f"Authentication failed ({type(exc).__name__}). "
                    "Check the app logs for diagnostic details."
                )

    st.stop()



# AUTHENTICATED DASHBOARD


st.sidebar.success("Signed in")

if st.sidebar.button("Log out"):
    try:
        client.auth.sign_out()
    except Exception:
        pass

    st.session_state.pop("eduvest_access_token", None)
    st.session_state.pop("eduvest_user_id", None)
    st.session_state.pop("eduvest_trade_preview", None)
    st.rerun()

# SESSION DIAGNOSTICS

with st.sidebar.expander("Session diagnostics"):
    try:
        diagnostic = check_session_diagnostic()

        st.write(
            "Access token present:",
            diagnostic["access_token_present"],
        )
        st.write(
            "User ID present:",
            diagnostic["user_id_present"],
        )
        st.write(
            "Supabase token valid:",
            diagnostic["supabase_token_valid"],
        )
    except Exception:
        st.warning(
            "Session diagnostics could not be completed."
        )



# NAVIGATION — FIXED


def navigate_to(page_name):
    """Change navigation from Overview using a callback."""
    st.session_state["eduvest_navigation"] = page_name


page = st.sidebar.radio(
    "Navigation",
    [
        "Overview",
        "Market Analytics",
        "Forecast Lab",
        "Paper Trading",
        "Explore Stocks",
    ],
    key="eduvest_navigation",
)


# PAGE HEADER


st.markdown(
    '<p class="main-title">EduVest</p>',
    unsafe_allow_html=True,
)

st.markdown(
    '<p class="subtitle">'
    "Investment analytics and forecasting for students"
    "</p>",
    unsafe_allow_html=True,
)

st.markdown(
    '<div class="disclaimer">'
    "<strong>Educational simulation only.</strong> "
    "Market prices and forecasts are informational, not "
    "investment advice. Paper trading uses no real money."
    "</div>",
    unsafe_allow_html=True,
)

st.divider()


# WALLET RETRIEVAL


balance = None
wallet = None

if page in ["Overview", "Paper Trading"]:
    try:
        wallet_result = (
            client.table("wallets")
            .select("cash_balance, created_at, updated_at")
            .eq(
                "user_id",
                st.session_state["eduvest_user_id"],
            )
            .single()
            .execute()
        )

        wallet = wallet_result.data

        if wallet:
            balance = float(wallet["cash_balance"])

    except Exception:
        st.error(
            "Your wallet could not be loaded. "
            "No balance was changed."
        )



# OVERVIEW DASHBOARD


if page == "Overview":
    st.subheader("Investment Dashboard")
    st.caption(
        "Your workspace for market research, forecasting, "
        "and virtual portfolio management."
    )

    if balance is not None:
        overview_col1, overview_col2, overview_col3 = (
            st.columns(3)
        )

        overview_col1.metric(
            "Available Virtual Cash",
            f"₹{balance:,.2f}",
        )
        overview_col2.metric(
            "Trading Mode",
            "Paper Trading",
        )
        overview_col3.metric(
            "Account Status",
            "Active",
        )

    st.divider()
    st.subheader("Explore EduVest")

    card1, card2, card3 = st.columns(3)

    with card1:
        st.markdown("### 📊 Market Analytics")
        st.write(
            "Explore stock prices and market trends "
            "to support your research."
        )
        st.button(
            "Explore Markets",
            use_container_width=True,
            on_click=navigate_to,
            args=("Market Analytics",),
        )

    with card2:
        st.markdown("### 🔮 Forecast Lab")
        st.write(
            "Explore forecasting models and compare "
            "their predictions."
        )
        st.button(
            "Open Forecast Lab",
            use_container_width=True,
            on_click=navigate_to,
            args=("Forecast Lab",),
        )

    with card3:
        st.markdown("### 💼 Paper Trading")
        st.write(
            "Manage virtual trades, review holdings, "
            "and track portfolio performance."
        )
        st.button(
            "Open Portfolio",
            use_container_width=True,
            on_click=navigate_to,
            args=("Paper Trading",),
        )

    st.divider()
    st.subheader("Getting Started")

    st.markdown(
        """
        - **Research:** Explore market information.
        - **Forecast:** Compare model predictions with available data.
        - **Practice:** Use virtual cash to test trading strategies.
        - **Review:** Track holdings, portfolio value, and concentration.
        """
    )

    st.info(
        "EduVest is an educational simulation. "
        "Market information and model forecasts are not investment advice."
    )
elif page == "Explore Stocks":
    from stock_explorer import render_stock_explorer
    render_stock_explorer()
elif page == "Market Analytics":
    from market_data import render_market_analytics
    render_market_analytics()

elif page == "Forecast Lab":
    from forecast_lab import render_forecast_lab
    render_forecast_lab()

elif page == "Paper Trading":
    st.subheader("Paper Trading Wallet")

    user_id = st.session_state["eduvest_user_id"]

    if balance is None:
        st.warning(
            "Your wallet is unavailable. "
            "Please check your Supabase connection."
        )
    else:
        st.metric(
            "Available Virtual Cash",
            f"₹{balance:,.2f}",
        )
        st.caption(
            "Your virtual balance is retrieved from Supabase."
        )

        
        # MY HOLDINGS
        

        st.divider()
        st.subheader("My Holdings")
        st.caption(
            "See how your current investments are distributed "
            "across different stocks."
        )

        holdings = []
        holdings_loaded = False

        try:
            holdings_result = (
                client.table("holdings")
                .select(
                    "symbol, quantity, average_cost, updated_at"
                )
                .eq("user_id", user_id)
                .order("symbol")
                .execute()
            )
            holdings = holdings_result.data or []
            holdings_loaded = True

        except Exception:
            st.error(
                "Unable to load holdings. Check the holdings "
                "table's SELECT policy for authenticated users."
            )

        market_value_total = 0.0
        invested_value_total = 0.0
        holdings_display = []
        all_quotes_available = True

        if holdings_loaded and not holdings:
            st.info(
                "You don't have any holdings yet. "
                "Execute a paper trade to get started."
            )

        elif holdings_loaded:
            with st.spinner("Loading current stock quotes..."):
                for holding in holdings:
                    symbol = str(holding["symbol"])
                    quantity = float(holding["quantity"] or 0)
                    average_cost = float(
                        holding.get("average_cost") or 0
                    )

                    invested_value = quantity * average_cost
                    invested_value_total += invested_value
                    current_price = None

                    try:
                        current_price = get_current_quote(symbol)
                    except Exception:
                        all_quotes_available = False

                    if current_price is not None:
                        market_value = quantity * current_price
                        unrealized_pnl = (
                            market_value - invested_value
                        )
                        market_value_total += market_value
                    else:
                        market_value = None
                        unrealized_pnl = None

                    holdings_display.append(
                        {
                            "Stock": symbol,
                            "Quantity": quantity,
                            "Average Cost (₹)": round(
                                average_cost, 2
                            ),
                            "Current Price (₹)": (
                                round(current_price, 2)
                                if current_price is not None
                                else "Unavailable"
                            ),
                            "Market Value (₹)": (
                                round(market_value, 2)
                                if market_value is not None
                                else "Unavailable"
                            ),
                            "Unrealized P&L (₹)": (
                                round(unrealized_pnl, 2)
                                if unrealized_pnl is not None
                                else "Unavailable"
                            ),
                        }
                    )

            if holdings_display:
                st.dataframe(
                    holdings_display,
                    use_container_width=True,
                    hide_index=True,
                )

                
                if all_quotes_available:
                    allocation_data = [
                        {
                            "Stock": item["Stock"],
                            "Market Value": item["Market Value (₹)"],
                        }
                        for item in holdings_display
                        if isinstance(
                            item["Market Value (₹)"],
                            (int, float),
                        )
                        and item["Market Value (₹)"] > 0
                    ]

                    if allocation_data:
                        allocation_df = pd.DataFrame(
                            allocation_data
                        )
                        fig = px.pie(
                            allocation_df,
                            names="Stock",
                            values="Market Value",
                            title="Portfolio Allocation by Stock",
                            hole=0.45,
                        )
                        fig.update_traces(
                            textposition="inside",
                            textinfo="percent+label",
                        )
                        st.plotly_chart(
                            fig,
                            use_container_width=True,
                        )
                    else:
                        st.info(
                            "Allocation chart will appear when "
                            "you have holdings with positive "
                            "market values."
                        )

        
        # PORTFOLIO SUMMARY
        

        st.divider()
        st.subheader("Portfolio Summary")

        summary_col1, summary_col2, summary_col3 = (
            st.columns(3)
        )

        summary_col1.metric(
            "Available Cash",
            f"₹{balance:,.2f}",
        )
        summary_col2.metric(
            "Invested Cost",
            f"₹{invested_value_total:,.2f}",
        )

        if holdings_loaded and all_quotes_available:
            portfolio_value = balance + market_value_total

            summary_col3.metric(
                "Total Portfolio Value",
                f"₹{portfolio_value:,.2f}",
            )

            st.caption(
                "Total portfolio value = available cash + current "
                "market value of holdings."
            )

            # Save or update today's snapshot.
            try:
                save_portfolio_snapshot(
                    client=client,
                    user_id=user_id,
                    cash_balance=balance,
                    invested_cost=invested_value_total,
                    holdings_market_value=market_value_total,
                )
            except Exception:
                st.warning(
                    "Portfolio snapshot could not be saved. "
                    "Your wallet and trades are unaffected."
                )

            
            # PORTFOLIO PERFORMANCE
            

            st.divider()
            st.subheader("Portfolio Performance")

            unrealized_pnl = (
                market_value_total - invested_value_total
            )

            pnl_percentage = (
                (unrealized_pnl / invested_value_total) * 100
                if invested_value_total > 0
                else 0.0
            )

            performance_col1, performance_col2 = st.columns(2)

            performance_col1.metric(
                "Unrealized Profit / Loss",
                f"₹{unrealized_pnl:,.2f}",
                delta=f"{pnl_percentage:.2f}%",
            )
            performance_col2.metric(
                "Current Holdings Value",
                f"₹{market_value_total:,.2f}",
            )

            
            # PORTFOLIO RISK ANALYSIS
            
            st.divider()
            st.subheader("Portfolio Risk Analysis")

            if market_value_total > 0:
                concentration_data = [
                    item
                    for item in holdings_display
                    if isinstance(
                        item["Market Value (₹)"],
                        (int, float),
                    )
                    and item["Market Value (₹)"] > 0
                ]

                for item in concentration_data:
                    item["Allocation (%)"] = (
                        item["Market Value (₹)"]
                        / market_value_total
                    ) * 100

                if concentration_data:
                    top_holding = max(
                        concentration_data,
                        key=lambda item: item["Allocation (%)"],
                    )

                    risk_col1, risk_col2 = st.columns(2)

                    risk_col1.metric(
                        "Largest Stock Allocation",
                        f"{top_holding['Allocation (%)']:.2f}%",
                    )
                    risk_col2.metric(
                        "Largest Holding",
                        top_holding["Stock"],
                    )

                    if top_holding["Allocation (%)"] > 50:
                        st.warning(
                            f"{top_holding['Stock']} represents more "
                            "than 50% of your holdings' market value. "
                            "This indicates high concentration in "
                            "one stock."
                        )
                    else:
                        st.success(
                            "No single stock represents more than "
                            "50% of your holdings' market value."
                        )

                    st.caption(
                        "This is a simple concentration indicator, "
                        "not a complete measure of investment risk "
                        "or a prediction of future losses."
                    )
            else:
                st.info(
                    "Risk analysis will appear when your holdings "
                    "have a positive market value."
                )

            
            # PORTFOLIO HISTORY
            

            st.divider()
            st.subheader("Portfolio History")

            try:
                history_result = (
                    client.table("portfolio_snapshots")
                    .select(
                        "snapshot_date, total_portfolio_value, "
                        "cash_balance, holdings_market_value"
                    )
                    .eq("user_id", user_id)
                    .order("snapshot_date")
                    .execute()
                )

                history = history_result.data or []

                if history:
                    history_df = pd.DataFrame(history)

                    history_df["snapshot_date"] = pd.to_datetime(
                        history_df["snapshot_date"]
                    )
                    history_df["total_portfolio_value"] = (
                        pd.to_numeric(
                            history_df["total_portfolio_value"],
                            errors="coerce",
                        )
                    )

                    history_df = history_df.dropna(
                        subset=[
                            "snapshot_date",
                            "total_portfolio_value",
                        ]
                    )

                    if not history_df.empty:
                        history_df = history_df.sort_values(
                            "snapshot_date"
                        )

                        history_df["Daily Change (₹)"] = (
                            history_df["total_portfolio_value"].diff()
                        )
                        history_df["Daily Return (%)"] = (
                            history_df["total_portfolio_value"]
                            .pct_change(fill_method=None)
                            * 100
                        )

                        first_value = (
                            history_df[
                                "total_portfolio_value"
                            ].iloc[0]
                        )

                        if first_value > 0:
                            history_df["Cumulative Return (%)"] = (
                                history_df["total_portfolio_value"]
                                / first_value - 1
                            ) * 100
                        else:
                            history_df["Cumulative Return (%)"] = 0.0

                        fig_history = px.line(
                            history_df,
                            x="snapshot_date",
                            y="total_portfolio_value",
                            markers=True,
                            title="Total Portfolio Value Over Time",
                            labels={
                                "snapshot_date": "Date",
                                "total_portfolio_value": (
                                    "Portfolio Value (₹)"
                                ),
                            },
                        )

                        fig_history.update_layout(
                            hovermode="x unified",
                            yaxis_tickprefix="₹",
                            xaxis_title="Date",
                            yaxis_title="Portfolio Value (₹)",
                        )

                        st.plotly_chart(
                            fig_history,
                            use_container_width=True,
                        )

                        st.subheader(
                            "Cumulative Portfolio Performance"
                        )

                        fig_cumulative = px.line(
                            history_df,
                            x="snapshot_date",
                            y="Cumulative Return (%)",
                            markers=True,
                            title=(
                                "Portfolio Value Change Since "
                                "First Snapshot"
                            ),
                            labels={
                                "snapshot_date": "Date",
                                "Cumulative Return (%)": (
                                    "Value Change (%)"
                                ),
                            },
                        )

                        fig_cumulative.update_layout(
                            hovermode="x unified",
                            yaxis_ticksuffix="%",
                            xaxis_title="Date",
                            yaxis_title="Value Change (%)",
                        )

                        st.plotly_chart(
                            fig_cumulative,
                            use_container_width=True,
                        )

                        if len(history_df) >= 2:
                            latest_return = history_df[
                                "Daily Return (%)"
                            ].iloc[-1]

                            if pd.notna(latest_return):
                                st.metric(
                                    "Latest Daily Portfolio Change",
                                    f"{latest_return:.2f}%",
                                )
                        else:
                            st.info(
                                "Daily returns will appear after "
                                "snapshots exist for at least two "
                                "different dates."
                            )

                        st.caption(
                            "History is based on saved daily snapshots. "
                            "Value changes are not a complete investment "
                            "return calculation when deposits and "
                            "withdrawals are not tracked separately."
                        )
                    else:
                        st.info(
                            "No valid portfolio history is available yet."
                        )
                else:
                    st.info(
                        "Your portfolio history will appear after "
                        "the first snapshot is saved."
                    )

            except Exception:
                st.warning(
                    "Portfolio history could not be loaded. "
                    "Check the portfolio_snapshots table's "
                    "SELECT policy and permissions."
                )

        else:
            summary_col3.metric(
                "Total Portfolio Value",
                "Unavailable",
            )
            st.caption(
                "Total portfolio value is hidden until holdings "
                "and their current quotes load successfully."
            )

    
        # TRADE HISTORY
        

        st.divider()
        st.subheader("Trade History")

        try:
            trades_result = (
                client.table("trades")
                .select(
                    "symbol, side, quantity, price, fee, created_at"
                )
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(50)
                .execute()
            )

            trades = trades_result.data or []

            if trades:
                trades_display = []

                for trade in trades:
                    trades_display.append(
                        {
                            "Date & Time": trade.get("created_at"),
                            "Stock": trade.get("symbol"),
                            "Side": trade.get("side"),
                            "Quantity": trade.get("quantity"),
                            "Execution Price (₹)": round(
                                float(trade.get("price") or 0),
                                2,
                            ),
                            "Fee (₹)": round(
                                float(trade.get("fee") or 0),
                                2,
                            ),
                        }
                    )

                st.dataframe(
                    trades_display,
                    use_container_width=True,
                    hide_index=True,
                )
                st.caption(
                    "Showing your latest 50 transactions."
                )
            else:
                st.info("No transactions found yet.")

        except Exception:
            st.error(
                "Unable to load trade history. Check the trades "
                "table's SELECT policy for authenticated users."
            )

        
        # PLACE A PAPER TRADE
        

        st.divider()
        st.subheader("Place a Paper Trade")
        if "eduvest_prefill_symbol" in st.session_state:
            st.session_state["paper_trade_symbol"] = (
                st.session_state.pop("eduvest_prefill_symbol")
            )
        if "paper_trade_symbol" not in st.session_state:
            st.session_state["paper_trade_symbol"] = "RELIANCE"

        with st.form("paper_trade_form"):
            symbol_input = st.text_input(
                "NSE stock symbol",
                key = "paper_trade_symbol",
                help="Examples: RELIANCE, TCS, INFY.",
            )

            side_input = st.radio(
                "Order type",
                ["BUY", "SELL"],
                horizontal=True,
            )

            quantity_input = st.number_input(
                "Quantity (shares)",
                min_value=1,
                max_value=100000,
                value=1,
                step=1,
            )

            preview_submitted = st.form_submit_button(
                "Preview Order",
                use_container_width=True,
            )

        
        # ORDER PREVIEW
        

        if preview_submitted:
            symbol = symbol_input.strip().upper()
            side = side_input
            quantity = int(quantity_input)

            if not valid_symbol(symbol):
                st.error("Enter a valid stock symbol.")
            else:
                try:
                    with st.spinner("Fetching stock quote..."):
                        quote_price = get_current_quote(symbol)

                    st.session_state[
                        "eduvest_trade_preview"
                    ] = {
                        "symbol": symbol,
                        "side": side,
                        "quantity": quantity,
                        "quoted_price": quote_price,
                        "request_id": str(uuid.uuid4()),
                    }

                    st.success("Quote retrieved successfully!")

                except Exception as exc:
                    st.error(
                        f"Unable to retrieve stock quote: {exc}"
                    )

        preview = st.session_state.get(
            "eduvest_trade_preview"
        )

        if preview:
            st.divider()
            st.subheader("Order Preview")

            st.write(f"**Stock:** {preview['symbol']}")
            st.write(f"**Side:** {preview['side']}")
            st.write(
                f"**Quantity:** {preview['quantity']} share(s)"
            )

            st.metric(
                "Preview Price",
                f"₹{preview['quoted_price']:,.2f}",
            )
            st.metric(
                "Estimated Order Value",
                f"₹{preview['quoted_price'] * preview['quantity']:,.2f}",
            )

            st.caption(
                "This is an estimate. The server fetches and "
                "validates the price again when you confirm."
            )

            st.warning(
                "Confirming this order will change your virtual "
                "wallet, holdings, and trade history."
            )

            confirm_col, cancel_col = st.columns(2)

            with confirm_col:
                confirm_trade = st.button(
                    "Confirm & Execute Paper Trade",
                    type="primary",
                    use_container_width=True,
                )

            with cancel_col:
                cancel_trade = st.button(
                    "Cancel Preview",
                    use_container_width=True,
                )

            if cancel_trade:
                st.session_state.pop(
                    "eduvest_trade_preview",
                    None,
                )
                st.rerun()

            if confirm_trade:
                payload = {
                    "mode": "trade",
                    "request_id": preview["request_id"],
                    "symbol": preview["symbol"],
                    "side": preview["side"],
                    "quantity": preview["quantity"],
                }

                try:
                    with st.spinner(
                        "Validating and executing paper trade..."
                    ):
                        trade_result = call_trade_function(
                            payload
                        )

                    if trade_result.get("success") is not True:
                        raise RuntimeError(
                            trade_result.get(
                                "error",
                                "The trade was not confirmed by the server.",
                            )
                        )

                    st.success(
                        "Paper trade executed successfully."
                    )
                    st.write("Trade response:")
                    st.json(trade_result)

                    st.session_state.pop(
                        "eduvest_trade_preview",
                        None,
                    )
                    st.rerun()

                except Exception as exc:
                    st.error(
                        f"Trade request failed: {exc}"
                    )
                    st.warning(
                        "The preview has been retained. If the "
                        "execution result is uncertain, retry this "
                        "same request instead of generating a new "
                        "request ID."
                    )



# SIDEBAR QUOTE TEST


st.sidebar.divider()
st.sidebar.subheader("Edge Function Test")

if st.sidebar.button("Test RELIANCE Quote"):
    test_eduvest_quote("RELIANCE")
