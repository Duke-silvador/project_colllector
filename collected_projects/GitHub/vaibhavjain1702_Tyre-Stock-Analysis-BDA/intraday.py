import yfinance as yf
import pandas as pd

# Companies and tickers
companies = {
    "JKTYRE.NS": "JK Tyre",
    "APOLLOTYRE.NS": "Apollo Tyre",
    "CEATLTD.NS": "CEAT",
    "MRF.NS": "MRF"
}

all_data = []

for ticker, name in companies.items():
    try:
        print(f"Downloading intraday data for {name} ({ticker})...")
        # 5-minute interval, last 60 days
        df = yf.download(tickers=ticker, period="60d", interval="5m", auto_adjust=True)
        df.reset_index(inplace=True)
        df['Company'] = name
        df['Ticker'] = ticker
        all_data.append(df)
        print(f"Downloaded {len(df)} rows for {name}")
    except Exception as e:
        print(f"Failed to download {ticker}: {e}")

# Combine all companies into one DataFrame
if all_data:
    intraday_data = pd.concat(all_data, ignore_index=True)
    intraday_data.to_csv("tyre_intraday_data.csv", index=False)
    print("All intraday stock data saved to tyre_intraday_data.csv")
else:
    print("No data downloaded.")