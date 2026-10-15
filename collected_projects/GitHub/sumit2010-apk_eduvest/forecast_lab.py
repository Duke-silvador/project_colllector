
import warnings

import numpy as np
import pandas as pd
import streamlit as st
import yfinance as yf

from sklearn.metrics import mean_absolute_error, mean_squared_error
from statsmodels.tsa.arima.model import ARIMA


STOCKS = {
    "Reliance Industries": "RELIANCE.NS",
    "Tata Consultancy Services": "TCS.NS",
    "Infosys": "INFY.NS",
}

PERIODS = {
    "1 Year": "1y",
    "2 Years": "2y",
    "5 Years": "5y",
}


@st.cache_data(ttl=300, show_spinner=False)
def fetch_historical_prices(ticker, period):
    """Download and clean historical adjusted closing prices."""
    data = yf.Ticker(ticker).history(
        period=period,
        interval="1d",
        auto_adjust=True,
    )

    if data.empty or "Close" not in data.columns:
        raise ValueError(
            "No usable historical closing prices were returned."
        )

    close = data["Close"].dropna().sort_index().astype(float)

    close = close[
        np.isfinite(close) & (close > 0)
    ]

    if close.index.has_duplicates:
        close = close[~close.index.duplicated(keep="last")]

    if len(close) < 60:
        raise ValueError(
            "Not enough historical observations. "
            "Please select a longer period."
        )

    return close


def render_forecast_lab():
    """Render the EduVest Forecast Lab inside the main application."""

    st.title("EduVest | Forecast Lab")
    st.caption(
        "Chronological evaluation of next-day closing-price forecasts"
    )

    col1, col2 = st.columns(2)

    with col1:
        stock_name = st.selectbox(
            "Select NSE stock",
            list(STOCKS.keys()),
            key="forecast_stock",
        )

    with col2:
        period_name = st.selectbox(
            "Historical period",
            list(PERIODS.keys()),
            index=0,
            key="forecast_period",
        )

    ticker = STOCKS[stock_name]
    period = PERIODS[period_name]

    if st.button(
        "Run Forecast Evaluation",
        type="primary",
        key="run_forecast_evaluation",
    ):
        try:
            with st.spinner("Downloading historical prices..."):
                close = fetch_historical_prices(ticker, period)

            # Each row uses the current close to predict the next
            # observed trading day's closing price.
            dataset = pd.DataFrame({
                "current_close": close,
                "target_next_close": close.shift(-1),
            }).dropna()

            # Chronological 80/20 split.
            split_index = int(len(dataset) * 0.8)
            train = dataset.iloc[:split_index]
            test = dataset.iloc[split_index:]

            if train.empty or test.empty:
                st.error("Not enough data for a train/test split.")
                return

            actual = test["target_next_close"]

            # Model 1: Naive baseline.
            naive_predictions = test["current_close"].rename(
                "Naive Baseline"
            )

            # Model 2: Five-day moving average.
            # Uses only closes known before the prediction date.
            moving_average_predictions = (
                close.rolling(window=5).mean().shift(1)
            ).reindex(test.index)

            moving_average_predictions = (
                moving_average_predictions.rename(
                    "5-Day Moving Average"
                )
            )

            # Model 3: Rolling one-step-ahead ARIMA.
            arima_values = []
            arima_errors = []

            history = list(
                train["current_close"].astype(float)
            )

            progress = st.progress(
                0,
                text="Running ARIMA forecasts...",
            )

            for i, current_close in enumerate(
                test["current_close"].astype(float),
                start=1,
            ):
                prediction = np.nan

                try:
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")

                        model = ARIMA(
                            history,
                            order=(1, 1, 1),
                        )
                        fitted_model = model.fit()

                        forecast_result = fitted_model.forecast(
                            steps=1
                        )

                        prediction = float(
                            np.asarray(
                                forecast_result
                            ).reshape(-1)[0]
                        )

                        if not np.isfinite(prediction):
                            raise ValueError(
                                "ARIMA returned an invalid prediction."
                            )

                except Exception as error:
                    arima_errors.append(
                        f"Test row {i}: "
                        f"{type(error).__name__}: {error}"
                    )

                arima_values.append(prediction)

                # Add the current observed close only after
                # making the forecast for the next close.
                history.append(float(current_close))

                progress.progress(
                    i / len(test),
                    text=(
                        f"Running ARIMA forecasts: "
                        f"{i}/{len(test)}"
                    ),
                )

            progress.empty()

            arima_predictions = pd.Series(
                arima_values,
                index=test.index,
                name="ARIMA(1,1,1)",
            )

            model_columns = [
                "Naive Baseline",
                "5-Day Moving Average",
                "ARIMA(1,1,1)",
            ]

            evaluation = pd.concat(
                [
                    actual.rename("Actual"),
                    naive_predictions,
                    moving_average_predictions,
                    arima_predictions,
                ],
                axis=1,
            )

            # Compare models on identical dates.
            common_evaluation = evaluation.dropna(
                subset=["Actual"] + model_columns
            )

            st.subheader("Forecast Availability")

            arima_failures = int(
                arima_predictions.isna().sum()
            )

            col1, col2, col3 = st.columns(3)

            col1.metric(
                "Test Observations",
                len(test),
            )
            col2.metric(
                "ARIMA Successes",
                len(test) - arima_failures,
            )
            col3.metric(
                "ARIMA Failures",
                arima_failures,
            )

            if arima_errors:
                with st.expander("ARIMA error details"):
                    for message in arima_errors[:5]:
                        st.code(message)

            if common_evaluation.empty:
                st.error(
                    "No shared test dates have valid predictions "
                    "for all three models."
                )
                return

            if len(common_evaluation) < len(test):
                st.warning(
                    f"Comparing models on "
                    f"{len(common_evaluation)} shared test dates "
                    f"out of {len(test)}."
                )

            # Current close known when each forecast was made.
            current_test_close = test[
                "current_close"
            ].reindex(common_evaluation.index)

            actual_direction = (
                common_evaluation["Actual"] > current_test_close
            )

            # Calculate evaluation metrics.
            rows = []

            for model_name in model_columns:
                observed = common_evaluation["Actual"]
                predictions = common_evaluation[model_name]

                mae = mean_absolute_error(
                    observed,
                    predictions,
                )

                rmse = np.sqrt(
                    mean_squared_error(
                        observed,
                        predictions,
                    )
                )

                predicted_direction = (
                    predictions > current_test_close
                )

                directional_accuracy = (
                    predicted_direction == actual_direction
                ).mean() * 100

                rows.append({
                    "Model": model_name,
                    "MAE (₹)": round(float(mae), 4),
                    "RMSE (₹)": round(float(rmse), 4),
                    "Directional Accuracy (%)": round(
                        float(directional_accuracy), 2
                    ),
                    "Test Observations": len(common_evaluation),
                })

            results = pd.DataFrame(rows).set_index("Model")

            st.subheader(f"Evaluation Results — {stock_name}")
            st.dataframe(
                results,
                use_container_width=True,
            )

            best_model = results["MAE (₹)"].idxmin()

            st.info(
                f"Lowest MAE on this historical test set: "
                f"{best_model}. This does not guarantee better "
                f"future performance."
            )

            # Actual versus predicted chart.
            st.subheader("Actual vs Predicted Prices")

            chart = common_evaluation[
                ["Actual"] + model_columns
            ]

            st.line_chart(
                chart,
                x_label="Test-set trading date",
                y_label="Adjusted closing price (₹)",
                height=450,
            )

            # Recent test predictions.
            st.subheader("Test-set Prediction Preview")

            st.dataframe(
                common_evaluation.tail(10).rename_axis(
                    "Prediction date"
                ),
                use_container_width=True,
            )

            # Latest close is the naive next-trading-day baseline.
            latest_close = float(close.iloc[-1])

            st.subheader("Next Trading Day — Baseline")

            st.metric(
                "Naive Baseline Prediction",
                f"₹{latest_close:,.2f}",
            )

            st.caption(
                "Directional accuracy measures whether a model "
                "correctly predicts a rise versus a non-rise. "
                "MAE and RMSE measure price prediction error."
            )

            st.caption(
                "Historical prices are sourced from Yahoo Finance. "
                "This educational experiment is not investment advice. "
                "Forecasts are not guaranteed executable prices."
            )

        except Exception as error:
            st.error(
                f"Forecast evaluation failed: "
                f"{type(error).__name__}: {error}"
            )


# Allows this module to be tested as a standalone Streamlit app.
if __name__ == "__main__":
    st.set_page_config(
        page_title="EduVest Forecast Lab",
        page_icon="📈",
        layout="wide",
    )
    render_forecast_lab()
