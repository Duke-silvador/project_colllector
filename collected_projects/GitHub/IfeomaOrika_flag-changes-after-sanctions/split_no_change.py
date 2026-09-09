import json
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

kept_flag = []
went_silent = []
no_history = []

for r in results:
    ship = r['ship']
    history = r['history']
    d = parse_date(ship['date_designated'])
    
    if not history:
        no_history.append(ship)
        continue
    
    changed = False
    for entry in history:
        ed = parse_iso(entry['date_from'])
        if ed and ed > d:
            changed = True
            break
    
    if changed:
        continue
    
    last_seen = max(parse_iso(e['date_to']) for e in history if parse_iso(e['date_to']))
    
    if last_seen > d:
        kept_flag.append({'ship': ship, 'last_seen': last_seen.strftime('%Y-%m-%d'), 'flag': history[-1]['flag']})
    else:
        went_silent.append({'ship': ship, 'last_seen': last_seen.strftime('%Y-%m-%d'), 'flag': history[-1]['flag']})

print(f"No GFW history at all: {len(no_history)}")
print(f"Still transmitting, same flag: {len(kept_flag)}")
print(f"Went silent before or at designation: {len(went_silent)}")
print(f"Total: {len(no_history) + len(kept_flag) + len(went_silent)}")

print("\nSample kept flag:")
for k in kept_flag[:5]:
    print(f"  {k['ship']['name']} | designated {k['ship']['date_designated']} | last seen {k['last_seen']} | {k['flag']}")

print("\nSample went silent:")
for s in went_silent[:5]:
    print(f"  {s['ship']['name']} | designated {s['ship']['date_designated']} | last seen {s['last_seen']} | {s['flag']}")