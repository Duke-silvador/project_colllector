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
    stock = yf.Ticker(ticker)
    df = stock.history(period="10y", interval="1d")  # daily data
    df.reset_index(inplace=True)
    df['Company'] = name
    all_data.append(df)

# Combine all companies
big_stock_data = pd.concat(all_data)

# Save as CSV
big_stock_data.to_csv("tyre_stock_data.csv", index=False)

print("Stock data saved to tyre_stock_data.csv")