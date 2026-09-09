import requests
import os
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("GFW_TOKEN")

url = "https://gateway.api.globalfishingwatch.org/v3/vessels/search"

params = {
    "query": "9332834",
    "datasets[0]": "public-global-vessel-identity:latest"
}

headers = {
    "Authorization": f"Bearer {token}"
}

response = requests.get(url, params=params, headers=headers)
data = response.json()

print(f"Total records: {data['total']}\n")
print(f"{'DATE FROM':<25} {'DATE TO':<25} {'NAME':<20} {'FLAG':<10} {'SOURCE'}")
print("-" * 100)

entries_sorted = sorted(
    data['entries'],
    key=lambda x: x['selfReportedInfo'][0]['transmissionDateFrom']
)

for entry in entries_sorted:
    for info in entry['selfReportedInfo']:
        registry_confirmed = entry['registryInfoTotalRecords'] > 0
        source = "REGISTRY+AIS" if registry_confirmed else "SELF REPORTED"
        print(
            f"{info['transmissionDateFrom'][:10]:<25}"
            f"{info['transmissionDateTo'][:10]:<25}"
            f"{info['shipname']:<20}"
            f"{info['flag']:<10}"
            f"{source}"
        )