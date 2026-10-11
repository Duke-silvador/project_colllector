import re

with open("src/pages/Dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find the end of shgTableData
pattern = r"(\{ id: 'SHG006'.*?\})\s*\];"
replacement = r"\1,\n    { id: 'SHG007', name: 'Maa Durga SHG', div: 'North', range: 'Gudgudia', vill: 'Kendumundi', mem: '12 (12W)', st: 11, sav: '₹70,000', bank: '₹1,50,000', act: 'Leaf Plate Making', actClass: 'pill-ntfp', rev: '₹2,50,000', prof: '₹80,000' },\n    { id: 'SHG008', name: 'Maa Samaleswari SHG', div: 'South', range: 'Dukura', vill: 'Dukura', mem: '10 (10W)', st: 10, sav: '₹60,000', bank: '₹1,00,000', act: 'Mushroom Farming', actClass: 'pill-agri', rev: '₹1,80,000', prof: '₹60,000' },\n    { id: 'SHG009', name: 'Maa Bhuasuni SHG', div: 'North', range: 'Barehipani', vill: 'Barehipani', mem: '11 (11W)', st: 10, sav: '₹85,000', bank: '₹2,10,000', act: 'Bamboo Craft', actClass: 'pill-ntfp', rev: '₹3,00,000', prof: '₹95,000' },\n    { id: 'SHG010', name: 'Maa Hingula SHG', div: 'South', range: 'Podadiha', vill: 'Podadiha', mem: '14 (14W)', st: 13, sav: '₹95,000', bank: '₹2,60,000', act: 'Poultry Farming', actClass: 'pill-livestock', rev: '₹4,50,000', prof: '₹1,20,000' },\n    { id: 'SHG011', name: 'Maa Chandi SHG', div: 'North', range: 'Nawana North', vill: 'Nawana', mem: '11 (11W)', st: 11, sav: '₹75,000', bank: '₹1,80,000', act: 'Spices Processing', actClass: 'pill-agri', rev: '₹2,80,000', prof: '₹85,000' }\n  ];"

if "SHG007" not in content:
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    with open("src/pages/Dashboard.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected SHG 007-011")
else:
    print("Already there")
