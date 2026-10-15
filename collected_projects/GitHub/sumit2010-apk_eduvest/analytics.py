
import pandas as pd
import streamlit as st
import yfinance as yf

st.set_page_config(
    page_title="EduVest Stock Comparison",
    layout="wide",
)

st.title("EduVest | Indian Stock Comparison")
st.caption("Historical risk and return comparison using NSE-listed stocks")

stocks = {
    "Reliance Industries": "RELIANCE.NS",
    "Tata Consultancy Services": "TCS.NS",
    "Infosys": "INFY.NS",
}

period = st.selectbox(
    "Historical period",
    ["6mo", "1y", "2y", "5y"],
    index=1,
)

if st.button("Compare Stocks"):
    results = []
    close_prices = {}

    try:
        with st.spinner("Downloading historical prices..."):
            for company, ticker in stocks.items():
                data = yf.Ticker(ticker).history(
                    period=period,
                    interval="1d",
                    auto_adjust=True,
                )

                if data.empty or data["Close"].dropna().empty:
                    st.warning(f"No usable data returned for {ticker}.")
                    continue

                close = data["Close"].dropna().sort_index()
                returns = close.pct_change().dropna()

                if returns.empty:
                    st.warning(f"Not enough observations for {ticker}.")
                    continue

                running_peak = close.cummax()
                drawdowns = close / running_peak - 1

                results.append({
                    "Company": company,
                    "Ticker": ticker,
                    "Latest Close (₹)": round(float(close.iloc[-1]), 2),
                    "Period Return (%)": round(
                        float((close.iloc[-1] / close.iloc[0] - 1) * 100),
                        2,
                    ),
                    "Annualized Volatility (%)": round(
                        float(returns.std() * (252 ** 0.5) * 100),
                        2,
                    ),
                    "Maximum Drawdown (%)": round(
                        float(drawdowns.min() * 100),
                        2,
                    ),
                    "Observations": len(close),
                })

                close_prices[company] = close

        if not results:
            st.error("No stocks returned usable historical data.")
            st.stop()

        comparison = pd.DataFrame(results).set_index("Company")

        st.subheader("Risk and Return Metrics")
        st.dataframe(comparison, use_container_width=True)
        
        st.subheader("Normalized Performance Comparison")

        prices = pd.DataFrame(close_prices).sort_index()
        normalized_prices = prices.apply(
            lambda column: (column / column.dropna().iloc[0]) * 100
        )

        st.line_chart(
            normalized_prices,
            x_label="Trading date",
            y_label="Normalized value (starting value = 100)",
        )

        st.caption(
            "Each stock starts at 100. A value of 90 represents "
            "a 10% decline from that stock's first observed price."
        )


        

        st.caption(
            "Stocks have different price scales. For performance "
            "comparison, normalized returns are more informative "
            "than comparing their raw share prices."
        )

    except Exception as error:
        st.error(f"Comparison failed: {error}")
