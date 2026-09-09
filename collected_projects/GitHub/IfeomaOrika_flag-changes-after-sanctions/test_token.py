import requests
import os
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("GFW_TOKEN")

print(f"Token loaded: {token is not None}")
print(f"Token starts with: {token[:20] if token else 'EMPTY'}")

url = "https://gateway.api.globalfishingwatch.org/v3/vessels/search"

params = {
    "query": "9332834",
    "datasets[0]": "public-global-vessel-identity:latest"
}

headers = {
    "Authorization": f"Bearer {token}"
}

response = requests.get(url, params=params, headers=headers)

print(response.status_code)
print(response.json())