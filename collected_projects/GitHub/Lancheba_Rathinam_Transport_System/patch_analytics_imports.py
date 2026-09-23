path = "attendance/views.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "from django.db import transaction\nfrom django.http import HttpResponse\n"
new = "from django.db import transaction\nfrom django.db.models import Count, Q\nfrom django.db.models.functions import TruncMonth\nfrom django.http import HttpResponse\n"

assert content.count(old) == 1, f"expected 1, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("imports added")
