import os
import requests
import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime, timedelta

# NewsAPI key is read from the environment (see .env.example)
api_key = os.environ.get("NEWS_API_KEY")
if not api_key:
    raise SystemExit("Set the NEWS_API_KEY environment variable (get a key at https://newsapi.org)")

# Companies to track
companies = ["JK Tyre", "Apollo Tyre", "CEAT", "MRF"]

# Initialize sentiment analyzer
analyzer = SentimentIntensityAnalyzer()

all_news = []

# Example: Get news for the last 30 days
end_date = datetime.today()
start_date = end_date - timedelta(days=30)

for company in companies:
    url = (
        f"https://newsapi.org/v2/everything?"
        f"q={company}&"
        f"from={start_date.strftime('%Y-%m-%d')}&"
        f"to={end_date.strftime('%Y-%m-%d')}&"
        f"language=en&"
        f"pageSize=100&"
        f"apiKey={api_key}"
    )
    
    response = requests.get(url).json()
    
    for article in response.get('articles', []):
        title = article['title']
        desc = article['description']
        content = article['content']
        date = article['publishedAt']
        
        # Calculate sentiment using VADER on title
        sentiment_score = analyzer.polarity_scores(title)['compound']
        
        all_news.append({
            'company': company,
            'date': date,
            'title': title,
            'description': desc,
            'content': content,
            'sentiment': sentiment_score,
            'url': article['url']
        })

# Convert to DataFrame
df_news = pd.DataFrame(all_news)

# Save CSV
df_news.to_csv("tyre_news_sentiment.csv", index=False)

print("News with sentiment saved to tyre_news_sentiment.csv")