import csv
import re

ships = []

with open('uk_sanctions.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f)
    next(reader)
    headers = next(reader)
    
    for row in reader:
        if len(row) < 52:
            continue
        
        imo_field = row[48].strip()
        date_designated = row[33].strip()
        name = row[4].strip()
        flag = row[51].strip()
        
        imo_match = re.search(r'IMO\s*(\d{7})', imo_field)
        if not imo_match:
            imo_match = re.search(r'\b(\d{7})\b', imo_field)
        
        if imo_match:
            imo = imo_match.group(1)
            ships.append({
                'name': name,
                'imo': imo,
                'date_designated': date_designated,
                'flag': flag
            })

seen = set()
unique_ships = []
for s in ships:
    if s['imo'] not in seen:
        seen.add(s['imo'])
        unique_ships.append(s)

print(f"Unique ships with valid IMO numbers: {len(unique_ships)}")
print("\nLast 10:")
for s in unique_ships[-10:]:
    print(f"  {s['name']} | IMO: {s['imo']} | Designated: {s['date_designated']} | Flag: {s['flag']}")