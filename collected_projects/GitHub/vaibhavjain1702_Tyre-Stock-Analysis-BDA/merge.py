import pandas as pd

# -------------------------
# Step 1: Load daily stock data
# -------------------------
stock_data = pd.read_csv("tyre_stock_data.csv")

# Ensure 'Date' column exists and is datetime.date
if 'Date' not in stock_data.columns:
    # Assuming Yahoo daily data has a 'Date' column already
    raise ValueError("No Date column found in stock CSV.")
stock_data['Date'] = pd.to_datetime(stock_data['Date']).dt.date

# -------------------------
# Step 2: Load intraday stock data
# -------------------------
intraday_raw = pd.read_csv("tyre_intraday_data.csv")

# Convert 'Datetime' to datetime, then to date
if 'Datetime' not in intraday_raw.columns:
    raise ValueError("No Datetime column found in intraday CSV.")

intraday_raw['Date'] = pd.to_datetime(intraday_raw['Datetime']).dt.date

# Keep only relevant columns for merging
# Assuming 'Company' column exists in intraday CSV
if 'Company' not in intraday_raw.columns:
    raise ValueError("No Company column found in intraday CSV.")

intraday_data = intraday_raw[['Date', 'Company', 'Open', 'High', 'Low', 'Close', 'Volume']]

# -------------------------
# Step 3: Merge daily stock with intraday
# -------------------------
merged = pd.merge(stock_data, intraday_data, how='left', on=['Date', 'Company'])

# -------------------------
# Step 4: Load sentiment/news data
# -------------------------
sentiment = pd.read_csv("tyre_news_sentiment.csv")

# Rename columns for consistency
sentiment.rename(columns={'company': 'Company', 'date': 'Date'}, inplace=True)

# Convert Date to datetime.date
sentiment['Date'] = pd.to_datetime(sentiment['Date']).dt.date

# -------------------------
# Step 5: Merge with sentiment
# -------------------------
merged = pd.merge(merged, sentiment, how='left', on=['Date', 'Company'])

# -------------------------
# Step 6: Save final merged CSV
# -------------------------
merged.to_csv("tyre_final_data.csv", index=False)
print("Merged data saved to tyre_final_data.csv")