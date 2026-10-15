
from datetime import datetime
from zoneinfo import ZoneInfo

import pandas as pd
import plotly.express as px
import streamlit as st
import yfinance as yf



# CONFIGURATION


INDIA_TZ = ZoneInfo("Asia/Kolkata")

STOCKS = {
    "Reliance Industries": "RELIANCE.NS",
    "Tata Consultancy Services": "TCS.NS",
    "Infosys": "INFY.NS",
    "HDFC Bank": "HDFCBANK.NS",
    "ICICI Bank": "ICICIBANK.NS",
    "Wipro": "WIPRO.NS",
    "Tata Motors": "TATAMOTORS.NS",
}

PERIODS = {
    "1 Month": "1mo",
    "3 Months": "3mo",
    "6 Months": "6mo",
    "1 Year": "1y",
    "2 Years": "2y",
    "5 Years": "5y",
}



# DATA RETRIEVAL


@st.cache_data(ttl=300, show_spinner=False)
def fetch_stock_data(ticker, period):
    """Download historical NSE stock prices."""

    stock = yf.Ticker(ticker)

    data = stock.history(
        period=period,
        interval="1d",
        auto_adjust=True,
        actions=False,
    )

    if data.empty:
        raise ValueError(
            f"No historical data returned for {ticker}. "
            "Try another stock or period."
        )

    data = data.copy()

    # Convert the date index into an explicit column.
    data.index = pd.to_datetime(data.index)
    data = data.sort_index()

    required_columns = [
        "Open",
        "High",
        "Low",
        "Close",
        "Volume",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in data.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns: {missing_columns}"
        )

    # Keep rows with valid closing prices.
    data = data.dropna(subset=["Close"])

    if data.empty:
        raise ValueError(
            "No valid closing prices are available."
        )

    return data



# METRICS

def calculate_metrics(data):
    """Calculate historical performance and data-quality metrics."""

    close = data["Close"].dropna()

    if close.empty:
        raise ValueError("Closing prices are unavailable.")

    latest_price = float(close.iloc[-1])

    previous_price = (
        float(close.iloc[-2])
        if len(close) >= 2
        else None
    )

    daily_change = (
        latest_price - previous_price
        if previous_price is not None
        else None
    )

    daily_change_pct = (
        daily_change / previous_price * 100
        if previous_price not in (None, 0)
        else None
    )

    returns = close.pct_change().dropna()

    period_return = (
        (close.iloc[-1] / close.iloc[0]) - 1
    ) * 100

    volatility = (
        returns.std() * (252 ** 0.5) * 100
        if len(returns) >= 2
        else None
    )

    running_peak = close.cummax()
    drawdown = close / running_peak - 1
    max_drawdown = float(drawdown.min() * 100)

    valid_volume = data["Volume"].dropna()

    latest_volume = (
        int(valid_volume.iloc[-1])
        if not valid_volume.empty
        else None
    )

    missing_values = int(
        data[
            ["Open", "High", "Low", "Close", "Volume"]
        ].isna().sum().sum()
    )

    duplicate_dates = int(data.index.duplicated().sum())

    return {
        "latest_price": latest_price,
        "daily_change": daily_change,
        "daily_change_pct": daily_change_pct,
        "period_return": float(period_return),
        "volatility": (
            float(volatility)
            if volatility is not None
            and pd.notna(volatility)
            else None
        ),
        "max_drawdown": max_drawdown,
        "latest_volume": latest_volume,
        "rows": len(data),
        "missing_values": missing_values,
        "duplicate_dates": duplicate_dates,
    }



# MAIN MARKET ANALYTICS PAGE


def render_market_analytics():
    """Display the complete Market Analytics dashboard."""

    st.subheader("📊 Market Analytics")

    st.write(
        "Explore historical NSE stock prices, performance, "
        "trading volume, and risk indicators."
    )

    
    # FILTERS
    

    filter_col1, filter_col2 = st.columns(2)

    with filter_col1:
        stock_name = st.selectbox(
            "Select stock",
            list(STOCKS.keys()),
            key="market_stock_selection",
        )

    with filter_col2:
        period_name = st.selectbox(
            "Historical period",
            list(PERIODS.keys()),
            index=3,
            key="market_period_selection",
        )

    ticker = STOCKS[stock_name]
    period = PERIODS[period_name]

    refresh_col, info_col = st.columns([1, 3])

    with refresh_col:
        if st.button(
            "🔄 Refresh Data",
            use_container_width=True,
            key="refresh_market_data",
        ):
            fetch_stock_data.clear()
            st.rerun()

    with info_col:
        st.caption(
            "Data source: Yahoo Finance. Historical prices may "
            "be delayed and are not guaranteed to be live."
        )

    
    # LOAD DATA
    

    try:
        with st.spinner(f"Loading {stock_name} data..."):
            data = fetch_stock_data(ticker, period)

        metrics = calculate_metrics(data)

    except Exception as error:
        st.error(f"Unable to load market data: {error}")

        st.info(
            "Check your internet connection, try another stock, "
            "or retry later if Yahoo Finance is unavailable."
        )
        return

    # Explicit Date column fixes date-axis chart issues.
    chart_data = data.reset_index()

    # Yahoo Finance may name the index Date or Datetime.
    date_column = next(
        (
            column
            for column in chart_data.columns
            if str(column).lower() in ("date", "datetime")
        ),
        None,
    )

    if date_column is None:
        date_column = chart_data.columns[0]

    chart_data = chart_data.rename(
        columns={
            date_column: "Date",
            "Close": "Closing Price (₹)",
        }
    )

    chart_data["Date"] = pd.to_datetime(
        chart_data["Date"]
    )

    chart_data = chart_data.sort_values("Date")

    
    # PRICE METRICS
    

    st.divider()
    st.markdown(f"### {stock_name} · {ticker}")

    price_col, change_col, volume_col, sessions_col = (
        st.columns(4)
    )

    price_col.metric(
        "Latest Available Close",
        f"₹{metrics['latest_price']:,.2f}",
    )

    if metrics["daily_change"] is not None:
        change_col.metric(
            "Daily Change",
            f"₹{metrics['daily_change']:,.2f}",
            delta=f"{metrics['daily_change_pct']:.2f}%",
        )
    else:
        change_col.metric(
            "Daily Change",
            "Unavailable",
        )

    if metrics["latest_volume"] is not None:
        volume_col.metric(
            "Latest Volume",
            f"{metrics['latest_volume']:,}",
        )
    else:
        volume_col.metric(
            "Latest Volume",
            "Unavailable",
        )

    sessions_col.metric(
        "Trading Sessions",
        f"{metrics['rows']:,}",
    )

    st.caption(
        "The latest available close may differ from the current "
        "market price, particularly outside trading hours."
    )

    
    # INTERACTIVE PRICE CHART
    

    st.divider()
    st.markdown("### 📈 Historical Closing Prices")

    price_fig = px.line(
        chart_data,
        x="Date",
        y="Closing Price (₹)",
        title=f"{stock_name} — {period_name}",
        markers=False,
        labels={
            "Date": "Trading Date",
            "Closing Price (₹)": "Price (₹)",
        },
    )

    price_fig.update_layout(
        hovermode="x unified",
        height=420,
        margin=dict(l=10, r=10, t=60, b=10),
    )

    price_fig.update_traces(
        line=dict(width=2),
        hovertemplate=(
            "Date: %{x|%d %b %Y}<br>"
            "Price: ₹%{y:,.2f}<extra></extra>"
        ),
    )

    st.plotly_chart(
        price_fig,
        use_container_width=True,
        key="market_price_chart",
    )

    
    # TRADING VOLUME
    

    st.markdown("### 📊 Trading Volume")

    volume_data = chart_data[
        ["Date", "Volume"]
    ].copy()

    volume_fig = px.bar(
        volume_data,
        x="Date",
        y="Volume",
        title="Daily Trading Volume",
        labels={
            "Date": "Trading Date",
            "Volume": "Shares Traded",
        },
    )

    volume_fig.update_layout(
        height=320,
        hovermode="x unified",
        margin=dict(l=10, r=10, t=60, b=10),
    )

    st.plotly_chart(
        volume_fig,
        use_container_width=True,
        key="market_volume_chart",
    )

    
    # INVESTMENT ANALYTICS


    st.divider()
    st.markdown("### 📉 Investment Analytics")

    analytics_col1, analytics_col2, analytics_col3 = (
        st.columns(3)
    )

    analytics_col1.metric(
        "Period Return",
        f"{metrics['period_return']:.2f}%",
    )

    if metrics["volatility"] is not None:
        analytics_col2.metric(
            "Annualized Volatility",
            f"{metrics['volatility']:.2f}%",
        )
    else:
        analytics_col2.metric(
            "Annualized Volatility",
            "Insufficient data",
        )

    analytics_col3.metric(
        "Maximum Drawdown",
        f"{metrics['max_drawdown']:.2f}%",
    )

    st.caption(
        "Period return compares the first and last available closing "
        "prices. Volatility is annualized using 252 trading days. "
        "Maximum drawdown measures the largest decline from a prior "
        "historical peak. These are historical measurements, not "
        "investment advice or predictions."
    )

    
    # DATA QUALITY REPORT
    

    with st.expander("🔍 Data Quality Report"):
        quality_col1, quality_col2, quality_col3 = (
            st.columns(3)
        )

        quality_col1.metric(
            "Missing Values",
            f"{metrics['missing_values']:,}",
        )

        quality_col2.metric(
            "Duplicate Dates",
            f"{metrics['duplicate_dates']:,}",
        )

        quality_col3.metric(
            "Rows Retrieved",
            f"{metrics['rows']:,}",
        )

        st.write(
            "**Checked at (India time):**",
            datetime.now(INDIA_TZ).strftime(
                "%d %b %Y, %H:%M:%S %Z"
            ),
        )

        if (
            metrics["missing_values"] == 0
            and metrics["duplicate_dates"] == 0
        ):
            st.success(
                "No missing values in the required columns and "
                "no duplicate timestamps were detected."
            )
        else:
            st.warning(
                "Some data-quality issues were detected. "
                "Review the data before using it for forecasting."
            )

        st.markdown("#### Latest 10 Records")

        display_columns = [
            column
            for column in [
                "Date",
                "Open",
                "High",
                "Low",
                "Closing Price (₹)",
                "Volume",
            ]
            if column in chart_data.columns
        ]

        st.dataframe(
            chart_data[display_columns].tail(10),
            use_container_width=True,
            hide_index=True,
        )



# STANDALONE TEST MODE


if __name__ == "__main__":
    st.set_page_config(
        page_title="EduVest Market Analytics",
        page_icon="📈",
        layout="wide",
    )

    st.title("EduVest")
    st.caption("Market Research & Investment Analytics")

    render_market_analytics()
