
import numpy as np
import pandas as pd
import plotly.express as px
import streamlit as st
import yfinance as yf


# STOCKS AND WATCHLISTS


STOCKS = {
    "Reliance Industries": "RELIANCE",
    "Tata Consultancy Services": "TCS",
    "Infosys": "INFY",
    "HDFC Bank": "HDFCBANK",
    "ICICI Bank": "ICICIBANK",
    "State Bank of India": "SBIN",
    "ITC": "ITC",
    "Tata Motors": "TATAMOTORS",
    "Wipro": "WIPRO",
    "Larsen & Toubro": "LT",
}

WATCHLISTS = {
    "Watchlist 1": [
        "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"
    ],
    "Watchlist 2": ["SBIN", "ITC", "TATAMOTORS"],
    "Watchlist 3": ["WIPRO", "LT"],
}

INDEXES = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
}


# MARKET DATA


@st.cache_data(ttl=300, show_spinner=False)
def fetch_history(symbol, period="1mo"):
    """Fetch historical daily prices from Yahoo Finance."""

    ticker = symbol if symbol.startswith("^") else f"{symbol}.NS"

    data = yf.Ticker(ticker).history(
        period=period,
        interval="1d",
        auto_adjust=True,
    )

    if data.empty or "Close" not in data.columns:
        return pd.DataFrame()

    data = data.replace([np.inf, -np.inf], np.nan)
    data = data.dropna(subset=["Close"])
    data = data[data["Close"] > 0]

    return data


@st.cache_data(ttl=300, show_spinner=False)
def fetch_index_data(symbol):
    """Fetch the latest available index value and daily change."""

    history = fetch_history(symbol, "5d")

    if history.empty:
        return None, None, None

    close = history["Close"].dropna()

    if close.empty:
        return None, None, None

    latest = float(close.iloc[-1])

    if len(close) < 2:
        return latest, None, None

    previous = float(close.iloc[-2])
    change = latest - previous
    change_pct = change / previous * 100 if previous else None

    return latest, change, change_pct


@st.cache_data(ttl=300, show_spinner=False)
def fetch_market_snapshot():
    """Fetch stock prices and calculate daily movements."""

    rows = []

    for company, symbol in STOCKS.items():
        try:
            history = fetch_history(symbol, "5d")

            if history.empty:
                raise ValueError("No price data returned")

            close = history["Close"].dropna()
            latest = float(close.iloc[-1])

            previous = (
                float(close.iloc[-2]) if len(close) >= 2 else None
            )

            change = (
                latest - previous if previous is not None else None
            )

            change_pct = (
                change / previous * 100
                if previous not in (None, 0)
                else None
            )

            rows.append({
                "Company": company,
                "Symbol": symbol,
                "Price": latest,
                "Change": change,
                "ChangePct": change_pct,
                "Available": True,
            })

        except Exception:
            rows.append({
                "Company": company,
                "Symbol": symbol,
                "Price": None,
                "Change": None,
                "ChangePct": None,
                "Available": False,
            })

    return pd.DataFrame(rows)



# UI HELPERS

def render_index_card(name, symbol):
    """Render an index card without inventing missing prices."""

    try:
        latest, change, change_pct = fetch_index_data(symbol)

        if latest is None:
            st.metric(name, "Unavailable")
            st.caption("Market data could not be retrieved.")
            return

        delta = None

        if change is not None and change_pct is not None:
            delta = f"{change:+,.2f} ({change_pct:+.2f}%)"
        elif change is not None:
            delta = f"{change:+,.2f}"

        st.metric(
            label=name,
            value=f"{latest:,.2f}",
            delta=delta,
        )

    except Exception:
        st.metric(name, "Unavailable")
        st.caption("Please try refreshing market data.")


def format_price(value):
    if value is None or pd.isna(value):
        return "Unavailable"

    return f"₹{float(value):,.2f}"


def set_selected_stock(company, symbol):
    """Queue a stock selection for the next script run."""

    st.session_state["pending_stock_selection"] = {
        "company": company,
        "symbol": symbol,
    }


def go_to_paper_trading(symbol):
    """
    Navigate to Paper Trading through the sidebar radio's
    on_click callback, before Streamlit reruns the script.
    """

    st.session_state["paper_trade_symbol"] = symbol
    st.session_state["eduvest_navigation"] = "Paper Trading"



# MAIN STOCK EXPLORER
def render_stock_explorer():

    # Apply the View Stock selection before creating the dropdown.
    pending = st.session_state.pop(
        "pending_stock_selection", None
    )

    if pending:
        st.session_state["selected_stock_company"] = (
            pending["company"]
        )
        st.session_state["selected_stock_symbol"] = (
            pending["symbol"]
        )
        st.session_state["stock_detail_selector"] = (
            pending["company"]
        )
        st.session_state["view_stock_message"] = (
            f"Selected {pending['company']} "
            f"({pending['symbol']}) successfully."
        )

    # Styling 

    st.markdown(
        """
        <style>
        .stApp {
            background-color: #f7f9f7;
        }

        .block-container {
            padding-top: 1.5rem;
            max-width: 1400px;
        }

        .market-heading {
            color: #183c2b;
            font-size: 2rem;
            font-weight: 750;
            margin-bottom: 0;
        }

        .market-subheading {
            color: #718076;
            margin-top: 0.25rem;
            margin-bottom: 1.25rem;
        }

        .stock-card {
            background: #ffffff;
            border: 1px solid #e3e9e4;
            border-radius: 12px;
            padding: 15px;
            min-height: 92px;
        }

        .stock-company {
            color: #25382c;
            font-size: 0.98rem;
            font-weight: 650;
        }

        .stock-symbol {
            color: #7b867e;
            font-size: 0.82rem;
            margin-top: 4px;
        }

        .positive-change {
            color: #16834a;
            font-weight: 650;
        }

        .negative-change {
            color: #d64545;
            font-weight: 650;
        }

        .price-value {
            color: #24382b;
            font-weight: 700;
            font-size: 1.02rem;
        }

        div[data-testid="stMetric"] {
            background: white;
            border: 1px solid #e3e9e4;
            border-radius: 12px;
            padding: 14px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    # Page heading 

    st.markdown(
        '<div class="market-heading">EduVest Market Watch</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="market-subheading">'
        'Discover stocks, study price movements, and practise investing.'
        '</div>',
        unsafe_allow_html=True,
    )

    st.caption(
        "PAPER TRADING · NSE STOCKS · VIRTUAL MONEY ONLY"
    )

    # Market indices 

    index_col1, index_col2 = st.columns(2)

    with index_col1:
        render_index_card("NIFTY 50", INDEXES["NIFTY 50"])

    with index_col2:
        render_index_card("SENSEX", INDEXES["SENSEX"])

    st.caption(
        "Index values use the latest available Yahoo Finance data. "
        "They may be delayed or temporarily unavailable."
    )

    st.divider()

    #Search and refresh 

    search_col, refresh_col = st.columns([4, 1])

    with search_col:
        query = st.text_input(
            "Search stocks",
            placeholder="Search company name or symbol...",
            key="market_watch_search",
        ).strip().lower()

    with refresh_col:
        st.write("")

        if st.button(
            "↻ Refresh",
            use_container_width=True,
            key="refresh_market_watch",
        ):
            fetch_history.clear()
            fetch_market_snapshot.clear()
            fetch_index_data.clear()
            st.rerun()

    # Load market data 

    with st.spinner("Loading available market prices..."):
        snapshot = fetch_market_snapshot()

    # Watchlists 

    st.subheader("Your Watchlist")

    watchlist_name = st.radio(
        "Choose a watchlist",
        list(WATCHLISTS.keys()),
        horizontal=True,
        key="market_watch_tab",
        label_visibility="collapsed",
    )

    allowed_symbols = WATCHLISTS[watchlist_name]

    visible = snapshot[
        snapshot["Symbol"].isin(allowed_symbols)
    ].copy()

    if query:
        visible = visible[
            visible["Company"].str.lower().str.contains(
                query, na=False
            )
            | visible["Symbol"].str.lower().str.contains(
                query, na=False
            )
        ]

    st.caption(
        "Prices show the latest available daily close. "
        "Green indicates positive movement; red indicates negative movement."
    )

    # Stock rows 

    if visible.empty:
        st.info("No stocks match your search in this watchlist.")

    else:
        for _, stock in visible.iterrows():
            company = stock["Company"]
            symbol = stock["Symbol"]
            available = bool(stock["Available"])

            row_left, row_middle, row_right = st.columns(
                [3, 2, 1.3],
                vertical_alignment="center",
            )

            with row_left:
                st.markdown(
                    f"""
                    <div class="stock-card">
                        <div class="stock-company">{company}</div>
                        <div class="stock-symbol">
                            {symbol} · NSE EQ
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

            with row_middle:
                if available:
                    st.markdown(
                        f'<div class="price-value">'
                        f'{format_price(stock["Price"])}'
                        f'</div>',
                        unsafe_allow_html=True,
                    )

                    change = stock["Change"]
                    change_pct = stock["ChangePct"]

                    if pd.notna(change_pct):
                        css_class = (
                            "positive-change"
                            if change_pct >= 0
                            else "negative-change"
                        )

                        st.markdown(
                            f'<div class="{css_class}">'
                            f'{change:+,.2f} '
                            f'({change_pct:+.2f}%)'
                            f'</div>',
                            unsafe_allow_html=True,
                        )
                    else:
                        st.caption("Change unavailable")

                else:
                    st.caption("Price unavailable")

            with row_right:
                st.button(
                    "View stock",
                    key=f"view_stock_{symbol}",
                    use_container_width=True,
                    disabled=not available,
                    on_click=set_selected_stock,
                    args=(company, symbol),
                )

            st.divider()

    # Stock details 

    st.subheader("Stock Details")

    if st.session_state.get("view_stock_message"):
        st.success(st.session_state["view_stock_message"])

    available_companies = snapshot.loc[
        snapshot["Available"], "Company"
    ].tolist()

    if not available_companies:
        st.warning(
            "Stock prices are currently unavailable. "
            "Refresh the page or try again later."
        )
        return

    current_selection = st.session_state.get(
        "selected_stock_company",
        available_companies[0],
    )

    if current_selection not in available_companies:
        current_selection = available_companies[0]

    if (
        "stock_detail_selector" not in st.session_state
        or st.session_state["stock_detail_selector"]
        not in available_companies
    ):
        st.session_state["stock_detail_selector"] = current_selection

    selected_company = st.selectbox(
        "Choose a stock to inspect",
        available_companies,
        key="stock_detail_selector",
    )

    selected_symbol = STOCKS[selected_company]

    st.session_state["selected_stock_company"] = selected_company
    st.session_state["selected_stock_symbol"] = selected_symbol

    #  Historical prices 

    try:
        with st.spinner("Loading stock details..."):
            history = fetch_history(selected_symbol, "6mo")
    except Exception:
        history = pd.DataFrame()

    if history.empty:
        st.warning(
            "Historical prices are unavailable for this stock right now."
        )
        return

    close = history["Close"].dropna()

    if close.empty:
        st.warning("No valid closing prices are available.")
        return

    latest = float(close.iloc[-1])

    previous = (
        float(close.iloc[-2]) if len(close) >= 2 else None
    )

    change = latest - previous if previous is not None else None

    change_pct = (
        change / previous * 100
        if previous not in (None, 0)
        else None
    )

    # Metrics 

    metric1, metric2, metric3 = st.columns(3)

    metric1.metric(
        "Latest Available Close",
        f"₹{latest:,.2f}",
    )

    metric2.metric(
        "Daily Change",
        f"₹{change:,.2f}" if change is not None else "Unavailable",
        f"{change_pct:+.2f}%"
        if change_pct is not None
        else None,
    )

    metric3.metric(
        "Historical Trading Days",
        len(close),
    )

    # Price chart 

    chart_data = history.reset_index()

    date_column = (
        "Date" if "Date" in chart_data.columns
        else chart_data.columns[0]
    )

    fig = px.line(
        chart_data,
        x=date_column,
        y="Close",
        title=f"{selected_company} — Six-Month Price History",
        labels={
            date_column: "Trading Date",
            "Close": "Closing Price (₹)",
        },
    )

    fig.update_layout(
        hovermode="x unified",
        yaxis_tickprefix="₹",
        margin=dict(l=10, r=10, t=55, b=10),
    )

    st.plotly_chart(
        fig,
        use_container_width=True,
        key="stock_history_chart",
    )

    with st.expander("View recent prices"):
        recent = chart_data.tail(10).copy()
        recent["Close"] = recent["Close"].round(2)

        st.dataframe(
            recent,
            use_container_width=True,
            hide_index=True,
        )

    # Paper trading action 

    st.divider()
    st.subheader("Practise Investing")

    st.write(
        f"Selected stock: **{selected_company} ({selected_symbol})**"
    )

    st.caption(
        "This opens your existing Paper Trading page. "
        "The order must still be previewed and explicitly confirmed."
    )

    st.button(
        f"Invest in {selected_symbol} with virtual cash",
        type="primary",
        use_container_width=True,
        key="invest_selected_stock",
        on_click=go_to_paper_trading,
        args=(selected_symbol,),
    )

    st.caption(
        "Educational simulation only. Historical prices and forecasts "
        "do not guarantee future performance. No real-money orders are placed."
    )
