import json
import csv
from datetime import datetime

with open('results.json', 'r') as f:
    results = json.load(f)

def parse_date(s):
    try:
        return datetime.strptime(s, '%d/%m/%Y')
    except:
        return None

def parse_iso(s):
    try:
        return datetime.strptime(s[:10], '%Y-%m-%d')
    except:
        return None

rows = []

for r in results:
    ship = r['ship']
    d = parse_date(ship['date_designated'])
    if not d or not r['history']:
        continue
    for entry in r['history']:
        ed = parse_iso(entry['date_from'])
        if ed and ed > d:
            rows.append({
                'name': ship['name'],
                'imo': ship['imo'],
                'date_designated': ship['date_designated'],
                'flag_at_designation': ship['flag_at_designation'],
                'flag_after': entry['flag'],
                'new_name': entry['shipname'],
                'days_to_hop': (ed - d).days,
                'first_hop_date': entry['date_from'][:10],
                'registry_confirmed': entry['registry_confirmed']
            })
            break

rows.sort(key=lambda x: x['days_to_hop'])

with open('flag_hops.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

print(f"Saved {len(rows)} flag hops to flag_hops.csv")
print(f"\nSummary:")
print(f"  Total ships queried: {len(results)}")
print(f"  Ships with flag change after designation: {len(rows)}")
print(f"  Percentage: {len(rows)/len(results)*100:.1f}%")
gaps = [r['days_to_hop'] for r in rows]
gaps_sorted = sorted(gaps)
print(f"  Fastest: {min(gaps)} days")
print(f"  Median: {gaps_sorted[len(gaps_sorted)//2]} days")
print(f"  Slowest: {max(gaps)} days")
print(f"  Changed within 30 days: {len([g for g in gaps if g <= 30])}")
print(f"  Changed within 90 days: {len([g for g in gaps if g <= 90])}")