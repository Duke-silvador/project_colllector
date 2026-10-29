import re
from playwright.sync_api import sync_playwright
VIN=re.compile(r"\b[A-HJ-NPR-Z0-9]{17}\b")
with sync_playwright() as p:
    pg=p.chromium.launch().new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",viewport={"width":1366,"height":900})
    for u in ["https://www.nag-cars.com/newandusedcars","https://www.nag-cars.com/newandusedcars?PageSize=100&page=1","https://www.nag-cars.com/newandusedcars?PageSize=100&page=2"]:
        pg.goto(u,wait_until="domcontentloaded",timeout=90000); pg.wait_for_timeout(9000)
        h=pg.content(); t=pg.inner_text("body")
        print("URL",u,"VINS",len(set(VIN.findall(h))),"optVin",h.count("i13r_optVin"),re.findall(r"[\d,]+\s+VEHICLES",t,re.I)[:1])
