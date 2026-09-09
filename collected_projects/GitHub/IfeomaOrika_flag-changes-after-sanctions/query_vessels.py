import csv
import re
import requests
import os
import json
import time
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("GFW_TOKEN")
headers = {"Authorization": f"Bearer {token}"}

def get_vessel_history(imo):
    url = "https://gateway.api.globalfishingwatch.org/v3/vessels/search"
    params = {
        "query": imo,
        "datasets[0]": "public-global-vessel-identity:latest"
    }
    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        return None

def parse_flag_history(data, imo):
    entries = []
    if not data or 'entries' not in data:
        return entries
    for entry in data['entries']:
        for info in entry.get('selfReportedInfo', []):
            if info.get('imo') == imo:
                entries.append({
                    'shipname': info.get('shipname', ''),
                    'flag': info.get('flag', ''),
                    'date_from': info.get('transmissionDateFrom', ''),
                    'date_to': info.get('transmissionDateTo', ''),
                    'registry_confirmed': entry.get('registryInfoTotalRecords', 0) > 0
                })
    return sorted(entries, key=lambda x: x['date_from'])

# load sanctioned ships
ships = []
with open('uk_sanctions.csv', 'r', encoding='utf-8-sig') as f:
