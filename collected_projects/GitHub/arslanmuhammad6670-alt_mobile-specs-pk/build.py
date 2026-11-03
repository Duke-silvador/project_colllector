#!/usr/bin/env python3
"""MobileSpecs PK v2 — static generator.
Categories: Smartphones, Keypad Phones, Tablets, Laptops.
Add a device = add one entry in PHONES (tuple) or DEVICES (dict), re-run build.py, redeploy.
Prices are stored as approximate Pakistan market prices (PKR) and displayed in USD (RATE below); update here and rebuild.
"""
import json, os, html

BASE = "https://checkspecs.work.gd/"
SITE = "Check Specs"
ROOT = os.path.dirname(os.path.abspath(__file__))
CATFOLDER = {"Smartphones": "phones", "Keypad Phones": "keypad", "Tablets": "tablets", "Laptops": "laptops"}
CATPAGE = {"Smartphones": "smartphones.html", "Keypad Phones": "keypad-phones.html", "Tablets": "tablets.html", "Laptops": "laptops.html"}

# slug,name,brand,price,year,network,display,chipset,ram,storage,maincam,selfie,battery,charging,os,weight,colors,tag
P = [
 ("iphone-16-pro-max","iPhone 16 Pro Max","Apple",574999,2024,"5G",'6.9" LTPO Super Retina XDR OLED, 120Hz, 2868x1320',"Apple A18 Pro","8 GB","256 / 512 GB / 1 TB","48MP wide + 48MP ultrawide + 12MP 5x telephoto","12MP",4685,"25W wireless MagSafe, wired fast charge","iOS 18",227,"Black Titanium, White Titanium, Desert Titanium","Apple ka sabse bara aur taqatwar iPhone"),
 ("iphone-16","iPhone 16","Apple",379999,2024,"5G",'6.1" Super Retina XDR OLED, 2556x1179',"Apple A18","8 GB","128 / 256 / 512 GB","48MP wide + 12MP ultrawide","12MP",3561,"MagSafe wireless, wired fast charge","iOS 18",170,"Black, White, Pink, Teal, Ultramarine","Naya A18 chip aur Camera Control button"),
 ("iphone-15","iPhone 15","Apple",324999,2023,"5G",'6.1" Super Retina XDR OLED, 2556x1179',"Apple A16 Bionic","6 GB","128 / 256 / 512 GB","48MP wide + 12MP ultrawide","12MP",3349,"MagSafe wireless, USB-C","iOS 17",171,"Black, Blue, Pink, Yellow, Green","Dynamic Island ke sath purana flagship rate"),
 ("iphone-14","iPhone 14","Apple",279999,2022,"5G",'6.1" Super Retina XDR OLED, 2532x1170',"Apple A15 Bionic","6 GB","128 / 256 / 512 GB","12MP wide + 12MP ultrawide","12MP",3279,"MagSafe wireless","iOS 16",172,"Blue, Purple, Midnight, Starlight, Red","Ab bhi tez aur bharosemand iPhone"),
 ("iphone-13","iPhone 13","Apple",234999,2021,"5G",'6.1" Super Retina XDR OLED, 2532x1170',"Apple A15 Bionic","4 GB","128 / 256 / 512 GB","12MP wide + 12MP ultrawide","12MP",3240,"MagSafe wireless","iOS 15",174,"Pink, Blue, Midnight, Starlight, Red","Sabse zyada bikne wala purana iPhone"),
 ("samsung-galaxy-s25-ultra","Samsung Galaxy S25 Ultra","Samsung",424999,2025,"5G",'6.9" Dynamic AMOLED 2X, 120Hz, 3120x1440',"Snapdragon 8 Elite","12 GB","256 / 512 GB / 1 TB","200MP wide + 50MP ultrawide + 50MP 5x telephoto + 10MP 3x telephoto","12MP",5000,"45W wired, 15W wireless","Android 15, One UI 7",218,"Titanium Black, Titanium Gray, Titanium Whitesilver","S Pen, 200MP camera aur Galaxy AI"),
 ("samsung-galaxy-s24-ultra","Samsung Galaxy S24 Ultra","Samsung",399999,2024,"5G",'6.8" Dynamic AMOLED 2X, 120Hz, 3120x1440',"Snapdragon 8 Gen 3","12 GB","256 / 512 GB / 1 TB","200MP wide + 50MP 5x telephoto + 12MP ultrawide + 10MP 3x telephoto","12MP",5000,"45W wired, 15W wireless","Android 14, One UI 6.1",232,"Titanium Gray, Titanium Black, Titanium Violet","Titanium body aur 7 saal updates"),
 ("samsung-galaxy-s23","Samsung Galaxy S23","Samsung",249999,2023,"5G",'6.1" Dynamic AMOLED 2X, 120Hz, 2340x1080',"Snapdragon 8 Gen 2","8 GB","128 / 256 GB","50MP wide (OIS) + 10MP 3x telephoto + 12MP ultrawide","12MP",3900,"25W wired, 15W wireless","Android 13, One UI 5.1",168,"Cream, Green, Lavender, Phantom Black","Chota size, flagship taqat"),
 ("samsung-galaxy-z-flip-6","Samsung Galaxy Z Flip 6","Samsung",384999,2024,"5G",'6.7" Foldable Dynamic AMOLED 2X, 120Hz, 2640x1080',"Snapdragon 8 Gen 3","12 GB","256 / 512 GB","50MP wide (OIS) + 12MP ultrawide","10MP",4000,"25W wired, 15W wireless","Android 14, One UI 6.1.1",187,"Yellow, Silver Shadow, Mint, Blue","Jeb mein fold ho jane wala phone"),
 ("samsung-galaxy-a55","Samsung Galaxy A55","Samsung",139999,2024,"5G",'6.6" Super AMOLED, 120Hz, 2340x1080',"Exynos 1480","8 GB","128 / 256 GB","50MP wide (OIS) + 12MP ultrawide + 5MP macro","32MP",5000,"25W wired","Android 14, One UI 6.1",213,"Navy, Lilac, Ice Blue, Lemon","Metal frame, IP67 — mid-range ka mazboot phone"),
 ("samsung-galaxy-a16","Samsung Galaxy A16","Samsung",54999,2024,"4G",'6.7" Super AMOLED, 90Hz, 2340x1080',"MediaTek Helio G99","6 / 8 GB","128 / 256 GB","50MP wide + 5MP ultrawide + 2MP macro","13MP",5000,"25W wired","Android 14, One UI 6.1",200,"Blue Black, Light Green, Gold","6 saal updates wada is qeemat mein"),
 ("samsung-galaxy-a15","Samsung Galaxy A15","Samsung",49999,2024,"4G",'6.5" Super AMOLED, 90Hz, 2340x1080',"MediaTek Helio G99","6 / 8 GB","128 / 256 GB","50MP wide + 5MP ultrawide + 2MP macro","13MP",5000,"25W wired","Android 14, One UI 6",200,"Blue, Light Blue, Yellow","Sasti qeemat mein Super AMOLED display"),
 ("samsung-galaxy-a06","Samsung Galaxy A06","Samsung",32999,2024,"4G",'6.7" PLS LCD, 60Hz, 1600x720',"MediaTek Helio G85","4 / 6 GB","64 / 128 GB","50MP wide + 2MP depth","8MP",5000,"25W wired","Android 14, One UI 6.1",189,"Blue, Gold, Light Green","Samsung ka sabse sasta naya phone"),
 ("redmi-note-13","Redmi Note 13","Xiaomi",54999,2024,"4G",'6.67" AMOLED, 120Hz, 2400x1080',"MediaTek Helio G99 Ultra","8 GB","128 / 256 GB","108MP wide + 8MP ultrawide + 2MP macro","16MP",5000,"33W wired","Android 13, MIUI 14",188,"Mint Green, Midnight Black, Ocean Sunset","108MP camera budget qeemat mein"),
 ("redmi-note-13-pro","Redmi Note 13 Pro","Xiaomi",74999,2024,"4G",'6.67" AMOLED, 120Hz, 2712x1220',"MediaTek Helio G99 Ultra","8 / 12 GB","256 / 512 GB","200MP wide (OIS) + 8MP ultrawide + 2MP macro","16MP",5100,"67W wired","Android 13, MIUI 14",187,"Midnight Black, Lavender Purple, Forest Green","200MP camera aur 67W turbo charging"),
 ("redmi-13","Redmi 13","Xiaomi",39999,2024,"4G",'6.79" IPS LCD, 90Hz, 2460x1080',"MediaTek Helio G91 Ultra","6 / 8 GB","128 / 256 GB","108MP wide + 2MP macro","13MP",5030,"33W wired","Android 14, HyperOS",205,"Midnight Black, Sandy Gold, Ocean Blue","Glass back aur 108MP kam qeemat mein"),
 ("redmi-a3","Redmi A3","Xiaomi",24999,2024,"4G",'6.71" IPS LCD, 90Hz, 1650x720',"MediaTek Helio G36","3 / 4 GB","64 / 128 GB","8MP wide","5MP",5000,"10W wired","Android 14",193,"Midnight Black, Forest Green, Star Blue","Entry level ka bada display phone"),
 ("xiaomi-14","Xiaomi 14","Xiaomi",269999,2024,"5G",'6.36" LTPO AMOLED, 120Hz, 2670x1200',"Snapdragon 8 Gen 3","12 GB","256 / 512 GB","50MP Leica wide (OIS) + 50MP telephoto + 50MP ultrawide","32MP",4610,"90W wired, 50W wireless","Android 14, HyperOS",193,"Black, White, Jade Green","Leica cameras ke sath chota flagship"),
 ("poco-x6-pro","Poco X6 Pro","Xiaomi",84999,2024,"5G",'6.67" AMOLED, 120Hz, 2712x1220',"Dimensity 8300 Ultra","8 / 12 GB","256 / 512 GB","64MP wide (OIS) + 8MP ultrawide + 2MP macro","16MP",5000,"67W wired","Android 14, HyperOS",186,"Black, Yellow, Gray","Gaming performance kam qeemat mein"),
 ("poco-m6-pro","Poco M6 Pro","Xiaomi",54999,2024,"4G",'6.67" AMOLED, 120Hz, 2400x1080',"MediaTek Helio G99 Ultra","8 / 12 GB","256 / 512 GB","64MP wide (OIS) + 8MP ultrawide + 2MP macro","16MP",5000,"67W wired","Android 13, MIUI 14",179,"Black, Blue, Purple","AMOLED aur OIS is rate mein"),
 ("infinix-note-40","Infinix Note 40","Infinix",69999,2024,"4G",'6.78" AMOLED, 120Hz, 2436x1080',"MediaTek Helio G99 Ultimate","8 GB","256 GB","108MP wide (OIS) + 2MP depth","32MP",5000,"45W wired, 20W wireless MagCharge","Android 14, XOS 14",190,"Titan Black, Obsidian Black, Vintage Green","Wireless charging is qeemat mein pehli dafa"),
 ("infinix-hot-40-pro","Infinix Hot 40 Pro","Infinix",45999,2023,"4G",'6.78" IPS LCD, 120Hz, 2460x1080',"MediaTek Helio G99","8 GB","128 / 256 GB","108MP wide + 2MP macro","32MP",5000,"33W wired","Android 13, XOS 13.5",199,"Starlit Black, Palm Blue, Horizon Gold","Budget gaming aur bari screen"),
 ("infinix-hot-40i","Infinix Hot 40i","Infinix",33999,2023,"4G",'6.56" IPS LCD, 90Hz, 1612x720',"Unisoc T606","4 / 8 GB","128 / 256 GB","50MP wide","32MP",5000,"18W wired","Android 13, XOS 13",183,"Starlit Black, Palm Blue, Horizon Gold","32MP selfie kam qeemat mein"),
 ("infinix-smart-8","Infinix Smart 8","Infinix",26999,2023,"4G",'6.6" IPS LCD, 90Hz, 1612x720',"Unisoc T606","3 / 4 GB","64 / 128 GB","13MP wide","8MP",5000,"10W wired","Android 13, XOS 13",184,"Timber Black, Shiny Gold, Crystal Green","Sabse saste mein 90Hz display"),
 ("tecno-camon-30","Tecno Camon 30","Tecno",57999,2024,"4G",'6.78" AMOLED, 120Hz, 2436x1080',"MediaTek Helio G99 Ultimate","8 / 12 GB","256 GB","50MP wide (OIS) + 2MP depth","50MP",5000,"70W wired","Android 14, HiOS 14",199,"Basaltic Dark, Uyuni Salt White, Emerald Lake Green","50MP selfie — camera lovers ke liye"),
 ("tecno-spark-20-pro-plus","Tecno Spark 20 Pro+","Tecno",39999,2024,"4G",'6.78" AMOLED, 120Hz, 2436x1080',"MediaTek Helio G99 Ultimate","8 GB","256 GB","108MP wide","32MP",5000,"33W wired","Android 14, HiOS 14",175,"Temporal Orbit, Lunar Frost, Magic Skin Green","Curved AMOLED sabse kam qeemat mein"),
 ("tecno-spark-20","Tecno Spark 20","Tecno",29999,2023,"4G",'6.6" IPS LCD, 90Hz, 1612x720',"MediaTek Helio G85","8 GB","128 / 256 GB","50MP wide","32MP",5000,"18W wired","Android 13, HiOS 13",179,"Gravity Black, Cyber White, Neon Gold","8GB RAM sabse kam rate mein"),
 ("tecno-pop-8","Tecno Pop 8","Tecno",23999,2023,"4G",'6.6" IPS LCD, 90Hz, 1612x720',"Unisoc T606","3 / 4 GB","64 / 128 GB","13MP wide","8MP",5000,"10W wired","Android 13 (Go edition)",193,"Mystery White, Alpenglow Gold, Gravity Black","Pehla smartphone lene walon ke liye"),
 ("vivo-v30","Vivo V30","Vivo",139999,2024,"5G",'6.78" AMOLED, 120Hz, 2800x1260',"Snapdragon 7 Gen 3","8 / 12 GB","256 GB","50MP wide (OIS) + 50MP ultrawide","50MP",5000,"80W wired","Android 14, Funtouch 14",186,"Peacock Green, Andaman Blue, Lush Green","Aura Light portrait camera"),
 ("vivo-y28","Vivo Y28","Vivo",49999,2024,"4G",'6.68" IPS LCD, 90Hz, 1608x720',"MediaTek Helio G85","8 GB","128 / 256 GB","50MP wide + 2MP depth","8MP",6000,"44W wired","Android 14, Funtouch 14",199,"Agate Green, Gleaming Orange","6000mAh — do din wali battery"),
 ("vivo-y18","Vivo Y18","Vivo",39999,2024,"4G",'6.56" IPS LCD, 90Hz, 1612x720',"MediaTek Helio G85","4 / 6 GB","64 / 128 GB","50MP wide + 0.08MP","5MP",5000,"15W wired","Android 14, Funtouch 14",199,"Mocha Brown, Wave Aqua","Rozana istemal ka bharosemand phone"),
 ("oppo-reno-11","Oppo Reno 11","Oppo",129999,2024,"5G",'6.7" AMOLED, 120Hz, 2412x1080',"Dimensity 8200","8 / 12 GB","256 GB","50MP wide (OIS) + 32MP telephoto + 8MP ultrawide","32MP",5000,"67W wired","Android 14, ColorOS 14",182,"Wave Green, Rock Gray","Portrait telephoto camera specialist"),
 ("oppo-a58","Oppo A58","Oppo",44999,2023,"4G",'6.72" IPS LCD, 60Hz, 2400x1080',"MediaTek Helio G85","6 / 8 GB","128 GB","50MP wide + 2MP depth","8MP",5000,"33W wired","Android 13, ColorOS 13.1",192,"Glowing Black, Dazzling Green","Bara display aur tez charging"),
 ("realme-12-plus","Realme 12+","Realme",59999,2024,"5G",'6.67" AMOLED, 120Hz, 2400x1080',"Dimensity 7050","8 / 12 GB","256 GB","50MP wide (OIS) + 8MP ultrawide + 2MP macro","16MP",5000,"67W wired","Android 14, Realme UI 5.0",190,"Pioneer Green, Navigator Beige","5G aur OIS camera 60 hazar se kam mein"),
 ("realme-c65","Realme C65","Realme",39999,2024,"4G",'6.67" IPS LCD, 90Hz, 1604x720',"MediaTek Helio G85","6 / 8 GB","128 / 256 GB","50MP wide","8MP",5000,"45W wired","Android 14, Realme UI 5.0",185,"Purple Nebula, Black Milky Way","45W charging budget mein"),
 ("honor-x9b","Honor X9b","Honor",129999,2023,"5G",'6.78" AMOLED, 120Hz, 2652x1200',"Snapdragon 6 Gen 1","12 GB","256 GB","108MP wide + 5MP ultrawide + 2MP macro","16MP",5800,"35W wired","Android 13, MagicOS 7.2",185,"Emerald Green, Midnight Black, Sunrise Gold","Anti-drop mazboot screen aur 5800mAh"),
 ("honor-x7b","Honor X7b","Honor",64999,2023,"4G",'6.8" IPS LCD, 90Hz, 2412x1080',"Snapdragon 680","8 GB","256 GB","108MP wide + 5MP ultrawide + 2MP depth","8MP",6000,"35W wired","Android 13, MagicOS 7.2",199,"Flowing Silver, Emerald Green, Midnight Black","6000mAh aur 256GB storage"),
 ("oneplus-12","OnePlus 12","OnePlus",279999,2024,"5G",'6.82" LTPO AMOLED, 120Hz, 3168x1440',"Snapdragon 8 Gen 3","12 / 16 GB","256 / 512 GB","50MP Hasselblad wide (OIS) + 64MP 3x telephoto + 48MP ultrawide","32MP",5400,"100W wired, 50W wireless","Android 14, OxygenOS 14",220,"Silky Black, Flowy Emerald","Sabse tez charging wala flagship"),
 ("google-pixel-8","Google Pixel 8","Google",224999,2023,"5G",'6.2" OLED, 120Hz, 2400x1080',"Google Tensor G3","8 GB","128 / 256 GB","50MP wide (OIS) + 12MP ultrawide","10.5MP",4575,"27W wired, wireless charging","Android 14",187,"Hazel, Obsidian, Rose","Google AI camera — import (non-PTA rate andaza)"),
 ("google-pixel-8-pro","Google Pixel 8 Pro","Google",324999,2023,"5G",'6.7" LTPO OLED, 120Hz, 3120x1440',"Google Tensor G3","12 GB","128 / 256 / 512 GB","50MP wide (OIS) + 48MP ultrawide + 48MP 5x telephoto","10.5MP",5050,"30W wired, wireless charging","Android 14",213,"Bay, Porcelain, Obsidian","Pro camera controls — import (non-PTA rate andaza)"),
 ("nothing-phone-2","Nothing Phone (2)","Nothing",164999,2023,"5G",'6.7" LTPO OLED, 120Hz, 2412x1080',"Snapdragon 8+ Gen 1","8 / 12 GB","128 / 256 / 512 GB","50MP wide (OIS) + 50MP ultrawide","32MP",4700,"45W wired, 15W wireless","Android 13, Nothing OS 2",237,"White, Dark Gray","Glyph lights wala mukhtalif design"),
]
KEYS = ["slug","name","brand","price","year","network","display","chipset","ram","storage","maincam","selfie","battery","charging","os","weight","colors","tag"]

def phone_dev(row):
    p = dict(zip(KEYS, row))
    rows = [("Launch Year", p["year"]), ("Network", p["network"]), ("Display", p["display"]),
            ("Chipset", p["chipset"]), ("RAM", p["ram"]), ("Storage", p["storage"]),
            ("Main Camera", p["maincam"]), ("Selfie Camera", p["selfie"]),
            ("Battery", f"{p['battery']:,} mAh"), ("Charging", p["charging"]),
            ("Operating System", p["os"]), ("Weight", f"{p['weight']} g"), ("Colors", p["colors"])]
    return {"slug": p["slug"], "name": p["name"], "brand": p["brand"], "price": p["price"],
            "year": p["year"], "cat": "Smartphones", "tag": p["tag"], "rows": rows,
            "hl": [p["display"].split(",")[0], f"{p['chipset']} · {p['ram']} RAM",
                   f"{p['maincam'].split('+')[0].strip()} · {p['battery']:,} mAh"]}

# Custom-category devices: keypad phones, tablets, laptops
DEVICES = [
 # ---- Keypad / feature phones ----
 {"slug":"nokia-105-2023","name":"Nokia 105 (2023)","brand":"Nokia","price":5499,"year":2023,"cat":"Keypad Phones","tag":"Torch, FM radio aur lambi battery wala classic keypad",
  "hl":['1.8" display',"2G · Dual SIM","1,000 mAh battery"],
  "rows":[("Launch Year",2023),("Network","2G, Dual SIM"),("Display",'1.8" TFT, 160x128'),("Storage","microSD up to 32 GB (contacts + messages)"),("Camera","No camera"),("Battery","1,000 mAh (removable)"),("Features","FM radio, MP3 player, LED torch, Snake game"),("Operating System","Series 30+"),("Colors","Charcoal, Cyan, Terracotta")]},
 {"slug":"nokia-106-2023","name":"Nokia 106 (2023)","brand":"Nokia","price":4499,"year":2023,"cat":"Keypad Phones","tag":"Sabse sasta Nokia — calls, SMS aur FM radio",
  "hl":['1.8" display',"2G · Dual SIM","1,000 mAh battery"],
  "rows":[("Launch Year",2023),("Network","2G, Dual SIM"),("Display",'1.8" TFT, 160x128'),("Storage","microSD up to 32 GB"),("Camera","No camera"),("Battery","1,000 mAh (removable)"),("Features","FM radio, MP3 player, LED torch, flashlight"),("Operating System","Series 30+"),("Colors","Charcoal, Ocean Blue")]},
 {"slug":"nokia-110-4g-2023","name":"Nokia 110 4G (2023)","brand":"Nokia","price":7499,"year":2023,"cat":"Keypad Phones","tag":"4G keypad phone — camera aur bari battery ke sath",
  "hl":['2.0" display',"4G · Dual SIM","1,450 mAh battery"],
  "rows":[("Launch Year",2023),("Network","4G LTE, Dual SIM"),("Display",'2.0" TFT, 320x240'),("Storage","microSD up to 32 GB"),("Camera","Rear camera (basic)"),("Battery","1,450 mAh (removable)"),("Features","FM radio, MP3 player, torch, voice recorder"),("Operating System","Series 30+"),("Colors","Midnight, Purple")]},
 {"slug":"nokia-130-music","name":"Nokia 130 Music","brand":"Nokia","price":6999,"year":2023,"cat":"Keypad Phones","tag":"Zor daar speaker — gaane sunne walon ke liye keypad",
  "hl":['2.4" display',"2G · Dual SIM","1,450 mAh battery"],
  "rows":[("Launch Year",2023),("Network","2G, Dual SIM"),("Display",'2.4" TFT, 320x240'),("Storage","microSD up to 32 GB"),("Camera","No camera"),("Battery","1,450 mAh (removable)"),("Features","Big loudspeaker, FM radio (wired + wireless), MP3 player, torch"),("Operating System","Series 30+"),("Colors","Dark Blue, Purple, Gray")]},
 {"slug":"nokia-150-2023","name":"Nokia 150 (2023)","brand":"Nokia","price":7999,"year":2023,"cat":"Keypad Phones","tag":"Camera wala keypad, bari keys aur lambi battery",
  "hl":['2.4" display',"2G · Dual SIM","1,450 mAh battery"],
  "rows":[("Launch Year",2023),("Network","2G, Dual SIM"),("Display",'2.4" TFT, 320x240'),("Storage","microSD up to 32 GB"),("Camera","VGA rear camera with flash"),("Battery","1,450 mAh (removable)"),("Features","FM radio, MP3 player, torch, big buttons"),("Operating System","Series 30+"),("Colors","Charcoal, Cyan, Red")]},
 {"slug":"nokia-215-4g","name":"Nokia 215 4G","brand":"Nokia","price":8499,"year":2024,"cat":"Keypad Phones","tag":"4G, Facebook aur Google apps wala keypad phone",
  "hl":['2.4" display',"4G · Dual SIM","1,450 mAh battery"],
  "rows":[("Launch Year",2024),("Network","4G LTE, Dual SIM"),("Display",'2.4" TFT, 320x240'),("Chipset","Unisoc T117"),("Storage","128 MB + microSD up to 32 GB"),("Camera","No camera"),("Battery","1,450 mAh (removable)"),("Features","FM radio, MP3 player, torch, Snake, internet apps"),("Operating System","Series 30+"),("Colors","Black, Peach, Dark Blue")]},
 {"slug":"nokia-225-4g","name":"Nokia 225 4G","brand":"Nokia","price":9499,"year":2024,"cat":"Keypad Phones","tag":"Camera aur 4G ke sath premium keypad",
  "hl":['2.4" display',"4G · Dual SIM","1,450 mAh battery"],
  "rows":[("Launch Year",2024),("Network","4G LTE, Dual SIM"),("Display",'2.4" TFT, 320x240'),("Chipset","Unisoc T117"),("Storage","128 MB + microSD up to 32 GB"),("Camera","VGA rear camera"),("Battery","1,450 mAh (removable)"),("Features","FM radio, MP3 player, torch, Bluetooth"),("Operating System","Series 30+"),("Colors","Black, Dark Blue")]},
 {"slug":"hmd-105","name":"HMD 105","brand":"HMD","price":4299,"year":2024,"cat":"Keypad Phones","tag":"HMD ka apna pehla keypad phone — UPI apps (India) aur torch",
  "hl":['2.0" display',"2G · Dual SIM","1,000 mAh battery"],
  "rows":[("Launch Year",2024),("Network","2G, Dual SIM"),("Display",'2.0" TFT, 320x240'),("Storage","microSD up to 32 GB"),("Camera","No camera"),("Battery","1,000 mAh (removable)"),("Features","FM radio, MP3 player, LED torch, auto call recording"),("Operating System","Series 30+"),("Colors","Black, Purple, Blue")]},
 # ---- Tablets ----
 {"slug":"apple-ipad-10","name":"Apple iPad (10th Generation)","brand":"Apple","price":119999,"year":2022,"cat":"Tablets","tag":"Har kaam ke liye Apple ka entry iPad",
  "hl":['10.9" Liquid Retina',"Apple A14 Bionic","64 / 256 GB"],
  "rows":[("Launch Year",2022),("Display",'10.9" Liquid Retina, 2360x1640'),("Chipset","Apple A14 Bionic"),("RAM","4 GB"),("Storage","64 / 256 GB"),("Main Camera","12MP wide"),("Selfie Camera","12MP ultrawide (landscape)"),("Battery","Up to 10 hours use"),("Operating System","iPadOS 16"),("Weight","477 g"),("Colors","Silver, Blue, Pink, Yellow")]},
 {"slug":"apple-ipad-air-m2","name":"Apple iPad Air 11 (M2)","brand":"Apple","price":219999,"year":2024,"cat":"Tablets","tag":"M2 chip — laptop jaisi taqat patle tablet mein",
  "hl":['11" Liquid Retina',"Apple M2","128 GB – 1 TB"],
  "rows":[("Launch Year",2024),("Display",'11" Liquid Retina, 2368x1648'),("Chipset","Apple M2"),("RAM","8 GB"),("Storage","128 / 256 / 512 GB / 1 TB"),("Main Camera","12MP wide"),("Selfie Camera","12MP ultrawide (landscape)"),("Battery","Up to 10 hours use"),("Operating System","iPadOS 17"),("Weight","462 g"),("Colors","Space Gray, Starlight, Purple, Blue")]},
 {"slug":"samsung-galaxy-tab-a9","name":"Samsung Galaxy Tab A9","brand":"Samsung","price":54999,"year":2023,"cat":"Tablets","tag":"Chota, sasta aur mazboot Samsung tablet",
  "hl":['8.7" TFT 90Hz',"Helio G99","5,100 mAh"],
  "rows":[("Launch Year",2023),("Network","4G LTE (SIM model) / Wi-Fi"),("Display",'8.7" TFT, 90Hz, 1340x800'),("Chipset","MediaTek Helio G99"),("RAM","4 / 8 GB"),("Storage","64 / 128 GB + microSD"),("Main Camera","8MP"),("Selfie Camera","2MP"),("Battery","5,100 mAh"),("Operating System","Android 13, One UI 5.1"),("Weight","332 g"),("Colors","Graphite, Silver, Navy")]},
 {"slug":"samsung-galaxy-tab-s9","name":"Samsung Galaxy Tab S9","brand":"Samsung","price":264999,"year":2023,"cat":"Tablets","tag":"S Pen ke sath flagship AMOLED tablet",
  "hl":['11" Dynamic AMOLED 2X 120Hz',"Snapdragon 8 Gen 2","8,400 mAh"],
  "rows":[("Launch Year",2023),("Network","5G (SIM model) / Wi-Fi"),("Display",'11" Dynamic AMOLED 2X, 120Hz, 2560x1600'),("Chipset","Snapdragon 8 Gen 2"),("RAM","8 / 12 GB"),("Storage","128 / 256 GB + microSD"),("Main Camera","13MP"),("Selfie Camera","12MP ultrawide"),("Battery","8,400 mAh, 45W charging"),("Operating System","Android 13, One UI 5.1"),("Weight","498 g"),("Colors","Graphite, Beige")]},
 {"slug":"xiaomi-pad-6","name":"Xiaomi Pad 6","brand":"Xiaomi","price":114999,"year":2023,"cat":"Tablets","tag":"144Hz display — parhai, video aur gaming teenon ke liye",
  "hl":['11" IPS 144Hz',"Snapdragon 870","8,840 mAh"],
  "rows":[("Launch Year",2023),("Display",'11" IPS LCD, 144Hz, 2880x1800'),("Chipset","Snapdragon 870"),("RAM","6 / 8 GB"),("Storage","128 / 256 GB"),("Main Camera","13MP"),("Selfie Camera","8MP"),("Battery","8,840 mAh, 33W charging"),("Operating System","Android 13, MIUI Pad 14"),("Weight","490 g"),("Colors","Graphite Gray, Mist Blue, Champagne")]},
 {"slug":"redmi-pad-se","name":"Redmi Pad SE","brand":"Xiaomi","price":44999,"year":2023,"cat":"Tablets","tag":"Bari screen, kam qeemat — bachon ki parhai ke liye best",
  "hl":['11" IPS 90Hz',"Snapdragon 680","8,000 mAh"],
  "rows":[("Launch Year",2023),("Display",'11" IPS LCD, 90Hz, 1920x1200'),("Chipset","Snapdragon 680"),("RAM","4 / 6 / 8 GB"),("Storage","128 GB + microSD"),("Main Camera","8MP"),("Selfie Camera","5MP"),("Battery","8,000 mAh"),("Operating System","Android 13, MIUI Pad 14"),("Weight","478 g"),("Colors","Lavender Purple, Graphite Gray, Mint Green")]},
 {"slug":"infinix-xpad","name":"Infinix XPad","brand":"Infinix","price":39999,"year":2024,"cat":"Tablets","tag":"Infinix ka pehla tablet — 11 inch, 4G SIM ke sath",
  "hl":['11" IPS 90Hz',"Helio G99","7,000 mAh"],
  "rows":[("Launch Year",2024),("Network","4G LTE, SIM"),("Display",'11" IPS LCD, 90Hz, 1920x1200'),("Chipset","MediaTek Helio G99"),("RAM","4 / 8 GB"),("Storage","128 / 256 GB + microSD"),("Main Camera","8MP"),("Selfie Camera","8MP"),("Battery","7,000 mAh, 18W charging"),("Operating System","Android 14, XOS 14"),("Weight","496 g"),("Colors","Titan Gold, Frost Blue, Stellar Grey")]},
 {"slug":"lenovo-tab-m11","name":"Lenovo Tab M11","brand":"Lenovo","price":47999,"year":2024,"cat":"Tablets","tag":"Pen support ke sath parhai wala tablet",
  "hl":['11" IPS 90Hz',"Helio G88","7,040 mAh"],
  "rows":[("Launch Year",2024),("Network","4G LTE (SIM model) / Wi-Fi"),("Display",'11" IPS LCD, 90Hz, 1920x1200'),("Chipset","MediaTek Helio G88"),("RAM","4 / 8 GB"),("Storage","64 / 128 GB + microSD"),("Main Camera","13MP"),("Selfie Camera","8MP"),("Battery","7,040 mAh"),("Operating System","Android 13"),("Weight","465 g"),("Colors","Luna Grey, Seafoam Green")]},
 # ---- Laptops ----
 {"slug":"apple-macbook-air-m3","name":"Apple MacBook Air 13 (M3)","brand":"Apple","price":374999,"year":2024,"cat":"Laptops","tag":"Fan ke baghair khamosh, phir bhi tez tareen halka laptop",
  "hl":['13.6" Liquid Retina',"Apple M3","8 GB RAM · 256 GB SSD"],
  "rows":[("Launch Year",2024),("Display",'13.6" Liquid Retina, 2560x1664'),("Processor","Apple M3 (8-core CPU, 10-core GPU)"),("RAM","8 / 16 / 24 GB"),("Storage","256 / 512 GB / 1 TB SSD"),("Battery","Up to 18 hours"),("Operating System","macOS Sonoma"),("Weight","1.24 kg"),("Ports","2x Thunderbolt USB-C, MagSafe, 3.5mm jack"),("Colors","Midnight, Starlight, Silver, Space Gray")]},
 {"slug":"apple-macbook-pro-14-m3-pro","name":"Apple MacBook Pro 14 (M3 Pro)","brand":"Apple","price":719999,"year":2023,"cat":"Laptops","tag":"Video editing aur pro kaam ke liye Apple ki taqat",
  "hl":['14.2" Liquid Retina XDR 120Hz',"Apple M3 Pro","18 GB RAM · 512 GB SSD"],
  "rows":[("Launch Year",2023),("Display",'14.2" Liquid Retina XDR, 120Hz, 3024x1964'),("Processor","Apple M3 Pro (11-core CPU, 14-core GPU)"),("RAM","18 / 36 GB"),("Storage","512 GB / 1 TB / 2 TB SSD"),("Battery","Up to 18 hours"),("Operating System","macOS Sonoma"),("Weight","1.55 kg"),("Ports","HDMI, SD card, 3x Thunderbolt, MagSafe"),("Colors","Space Black, Silver")]},
 {"slug":"hp-pavilion-15","name":"HP Pavilion 15 (Core i5 13th Gen)","brand":"HP","price":184999,"year":2023,"cat":"Laptops","tag":"Office, parhai aur ghar — har kaam ka bharosa",
  "hl":['15.6" Full HD',"Intel Core i5-1335U","16 GB RAM · 512 GB SSD"],
  "rows":[("Launch Year",2023),("Display",'15.6" IPS Full HD, 1920x1080'),("Processor","Intel Core i5-1335U (10 cores)"),("Graphics","Intel Iris Xe"),("RAM","16 GB DDR4"),("Storage","512 GB NVMe SSD"),("Battery","41 Wh, fast charge"),("Operating System","Windows 11 Home"),("Weight","1.75 kg"),("Colors","Natural Silver")]},
 {"slug":"dell-inspiron-3530","name":"Dell Inspiron 15 3530","brand":"Dell","price":179999,"year":2023,"cat":"Laptops","tag":"120Hz screen ke sath rozana ka mazboot laptop",
  "hl":['15.6" Full HD 120Hz',"Intel Core i5-1335U","16 GB RAM · 512 GB SSD"],
  "rows":[("Launch Year",2023),("Display",'15.6" IPS Full HD, 120Hz, 1920x1080'),("Processor","Intel Core i5-1335U (10 cores)"),("Graphics","Intel Iris Xe"),("RAM","8 / 16 GB DDR4"),("Storage","512 GB NVMe SSD"),("Battery","41 Wh"),("Operating System","Windows 11 Home"),("Weight","1.62 kg"),("Colors","Carbon Black, Platinum Silver")]},
 {"slug":"lenovo-ideapad-slim-3","name":"Lenovo IdeaPad Slim 3 (Ryzen 5)","brand":"Lenovo","price":149999,"year":2023,"cat":"Laptops","tag":"Is qeemat mein sabse acha all-rounder",
  "hl":['15.6" Full HD',"AMD Ryzen 5 7530U","16 GB RAM · 512 GB SSD"],
  "rows":[("Launch Year",2023),("Display",'15.6" IPS Full HD, 1920x1080'),("Processor","AMD Ryzen 5 7530U (6 cores)"),("Graphics","AMD Radeon (integrated)"),("RAM","8 / 16 GB"),("Storage","512 GB NVMe SSD"),("Battery","47 Wh"),("Operating System","Windows 11 Home"),("Weight","1.62 kg"),("Colors","Arctic Grey, Abyss Blue")]},
 {"slug":"asus-vivobook-15","name":"Asus Vivobook 15 (Core i5 12th Gen)","brand":"Asus","price":169999,"year":2023,"cat":"Laptops","tag":"Halka, patla aur rangon wala rozana laptop",
  "hl":['15.6" Full HD',"Intel Core i5-1235U","16 GB RAM · 512 GB SSD"],
  "rows":[("Launch Year",2023),("Display",'15.6" IPS Full HD, 1920x1080'),("Processor","Intel Core i5-1235U (10 cores)"),("Graphics","Intel Iris Xe"),("RAM","8 / 16 GB DDR4"),("Storage","512 GB NVMe SSD"),("Battery","42 Wh"),("Operating System","Windows 11 Home"),("Weight","1.70 kg"),("Colors","Quiet Blue, Cool Silver, Terracotta")]},
 {"slug":"acer-aspire-5","name":"Acer Aspire 5 (Core i5 13th Gen)","brand":"Acer","price":174999,"year":2023,"cat":"Laptops","tag":"Metal body aur backlit keyboard kam qeemat mein",
  "hl":['15.6" Full HD IPS',"Intel Core i5-1335U","16 GB RAM · 512 GB SSD"],
  "rows":[("Launch Year",2023),("Display",'15.6" IPS Full HD, 1920x1080'),("Processor","Intel Core i5-1335U (10 cores)"),("Graphics","Intel Iris Xe"),("RAM","16 GB"),("Storage","512 GB NVMe SSD"),("Battery","50 Wh"),("Operating System","Windows 11 Home"),("Weight","1.78 kg"),("Colors","Steel Gray")]},
 {"slug":"hp-victus-15-gaming","name":"HP Victus 15 Gaming (RTX 4050)","brand":"HP","price":289999,"year":2023,"cat":"Laptops","tag":"144Hz aur RTX 4050 — gaming shuru karne ke liye best",
  "hl":['15.6" Full HD 144Hz',"Intel Core i5-13420H · RTX 4050","16 GB RAM · 512 GB SSD"],
  "rows":[("Launch Year",2023),("Display",'15.6" IPS Full HD, 144Hz, 1920x1080'),("Processor","Intel Core i5-13420H (8 cores)"),("Graphics","NVIDIA GeForce RTX 4050 6 GB"),("RAM","16 GB DDR4"),("Storage","512 GB NVMe SSD"),("Battery","70 Wh"),("Operating System","Windows 11 Home"),("Weight","2.29 kg"),("Colors","Mica Silver, Performance Blue")]},
]

# ---- Prices are stored in PKR; the site DISPLAYS USD only (user order 2026-11-02). Rate: mid-market 2026-11-02 ----
RATE = 276.7  # USD/PKR mid-market rate, checked 2026-11-02 (Finnhub/Wise: 276.71); re-check at rebuilds
def usd(n): return round(n / RATE)

# ---- Expansion packs (verified new models, added in batches) ----
import glob as _g2, json as _j2
EXPAND = []
for _f in sorted(_g2.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), "verified", "expand-*.json"))):
    with open(_f, encoding="utf-8") as _fh:
        for _d in _j2.load(_fh):
            _d["src"] = _d.get("source", "")
            EXPAND.append(_d)

ALL = [phone_dev(r) for r in P] + DEVICES + EXPAND

# ---- Price fixes (Phase 1, 2026-11-03): verified prices for released models
# that arrived without one (PriceOye, else GSMArena price converted) ----
_pf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verified", "prices-fix.json")
if os.path.exists(_pf):
    _fixes = json.load(open(_pf, encoding="utf-8"))
    _n = 0
    for _d in ALL:
        if _d["slug"] in _fixes and _fixes[_d["slug"]] is not None:
            _d["price"] = _fixes[_d["slug"]]; _n += 1
    if _n: print(f"PRICE FIXES APPLIED: {_n}")
for d in ALL:
    d["folder"] = CATFOLDER[d["cat"]]
    if not any(k == "Price in Pakistan" for k, _ in d["rows"]):
        d["rows"] = d["rows"] + [("Price in Pakistan", "")]
    d["rows"] = [(("Price" if k == "Price in Pakistan" else k), (f"Rs {d['price']:,} · ${usd(d['price']):,}" if k == "Price in Pakistan" and d['price'] is not None else ("Price not announced" if k == "Price in Pakistan" else v))) for k, v in d["rows"]]

# ---- Verified specs override (GSMArena/official sources, verified 2026-11-02) ----
import re as _re, glob as _glob
VER = {}
for _f in sorted(_glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), "verified", "batch-*.json"))):
    with open(_f, encoding="utf-8") as _fh:
        for _k, _v in json.load(_fh).items():
            if not _k.startswith("_") and isinstance(_v, dict) and "rows" in _v:
                VER[_k] = _v

def _hl_from_rows(d):
    rd = {k: str(v) for k, v in d["rows"]}
    disp = rd.get("Display", "")
    size = disp.split('"')[0] + '"' if '"' in disp else disp.split(",")[0]
    hz = ""
    _m = _re.search(r"(\d+)\s*Hz", disp)
    if _m and d["cat"] == "Tablets": hz = " " + _m.group(1) + "Hz"
    chip = (rd.get("Chipset") or rd.get("Processor") or "").split("(")[0].split(",")[0].strip()
    ram = rd.get("RAM", "")
    if ram and "RAM" not in ram and "GB" in ram: ram += " RAM"
    batt = rd.get("Battery", "")
    out = [x for x in [size + hz, chip, ram, batt] if x]
    return out if len(out) >= 3 else d["hl"]

for d in ALL:
    _v = VER.get(d["slug"])
    if not _v: continue
    d["rows"] = [(str(k), str(val)) for k, val in _v["rows"]]
    d["src"] = _v.get("source", "")
    _rd = {k: val for k, val in d["rows"]}
    _ly = _rd.get("Launch Year")
    if _ly:
        _m = _re.search(r"(19|20)\d{2}", str(_ly))
        if _m: d["year"] = int(_m.group(0))
    if d["cat"] in ("Smartphones", "Tablets"):
        d["hl"] = _hl_from_rows(d)
    d["rows"] = d["rows"] + [("Price", f"Rs {d['price']:,} · ${usd(d['price']):,}" if d['price'] is not None else "Price not announced")]
print(f"VERIFIED OVERRIDES APPLIED: {sum(1 for d in ALL if d.get('src'))}/{len(ALL)}")

# ---- Comms/Sound enrichment (GSMArena detail rows fetched by enrich_comms.py; adds ONLY missing rows) ----
COMMS = {}
_cf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verified", "comms.json")
if os.path.exists(_cf):
    with open(_cf, encoding="utf-8") as _fh: COMMS = json.load(_fh)
for d in ALL:
    _c = COMMS.get(d["slug"])
    if not _c: continue
    _have = {k for k, _ in d["rows"]}
    for _k in ["Loudspeaker", "3.5mm Jack", "Wi-Fi", "Bluetooth", "GPS", "NFC", "Radio", "USB", "SIM"]:
        if _k in _c and _k not in _have:
            d["rows"] = d["rows"] + [(_k, _c[_k])]
print(f"COMMS ENRICHMENT APPLIED: {sum(1 for d in ALL if COMMS.get(d['slug']))}/{len(ALL)}")

# ---- De-duplication (Phase 1 data accuracy, 2026-11-03): the same slug can
# arrive from both the base list and an expansion pack. Keep ONE record per
# slug — the richest spec table wins; ties break toward a priced record,
# then toward one carrying a source URL.
_best = {}
for _d in ALL:
    _k = _d["slug"]
    _score = (len(_d["rows"]), 1 if _d.get("price") is not None else 0, 1 if _d.get("src") else 0)
    if _k not in _best or _score > _best[_k][0]:
        _best[_k] = (_score, _d)
if len(_best) < len(ALL):
    print(f"DEDUP: removed {len(ALL) - len(_best)} duplicate records")
ALL = [_v[1] for _v in _best.values()]

# Alias duplicates: the same phone can exist as "iphone-14" (base list) and
# "apple-iphone-14" (expansion). When stripping a leading "apple-" yields an
# existing slug for the same model name, drop the alias record.
_slugs_now = {d["slug"] for d in ALL}
_alias_drop = set()
for _d in ALL:
    _s = _d["slug"]
    if _s.startswith("apple-iphone-") and _s[len("apple-"):] in _slugs_now:
        _twin = next(x for x in ALL if x["slug"] == _s[len("apple-"):])
        if _d["name"].replace("Apple ", "") == _twin["name"].replace("Apple ", ""):
            _alias_drop.add(_s)
# Named alias duplicate (user-approved fix, 2026-11-03): the GSMArena "_5g"
# harvest of the OnePlus Ace 7 Pro is the SAME phone as oneplus-ace-7-pro
# (identical name and specs, wrong second price). Drop the alias record so a
# future pipeline re-add can never render it again. Narrow on purpose: other
# "-5g" slugs (Galaxy A07 5G, Vivo X500 5G pages) are distinct records.
for _alias, _base in (("oneplus-ace-7-pro-5g", "oneplus-ace-7-pro"),):
    if _alias in _slugs_now and _base in _slugs_now:
        _a = next(x for x in ALL if x["slug"] == _alias)
        _b = next(x for x in ALL if x["slug"] == _base)
        if _a["name"].strip().lower() == _b["name"].strip().lower():
            _alias_drop.add(_alias)
if _alias_drop:
    print(f"DEDUP ALIAS: removed {len(_alias_drop)} alias records: {sorted(_alias_drop)}")
    ALL = [d for d in ALL if d["slug"] not in _alias_drop]

# ---- Gap fixes (Phase 1): verified rows for fields a record is missing ----
_gf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verified", "gaps-fix.json")
if os.path.exists(_gf):
    _gaps = json.load(open(_gf, encoding="utf-8"))
    for _d in ALL:
        if _d["slug"] in _gaps:
            _have = {k for k, _ in _d["rows"]}
            for _k, _v in _gaps[_d["slug"]]:
                if _k not in _have:
                    _d["rows"].append((_k, _v))

# ---- FINAL price-row normalization (bug fix 2026-11-03): the specs table's
# Price row must ALWAYS match the record's price (the same value the header,
# title and JSON-LD use). Drop every inherited Price row, then append exactly
# one correct row per device. ----
for _d in ALL:
    _d["rows"] = [(k, v) for k, v in _d["rows"] if k not in ("Price", "Price in Pakistan")]
    _d["rows"] = _d["rows"] + [("Price", f"Rs {_d['price']:,} · ${usd(_d['price']):,}" if _d['price'] is not None else "Price not announced")]

# ---- Brand name normalization (user order 2026-11-03): harvested records
# carry GSMArena casing ("vivo") while base records use "Vivo" — merge them
# into ONE canonical brand so the homepage shows a single tile/page per brand.
_BRAND_CANON = {"vivo": "Vivo", "iqoo": "iQOO", "oneplus": "OnePlus", "oppo": "Oppo",
                "realme": "Realme", "infinix": "Infinix", "tecno": "Tecno", "hmd": "HMD",
                "hp": "HP", "samsung": "Samsung", "apple": "Apple", "xiaomi": "Xiaomi",
                "google": "Google", "honor": "Honor", "huawei": "Huawei",
                "motorola": "Motorola", "nokia": "Nokia", "nothing": "Nothing",
                "lenovo": "Lenovo", "dell": "Dell", "asus": "Asus", "acer": "Acer"}
for _d in ALL:
    _canon = _BRAND_CANON.get(str(_d.get("brand", "")).strip().lower())
    if _canon: _d["brand"] = _canon

# ---- Flat single-table specs (user order 2026-11-02: ONE table, no big section headings,
# small labels, every detail its own row — GSMArena style) ----
import re as _re2
_ORDER = ["Launch Year", "Network", "Display", "Screen Size", "Resolution", "Protection",
          "Dimensions", "Weight", "Build", "SIM", "Operating System", "Chipset", "CPU", "GPU",
          "Processor", "Graphics", "RAM", "Storage", "Main Camera", "Main Camera Video",
          "Selfie Camera", "Selfie Camera Video", "Camera", "Loudspeaker", "3.5mm Jack",
          "Wi-Fi", "Bluetooth", "GPS", "NFC", "Radio", "USB", "Ports", "Fingerprint", "Sensors",
          "Features", "Battery", "Charging", "Colors", "Price"]
def _segs(v): return [p.strip() for p in str(v).split(";") if p.strip()]
def _split_body(v):
    dims, build, sim = [], [], None
    for s in _segs(v):
        low = s.lower()
        if "sim" in low and "glass" not in low and "frame" not in low and "back" not in low and len(s) < 160: sim = s
        elif _re2.search(r"\d\s*[x×]\s*\d", s) and "mm" in s: dims.append(s)
        else:
            m = _re2.search(r",\s*((?:Nano-|Micro-)?SIM[^,;]*)$", s)
            if m and sim is None:
                sim = m.group(1); s = s[:m.start()].rstrip(" ,")
            build.append(s)
    out = []
    if dims:
        j = "; ".join(dims)
        m = _re2.search(r",?\s*(\d+(?:\.\d+)?\s*(?:g|kg))\s*$", j)
        if m:
            out.append(("Weight", m.group(1)))
            j = j[:m.start()].rstrip(" ,;")
        out.append(("Dimensions", j))
    if build: out.append(("Build", "; ".join(build)))
    if sim: out.append(("SIM", sim))
    return out or [("Body", str(v))]
def _split_display(v):
    p = _segs(v)
    if len(p) < 2: return [("Display", str(v))]
    out = [("Display", p[0])]
    size, res, prot = [], [], []
    for s in p[1:]:
        m = _re2.match(r"([\d.]+\s*inches[^,]*),\s*(.*)", s)
        if m and "pixels" in s: size.append(m.group(1)); res.append(m.group(2))
        elif _re2.match(r"[\d.]+\s*inches", s): size.append(s)
        elif "pixels" in s: res.append(s)
        else: prot.append(s)
    if size: out.append(("Screen Size", "; ".join(size)))
    if res: out.append(("Resolution", "; ".join(res)))
    if prot: out.append(("Protection", "; ".join(prot)))
    return out
def _split_chipset(v):
    chip, cpu, gpu = [], [], []
    for s in _segs(v):
        if "GPU" in s: gpu.append(s)
        elif "CPU" in s or _re2.search(r"-(core)\b", s): cpu.append(s)
        else: chip.append(s)
    out = []
    if chip: out.append(("Chipset", "; ".join(chip)))
    if cpu: out.append(("CPU", "; ".join(_re2.sub(r"^CPU\s+", "", s) for s in cpu)))
    if gpu: out.append(("GPU", "; ".join(_re2.sub(r"^GPU\s+", "", s) for s in gpu)))
    return out or [("Chipset", str(v))]
def _split_cam(v, label):
    main, vid = [], []
    for s in _segs(v):
        if s.lower().startswith("video"): vid.append(_re2.sub(r"^video\s+", "", s, flags=_re2.I))
        else: main.append(s)
    out = []
    if main: out.append((label, "; ".join(main)))
    if vid: out.append((label + " Video", "; ".join(vid)))
    return out or [(label, str(v))]
def _split_sensors(v):
    m = _re2.search(r"Fingerprint\s*\(([^)]*)\)\s*,?\s*", str(v))
    if not m: return [("Sensors", str(v))]
    fp = m.group(1).strip()
    rest = (str(v)[:m.start()] + str(v)[m.end():]).strip(" ,;")
    out = [("Fingerprint", fp[:1].upper() + fp[1:])]
    if rest: out.append(("Sensors", rest))
    return out
def _flat_rows(d):
    out = []
    for k, v in d["rows"]:
        v = str(v)
        if k == "Body": out += _split_body(v)
        elif k == "Display": out += _split_display(v)
        elif k == "Chipset": out += _split_chipset(v)
        elif k == "Main Camera": out += _split_cam(v, "Main Camera")
        elif k == "Selfie Camera": out += _split_cam(v, "Selfie Camera")
        elif k == "Sensors/Features": out += _split_sensors(v)
        elif k == "Sound": out.append(("Loudspeaker", v))
        elif k == "WLAN": out.append(("Wi-Fi", v))
        elif k == "Positioning": out.append(("GPS", v))
        else: out.append((k, v))
    seen = set(); ded = []
    for kv in out:
        if kv[0] in seen: continue
        seen.add(kv[0]); ded.append(kv)
    order = {name: i for i, name in enumerate(_ORDER)}
    return [ded[i] for i in sorted(range(len(ded)), key=lambda i: (order.get(ded[i][0], 500), i))]

# ---- Color images (verified per-color renders; added model by model) ----
_imgf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "verified", "images.json")
IMAGES = json.load(open(_imgf, encoding="utf-8")) if os.path.exists(_imgf) else {}
for d in ALL:
    d["images"] = IMAGES.get(d["slug"], [])
    _main = os.path.join(ROOT, "img", d["slug"], "main.jpg")
    d["hero"] = d["images"][0]["file"] if d["images"] else (f'img/{d["slug"]}/main.jpg' if os.path.exists(_main) else "")
    _hw = d["hero"].rsplit(".", 1)[0] + ".webp" if d["hero"] else ""
    d["hero_webp"] = _hw if _hw and os.path.exists(os.path.join(ROOT, _hw)) else ""
    for _im in d["images"]:
        _w = _im["file"].rsplit(".", 1)[0] + ".webp"
        _im["webp"] = _w if os.path.exists(os.path.join(ROOT, _w)) else ""

# ---- Model status (Continued / Discontinued) — verified/status*.json overrides win; default by year ----
_status_over = {}
for _sp in sorted(_glob.glob(os.path.join(ROOT, "verified", "status*.json"))):
    with open(_sp, encoding="utf-8") as _f: _status_over.update(json.load(_f))
for d in ALL:
    d["status"] = _status_over.get(d["slug"], "Continued" if d["year"] >= 2024 else "Discontinued")

def pkr(n): return "$" + f"{usd(n):,}" if n is not None else "Price not announced"
def pkrtitle(n): return f"Rs {n:,} (${usd(n):,})" if n is not None else "Price not announced"
def pic(src, webp, cls, alt, base="", lazy=True):
    im = f'<img class="{cls}" src="{base}{src}" alt="{esc(alt)}"{" loading=\"lazy\"" if lazy else ""}>'
    return f'<picture><source type="image/webp" srcset="{base}{webp}">{im}</picture>' if webp else im
def dual(n): return f"<span class=\"prc\" data-pkr=\"{n}\"><b class=\"pkrv\">Rs {n:,}</b> <span class=\"usdv\">${usd(n):,}</span></span>" if n is not None else "<span class=\"usdv\">Price not announced</span>"
def esc(s): return html.escape(str(s))
BRANDS = sorted({d["brand"] for d in ALL})
CATS = list(CATFOLDER.keys())
def bslug(b): return b.lower().replace(" ", "-")

CSS = """
*{box-sizing:border-box}body{margin:0;font-family:system-ui,Segoe UI,Arial,sans-serif;background:#f6f7f9;color:#17202a}
header{background:linear-gradient(90deg,#081230,#0b1e3f);color:#fff;position:sticky;top:0;z-index:9}
.hwrap{display:flex;align-items:center;gap:10px}
.logo-ic{background:#1677ff;border-radius:8px;padding:2px 6px;margin-right:7px;font-size:17px}
.tagline{font-size:10.5px;color:#9db8dd;letter-spacing:.04em}@media(max-width:700px){.tagline{display:none}}
.curpill{margin-left:auto;background:#ffffff1c;border:1px solid #ffffff38;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:700;white-space:nowrap}
.cursel{margin-left:auto;background:#12295e;color:#fff;border:1px solid #ffffff38;border-radius:999px;padding:5px 10px;font-size:13px;font-weight:700;max-width:48vw;cursor:pointer}
header .wrap,main{max-width:1100px;margin:0 auto}header a{color:#fff;text-decoration:none}
header .wrap{padding:11px 16px}
.logo{font-size:22px;font-weight:800;vertical-align:middle}.logo span{color:#38bdf8}
.menubtn{display:none;background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:4px 10px 4px 0;vertical-align:middle}
.navbar{background:#060d24;border-bottom:1px solid #ffffff1f}
.navbar .wrap{display:flex;gap:20px;overflow-x:auto;padding-top:0;padding-bottom:0;scrollbar-width:none}
.navbar a{color:#dbe7ff;font-size:13.5px;font-weight:700;padding:10px 2px;white-space:nowrap;text-transform:uppercase;letter-spacing:.02em}
@media(max-width:700px){.menubtn{display:inline-block}.navbar{display:none}.navbar.open{display:block}.navbar .wrap{flex-direction:column;gap:0}.navbar a{padding:12px 2px;border-top:1px solid #cfdcd6}}
.sec{text-transform:uppercase;letter-spacing:.03em;color:#0b1e3f;border-bottom:2px solid #0b1e3f;padding-bottom:6px}
.glabel{font-weight:800;color:#0b1e3f;font-size:17px;margin:20px 0 6px}
.pkrv{color:#d92d20}.usdv{color:#8a94a6;font-size:13px;font-weight:600}
.hero2{position:relative;overflow:hidden;background:radial-gradient(600px 300px at 85% 20%,#1d4ed8cc,transparent),radial-gradient(500px 260px at 70% 90%,#0ea5e955,transparent),linear-gradient(120deg,#081230,#0b1e3f 55%,#10315f);border-radius:16px;padding:34px 30px;color:#fff;margin-bottom:8px}
.hero2 h1{margin:0 0 8px;font-size:38px;line-height:1.12;max-width:560px}.hero2 h1 span{color:#38bdf8}
.hero2 p{margin:0 0 18px;color:#c7d6f2;max-width:520px}
.hsearch{display:flex;gap:0;background:#fff;border-radius:999px;padding:5px;max-width:560px;box-shadow:0 8px 24px #0006}
.hsearch input{flex:1;border:0;outline:0;font-size:16px;padding:10px 16px;border-radius:999px;min-width:0}
.hsearch button{background:#1677ff;color:#fff;border:0;border-radius:999px;padding:11px 26px;font-size:15px;font-weight:800;cursor:pointer}
.pills{margin-top:16px;display:flex;gap:10px;flex-wrap:wrap}
.pill{background:#ffffff14;border:1px solid #ffffff30;color:#fff;border-radius:999px;padding:7px 15px;font-size:13.5px;font-weight:700;text-decoration:none}
.hero-phone{position:absolute;right:26px;top:50%;transform:translateY(-50%);height:250px;filter:drop-shadow(0 18px 28px #0009);z-index:0;pointer-events:none}
.hero2 h1,.hero2 p,.hsearch,.pills{position:relative;z-index:1}
@media(max-width:820px){.hero-phone{display:none}.hero2{padding:24px 18px}.hero2 h1{font-size:29px}}
.brands{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:12px;margin:12px 0 6px}
.btile{background:#fff;border:1px solid #e4e9f2;border-radius:12px;padding:16px 8px;text-align:center;text-decoration:none;display:flex;flex-direction:column;gap:5px;align-items:center;justify-content:center;min-height:86px;box-shadow:0 1px 3px #0001}
.btile b{font-size:17px}.btile span{font-size:11.5px;color:#8a94a6}
.trend-wrap{display:grid;grid-template-columns:1fr 302px;gap:16px;align-items:start}
@media(max-width:920px){.trend-wrap{grid-template-columns:1fr}}
.tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(198px,1fr));gap:14px}
.tcard{background:#fff;border-radius:14px;box-shadow:0 2px 10px #00000014;overflow:hidden;display:flex;flex-direction:column;position:relative;transition:transform .15s ease,box-shadow .15s ease}
.tcard:hover{transform:translateY(-3px);box-shadow:0 10px 24px #00000022}
.tcard .fthumb{height:170px}.tbody{padding:12px 14px 14px;display:flex;flex-direction:column;gap:5px;flex:1}.tbody b{font-size:15.5px}
.rail{display:flex;flex-direction:column;gap:14px}
.cmp-panel{background:linear-gradient(160deg,#0b1e3f,#081230);color:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 10px #0003}
.cmp-panel h3{margin:0 0 6px;font-size:19px}.cmp-panel p{margin:0 0 14px;color:#c7d6f2;font-size:13.5px}
.cmp-panel .vs{font-size:30px;text-align:center;margin:6px 0 12px}
.budget-panel{background:#eafaf0;border:1px solid #bfe6cc;border-radius:14px;padding:18px 20px}
.budget-panel h3{margin:0 0 4px;font-size:17px;color:#0b3d2e}.budget-panel p{margin:0 0 12px;font-size:13px;color:#3c5a4a}
.highlights{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;background:#fff;border-radius:14px;box-shadow:0 1px 4px #0001;padding:18px;margin-top:22px}
.highlights div{font-size:13px;color:#667}.highlights b{display:block;font-size:15px;color:#0b1e3f;margin-bottom:2px}
.feat{display:flex;gap:14px;overflow-x:auto;padding:8px 2px 16px;scroll-snap-type:x mandatory}
.fcard{min-width:225px;max-width:225px;scroll-snap-align:start;background:#fff;border-radius:14px;box-shadow:0 1px 4px #0001;overflow:hidden;text-decoration:none;color:#17202a;display:flex;flex-direction:column}
.fthumb{height:150px;display:flex;align-items:center;justify-content:center;font-size:50px;background:linear-gradient(180deg,#f2f6fb,#e4ecf7);overflow:hidden}
.fthumb img{width:100%;height:100%;object-fit:contain;padding:8px}
.fbody{padding:12px 14px}.fbody b{font-size:15.5px;display:block;margin-bottom:4px}
main{padding:18px 14px 40px}
.hero{background:#fff;border-radius:14px;padding:22px;box-shadow:0 1px 4px #0001}
.hero h1{margin:0 0 6px;font-size:26px}.hero p{margin:0 0 14px;color:#555}
.search{width:100%;padding:13px 14px;border:2px solid #0b1e3f;border-radius:10px;font-size:16px}
.chips{margin:12px 0}.chip{display:inline-block;background:#e8f1ff;color:#0b1e3f;padding:6px 12px;border-radius:999px;margin:0 6px 8px 0;text-decoration:none;font-size:13px;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-top:16px}
.card{background:#fff;border-radius:16px;padding:0;box-shadow:0 2px 10px #00000014;display:flex;flex-direction:column;position:relative;overflow:hidden;transition:transform .15s ease,box-shadow .15s ease}
.card:hover{transform:translateY(-3px);box-shadow:0 10px 24px #00000022}
.cardimg{width:100%;height:175px;object-fit:contain;background:linear-gradient(180deg,#f2f6fb,#e4ecf7);padding:12px}
.cardph{height:175px;display:flex;align-items:center;justify-content:center;font-size:56px;background:linear-gradient(180deg,#eef3fb,#dbe7f7)}
.cbody{padding:12px 16px 16px;display:flex;flex-direction:column;gap:6px;flex:1}
.rsp{color:#666;font-size:13.5px;font-weight:600}
.btnrow{display:flex;gap:8px;margin-top:auto}.btnrow .btn{flex:1;margin-top:0}
.phero{background:#fff;border-radius:14px;box-shadow:0 1px 4px #0001;padding:16px;margin:12px 0;text-align:center}
.hero-img{max-width:100%;max-height:340px;object-fit:contain}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 10px}
.tabbtn{border:1.5px solid #0b1e3f;background:#fff;color:#0b1e3f;padding:8px 15px;border-radius:999px;font-weight:700;font-size:13.5px;cursor:pointer}
.tabbtn.active{background:#0b1e3f;color:#fff}
.tpanel{display:none}.tpanel.on{display:block}
.badge{position:absolute;top:10px;right:10px;font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:999px;color:#fff;text-transform:uppercase;letter-spacing:.04em;z-index:2}
.badge.cont{background:#0b3d2e}.badge.disc{background:#c62828}
.badge2{display:inline-block;font-size:12px;font-weight:800;padding:4px 12px;border-radius:999px;color:#fff;text-transform:uppercase;letter-spacing:.04em}
.badge2.cont{background:#0b3d2e}.badge2.disc{background:#c62828}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0 4px}
.gallery figure{margin:0;background:#fff;border:1px solid #e3e8e3;border-radius:10px;padding:10px;text-align:center}
.gallery img{max-width:100%;height:170px;object-fit:contain}
.gallery figcaption{font-size:13px;color:#444;margin-top:6px;font-weight:600}
.fcard{position:relative}
.card h3{margin:0;font-size:17px}.card h3 a{color:#17202a;text-decoration:none}
.price{color:#17202a;font-weight:800;font-size:18px}.spec{font-size:13px;color:#555}
.cat{font-size:11px;font-weight:700;color:#8a6d00;background:#fff3c4;align-self:flex-start;padding:2px 8px;border-radius:999px}
.btn{margin-top:auto;display:inline-block;background:#1677ff;color:#fff;padding:9px 12px;border-radius:8px;text-decoration:none;font-size:14px;text-align:center}
.btn.alt{background:#e8f1ff;color:#0b55c4;font-weight:700}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px #0001}
th,td{padding:11px 13px;border-bottom:1px solid #eef0f2;text-align:left;font-size:14px;vertical-align:top}
th{width:30%;background:#eef3fb;color:#0b1e3f}
h2{margin:26px 0 10px}footer{background:#081230;color:#cfe3da;padding:22px 16px;font-size:13px}footer a{color:#ffd84d}
select{padding:11px;border-radius:8px;border:1.5px solid #0b1e3f;font-size:15px;width:100%}
.note{font-size:12.5px;color:#777}.diff{background:#fff7d6!important}
.crumbs{font-size:13px;color:#667;margin:10px 0 2px}.crumbs a{color:#0b55c4;text-decoration:none}.crumbs a:hover{text-decoration:underline}
.filterbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:#fff;border-radius:12px;box-shadow:0 1px 4px #0001;padding:12px;margin:12px 0}
.filterbar select{width:auto;flex:1;min-width:160px}.filterbar .fcount{font-size:13px;color:#667;font-weight:600}
.cmptable th:first-child{position:sticky;left:0;z-index:1;box-shadow:2px 0 4px #00000010}
.card picture{display:block}.fthumb picture{width:100%;height:100%}
.tile{background:linear-gradient(135deg,#0b1e3f,#1677ff);color:#fff;border-radius:14px;padding:18px;text-decoration:none;display:block}
.tile b{font-size:19px;display:block}.tile span{opacity:.85;font-size:13px}
"""
JS = """
async function loadPhones(){const r=await fetch('phones.json');return r.json()}
const RATES={PKR:1,INR:0.342859,BDT:0.449533,AED:0.01327,SAR:0.01355,QAR:0.013152,KWD:0.001119,OMR:0.001389,BHD:0.001359,USD:0.003614,GBP:0.002695,EUR:0.003229,TRY:0.180652,CNY:0.024058,JPY:0.570698,KRW:4.86269,RUB:0.292402,CAD:0.005054,AUD:0.005161,SGD:0.004623,MYR:0.014709,IDR:65.561311,THB:0.121968,PHP:0.228747,ZAR:0.060115,NGN:4.85541,KES:0.469038,EGP:0.200337,LKR:1.201172,NPR:0.548572,AFN:0.233409,ILS:0.011359,CHF:0.002962,VND:93.041694,MMK:7.584721,KHR:14.844538,UZS:43.104459,KZT:1.638417,TZS:9.557823,GHS:0.042218,MAD:0.035488,IQD:5.485564,JOD:0.002562,AZN:0.006144,GEL:0.009383};
const SYM={PKR:'Rs ',INR:'₹',BDT:'৳',AED:'AED ',SAR:'SAR ',QAR:'QAR ',KWD:'KWD ',OMR:'OMR ',BHD:'BHD ',USD:'$',GBP:'£',EUR:'€',TRY:'₺',CNY:'¥',JPY:'¥',KRW:'₩',RUB:'₽',CAD:'CA$',AUD:'A$',SGD:'S$',MYR:'RM ',IDR:'Rp ',THB:'฿',PHP:'₱',ZAR:'R ',NGN:'₦',KES:'KSh ',EGP:'E£ ',LKR:'Rs ',NPR:'Rs ',AFN:'؋',ILS:'₪',CHF:'CHF ',VND:'₫',MMK:'Ks ',KHR:'៛',UZS:'UZS ',KZT:'₸',TZS:'TSh ',GHS:'GH₵',MAD:'MAD ',IQD:'IQD ',JOD:'JOD ',AZN:'₼',GEL:'₾'};
function fmtCur(pkrAmt,cur){const v=pkrAmt*RATES[cur];const dec=v>=100?0:(v>=1?2:3);return SYM[cur]+v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})}
function curSel(){return localStorage.getItem('cur')||'PKR'}
function applyCur(){const cur=curSel();const sel=document.getElementById('cursel');if(sel)sel.value=cur;if(cur==='PKR')return;document.querySelectorAll('[data-pkr]').forEach(el=>{const amt=parseFloat(el.getAttribute('data-pkr'));if(isNaN(amt))return;el.innerHTML='<b class="pkrv">'+fmtCur(amt,cur)+'</b> <span class="usdv">Rs '+amt.toLocaleString('en-US')+'</span>'})}
document.addEventListener('DOMContentLoaded',()=>{applyCur();const sel=document.getElementById('cursel');if(sel)sel.addEventListener('change',()=>{localStorage.setItem('cur',sel.value);if(document.getElementById('cmp')){location.reload()}else{applyCur()}})});
function pkr(p){if(p.price_pkr==null)return 'Price not announced';const cur=curSel();if(cur!=='PKR'&&RATES[cur])return fmtCur(p.price_pkr,cur)+' · Rs '+p.price_pkr.toLocaleString('en-PK');return 'Rs '+p.price_pkr.toLocaleString('en-PK')+' · $'+p.price.toLocaleString('en-US')}
function doSearch(q){q=(q||'').toLowerCase();document.querySelectorAll('.card').forEach(c=>{c.style.display=c.dataset.name.includes(q)?'':'none'})}
document.addEventListener('click',e=>{const b=e.target.closest('.tabbtn');if(!b)return;document.querySelectorAll('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tpanel').forEach(p=>p.classList.toggle('on',p.id===b.dataset.t))});
function heroSearch(e){e.preventDefault();const q=document.getElementById('hq').value;doSearch(q);const t=document.getElementById('allmodels');if(t)t.scrollIntoView({behavior:'smooth'});return false}
document.addEventListener('DOMContentLoaded',()=>{const q=new URLSearchParams(location.search).get('q');const h=document.getElementById('hq');if(q&&h){h.value=q;doSearch(q)}});
async function initCompare(){
 const selA=document.getElementById('selA'),selB=document.getElementById('selB');if(!selA)return;
 const brandA=document.getElementById('brandA'),brandB=document.getElementById('brandB');
 const phones=await loadPhones();
 const brands=[...new Set(phones.map(p=>p.brand))].sort();
 const fillBrands=s=>{brands.forEach(b=>{const o=document.createElement('option');o.value=b;o.textContent=b;s.appendChild(o)})};
 const fillModels=(s,brand,val)=>{s.innerHTML='';phones.filter(p=>p.brand===brand).forEach(p=>{const o=document.createElement('option');o.value=p.slug;o.textContent=p.name+' ('+p.cat+')';s.appendChild(o)});if(val)s.value=val};
 fillBrands(brandA);fillBrands(brandB);
 const qs=new URLSearchParams(location.search);
 const pa=phones.find(p=>p.slug===qs.get('a'))||phones[0];
 const pb=phones.find(p=>p.slug===qs.get('b'))||phones.find(p=>p.brand!==pa.brand)||phones[1]||phones[0];
 brandA.value=pa.brand;brandB.value=pb.brand;
 fillModels(selA,pa.brand,pa.slug);fillModels(selB,pb.brand,pb.slug);
 brandA.onchange=()=>{fillModels(selA,brandA.value);render()};
 brandB.onchange=()=>{fillModels(selB,brandB.value);render()};
 function render(){const a=phones.find(p=>p.slug===selA.value),b=phones.find(p=>p.slug===selB.value);if(!a||!b)return;
  const keys=['Price','Brand','Category'];
  [a,b].forEach(p=>Object.keys(p.specs).forEach(k=>{if(!keys.includes(k))keys.push(k)}));
  const val=(p,k)=>k==='Price'?pkr(p):k==='Brand'?p.brand:k==='Category'?p.cat:(p.specs[k]||'-');
  document.getElementById('cmp').innerHTML=keys.map(k=>{const va=val(a,k),vb=val(b,k);return `<tr class="${va!==vb?'diff':''}"><th>${k}</th><td>${va}</td><td>${vb}</td></tr>`}).join('');
  document.getElementById('cmpHead').innerHTML=`<tr><th></th><th>${a.name}</th><th>${b.name}</th></tr>`;}
 selA.onchange=render;selB.onchange=render;render();}
document.addEventListener('DOMContentLoaded',initCompare);
function initFilters(){const grid=document.getElementById('catgrid');if(!grid)return;const fb=document.getElementById('fbrand'),fs=document.getElementById('fsort'),fc=document.getElementById('fcount');const cards=[...grid.children];
 function apply(){const b=fb.value;let vis=cards.filter(c=>!b||c.dataset.brand===b);const s=fs.value;const pv=c=>parseFloat(c.dataset.price)||Infinity;const arr=[...grid.children];
  arr.forEach(c=>c.style.display=vis.includes(c)?'':'none');
  const sorted=[...vis].sort((x,y)=>s==='plo'?pv(x)-pv(y):s==='phi'?pv(y)-pv(x):s==='az'?x.dataset.name.localeCompare(y.dataset.name):(parseInt(y.dataset.year)||0)-(parseInt(x.dataset.year)||0));
  sorted.forEach(c=>grid.appendChild(c));if(fc)fc.textContent=vis.length+' models';}
 fb.addEventListener('change',apply);fs.addEventListener('change',apply);apply();}
document.addEventListener('DOMContentLoaded',initFilters);
"""

def head(title, desc, path="", depth=0, image="", ld_extra=""):
    pre = "../" * depth
    ld = {"@context": "https://schema.org", "@type": "WebSite", "name": SITE, "url": BASE,
          "potentialAction": {"@type": "SearchAction", "target": BASE + "?q={query}", "query-input": "required name=query"}}
    ogimg = f'<meta property="og:image" content="{esc(image)}">' if image else ""
    twimg = f'<meta name="twitter:image" content="{esc(image)}">' if image else ""
    nav = "".join(f'<a href="{BASE}{CATPAGE[c]}">{c}</a>' for c in CATS)
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-27E7JGS729"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-27E7JGS729');</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{BASE}{path}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="{BASE}{path}">{ogimg}
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(title)}"><meta name="twitter:description" content="{esc(desc)}">{twimg}
<link rel="stylesheet" href="{pre}style.css">
<script type="application/ld+json">{json.dumps(ld)}</script>{ld_extra}</head><body>
<header><div class="wrap hwrap"><button class="menubtn" aria-label="Menu" onclick="document.querySelector('.navbar').classList.toggle('open')">&#9776;</button><a class="logo" href="{BASE}"><span class="logo-ic">📱</span>Check <span>Specs</span></a><span class="tagline">Explore • Compare • Choose</span><select id="cursel" class="cursel" aria-label="Currency"><option value="PKR">🇵🇰 Pakistan · PKR</option><option value="INR">🇮🇳 India · INR</option><option value="BDT">🇧🇩 Bangladesh · BDT</option><option value="AED">🇦🇪 UAE · AED</option><option value="SAR">🇸🇦 Saudi Arabia · SAR</option><option value="QAR">🇶🇦 Qatar · QAR</option><option value="KWD">🇰🇼 Kuwait · KWD</option><option value="OMR">🇴🇲 Oman · OMR</option><option value="BHD">🇧🇭 Bahrain · BHD</option><option value="USD">🇺🇸 USA · USD</option><option value="GBP">🇬🇧 UK · GBP</option><option value="EUR">🇪🇺 Europe · EUR</option><option value="TRY">🇹🇷 Türkiye · TRY</option><option value="CNY">🇨🇳 China · CNY</option><option value="JPY">🇯🇵 Japan · JPY</option><option value="KRW">🇰🇷 South Korea · KRW</option><option value="RUB">🇷🇺 Russia · RUB</option><option value="CAD">🇨🇦 Canada · CAD</option><option value="AUD">🇦🇺 Australia · AUD</option><option value="SGD">🇸🇬 Singapore · SGD</option><option value="MYR">🇲🇾 Malaysia · MYR</option><option value="IDR">🇮🇩 Indonesia · IDR</option><option value="THB">🇹🇭 Thailand · THB</option><option value="PHP">🇵🇭 Philippines · PHP</option><option value="ZAR">🇿🇦 South Africa · ZAR</option><option value="NGN">🇳🇬 Nigeria · NGN</option><option value="KES">🇰🇪 Kenya · KES</option><option value="EGP">🇪🇬 Egypt · EGP</option><option value="LKR">🇱🇰 Sri Lanka · LKR</option><option value="NPR">🇳🇵 Nepal · NPR</option><option value="AFN">🇦🇫 Afghanistan · AFN</option><option value="ILS">🇮🇱 Israel · ILS</option><option value="CHF">🇨🇭 Switzerland · CHF</option><option value="VND">🇻🇳 Vietnam · VND</option><option value="MMK">🇲🇲 Myanmar · MMK</option><option value="KHR">🇰🇭 Cambodia · KHR</option><option value="UZS">🇺🇿 Uzbekistan · UZS</option><option value="KZT">🇰🇿 Kazakhstan · KZT</option><option value="TZS">🇹🇿 Tanzania · TZS</option><option value="GHS">🇬🇭 Ghana · GHS</option><option value="MAD">🇲🇦 Morocco · MAD</option><option value="IQD">🇮🇶 Iraq · IQD</option><option value="JOD">🇯🇴 Jordan · JOD</option><option value="AZN">🇦🇿 Azerbaijan · AZN</option><option value="GEL">🇬🇪 Georgia · GEL</option></select></div>
<div class="navbar"><div class="wrap"><a href="{BASE}">Home</a>{nav}<a href="{BASE}compare.html">Compare</a><a href="{BASE}az.html">A–Z Models</a><a href="{BASE}best-under-200.html">Under $200</a><a href="{BASE}best-under-400.html">Under $400</a></div></div></header><main>"""

def foot(depth=0):
    pre = "../" * depth
    return f"""</main><footer><div style="max-width:1100px;margin:0 auto">
Check Specs — Mobile phones, keypad phones, tablets and laptops: full specifications, latest prices in Pakistan (PKR &amp; USD) and comparisons.
Prices are approximate market prices; currency figures are converted from PKR at mid-market rates checked 3 Nov 2026 (Rs 276.7 = $1) — use the currency selector at the top of the page to see prices in your own country's currency. Prices can change; always confirm from your local shop before buying.<br>
<a href="{pre}about.html">About Us</a> · <a href="{pre}contact.html">Contact Us</a> · <a href="{pre}privacy-policy.html">Privacy Policy</a> · <a href="{pre}terms.html">Terms</a> · <a href="{pre}editorial-policy.html">Editorial Policy</a> · <a href="{pre}sources.html">Data Sources</a> · <a href="{pre}sitemap.xml">Sitemap</a></div></footer><script src="{pre}app.js"></script></body></html>"""

BRANDWM = {"Apple": "#111111", "Samsung": "#1428a0", "Google": "#4285f4", "Vivo": "#415fff",
           "Oppo": "#0a8f5a", "Xiaomi": "#ff6900", "Realme": "#b8860b", "Infinix": "#17202a",
           "Tecno": "#1a4f9c", "OnePlus": "#eb0028", "Honor": "#0b1e3f", "Nokia": "#124191",
           "Redmi": "#ff6900", "Poco": "#8a6d00"}
def tcard(d):
    img = pic(d["hero"], d.get("hero_webp", ""), "", d["name"]) if d.get("hero") else "📱"
    badge = f'<span class="badge {"disc" if d["status"] == "Discontinued" else "cont"}">{d["status"]}</span>'
    return f"""<div class="tcard">{badge}<div class="fthumb">{img}</div><div class="tbody"><b>{esc(d['name'])}</b>
<div class="price">{dual(d['price'])}</div><div class="spec">{esc(d['tag'])}</div>
<a class="btn alt" style="margin-top:auto;text-align:center" href="{d['folder']}/{d['slug']}.html">View Details →</a></div></div>"""

def card(d, base=""):
    hl = "".join(f'<div class="spec">{esc(x)}</div>' for x in d["hl"])
    badge = f'<span class="badge {"disc" if d["status"] == "Discontinued" else "cont"}">{d["status"]}</span>'
    img = pic(d["hero"], d.get("hero_webp", ""), "cardimg", d["name"], base=base) if d.get("hero") else '<div class="cardph">📱</div>'
    return f"""<div class="card" data-name="{esc(d['name'].lower())} {esc(d['brand'].lower())} {esc(d['cat'].lower())}" data-brand="{esc(d['brand'])}" data-price="{d['price'] if d['price'] is not None else ''}" data-year="{d['year'] or 0}">
{badge}
{img}
<div class="cbody">
<span class="cat">{esc(d['cat'])}</span>
<h3><a href="{base}{d['folder']}/{d['slug']}.html">{esc(d['name'])}</a></h3>
<div class="price">{dual(d['price'])}</div>{hl}
<div class="spec">{esc(d['tag'])}</div>
<div class="btnrow"><a class="btn" href="{base}{d['folder']}/{d['slug']}.html">Full Specs</a>
<a class="btn alt" href="{base}compare.html?a={d['slug']}">Compare</a></div>
</div></div>"""

def write(rel, content):
    if rel == "style.css":  # Phase 3: minify CSS on write
        import re as _re
        content = _re.sub(r"/\*.*?\*/", "", content, flags=_re.S)
        content = _re.sub(r"\s*([{}:;,>])\s*", r"\1", content)
        content = _re.sub(r"\s+", " ", content).strip()
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f: f.write(content)
    print("wrote", rel)

def main():
    write("style.css", CSS); write("app.js", JS)
    export = [{"slug": d["slug"], "name": d["name"], "brand": d["brand"], "cat": d["cat"],
               "price": usd(d["price"]) if d["price"] is not None else None, "price_pkr": d["price"], "path": f"{d['folder']}/{d['slug']}.html",
               "specs": {k: str(v) for k, v in d["rows"] if k != "Price"}} for d in ALL]
    write("phones.json", json.dumps(export, ensure_ascii=False, indent=1))
    chips = "".join(f'<a class="chip" href="brands/{bslug(b)}.html">{esc(b)}</a>' for b in BRANDS)
    tiles = "".join(f'<a class="tile" href="{CATPAGE[c]}"><b>{c}</b><span>{sum(1 for d in ALL if d["cat"]==c)} models — specs &amp; prices</span></a>' for c in CATS)
    latest = sorted(ALL, key=lambda d: (-(d["year"] or 0), d["name"]))
    feat = sorted([d for d in ALL if d["cat"] == "Smartphones"], key=lambda d: (-d["year"], -(d["price"] or 0)))[:10]
    tcards = "".join(tcard(d) for d in feat[:8])
    topbrands = sorted(BRANDS, key=lambda b: -sum(1 for d in ALL if d["brand"] == b))[:10]
    btiles = "".join(f'<a class="btile" href="brands/{bslug(b)}.html"><b style="color:{BRANDWM.get(b, "#0b1e3f")}">{esc(b)}</b><span>{sum(1 for d in ALL if d["brand"] == b)} devices</span></a>' for b in topbrands)
    by_slug = {d["slug"]: d for d in ALL}
    cmp_pairs = [("iphone-16-pro-max", "samsung-galaxy-s25-ultra"), ("redmi-note-13", "infinix-note-40"), ("nokia-105-2023", "nokia-110-4g-2023"), ("apple-macbook-air-m3", "hp-victus-15-gaming")]
    ctiles = "".join(f'<a class="tile" href="compare.html?a={a}&b={b}"><b>{esc(by_slug[a]["name"])} vs {esc(by_slug[b]["name"])}</b><span>Side-by-side specs &amp; price comparison</span></a>' for a, b in cmp_pairs if a in by_slug and b in by_slug)
    home = head(f"{SITE} — Mobile, Tablet & Laptop Prices in Pakistan, Full Specs & Compare",
                "Latest mobile phone, keypad phone, tablet and laptop prices in Pakistan in PKR & USD, full specifications and side-by-side comparisons. Samsung, Apple, Xiaomi, Infinix, Tecno, Vivo, Oppo, Nokia, HP, Dell, Lenovo and more.")
    home += f"""<section class="hero2"><h1>Find Your <span>Perfect Phone</span></h1>
<p>Explore specifications, compare devices and discover prices worldwide.</p>
<form class="hsearch" onsubmit="return heroSearch(event)"><input id="hq" placeholder="Search phones, brands or models..." oninput="doSearch(this.value)"><button type="submit">Search</button></form>
<div class="pills"><a class="pill" href="smartphones.html">🇵🇰 Pakistan</a><a class="pill" href="#brands">🌐 Worldwide</a><a class="pill" href="compare.html">⚖️ Compare</a><a class="pill" href="az.html">🔤 A–Z Models</a></div>
<img class="hero-phone" src="img/iphone-17-pro-max/cosmic-orange.jpg" alt="iPhone 17 Pro Max"></section>
<h2 class="sec" id="brands">🔥 Popular Brands</h2><div class="brands">{btiles}</div>
<div class="chips">{chips}</div>
<h2 class="sec">⭐ Trending Smartphones</h2>
<div class="trend-wrap"><div class="tgrid">{tcards}</div>
<aside class="rail"><div class="cmp-panel"><h3>⚖️ Compare Phones</h3><p>Side-by-side comparison of any two devices</p><div class="vs">📱 VS 📱</div><a class="btn" style="background:#fff;color:#0b1e3f;display:block;text-align:center" href="compare.html">Start Compare →</a></div>
<div class="budget-panel"><h3>🏷️ Budget Picks</h3><p>Best phones under your budget</p><a class="btn alt" href="best-under-200.html">Under $200</a> <a class="btn alt" href="best-under-400.html">Under $400</a></div></aside></div>
<h2 class="sec" id="allmodels">Latest Models — Full Specs &amp; Prices in Pakistan</h2><div class="grid">{''.join(card(d) for d in latest[:120])}</div>
<p style="text-align:center;margin:16px 0"><a class="btn" href="az.html">Browse All {len(ALL)} Models A–Z →</a></p>
<h2 class="sec">Popular Comparisons</h2><div class="grid">{ctiles}</div>
<div class="highlights"><div>🛡️ <b>Verified Specifications</b>Trusted &amp; Accurate</div><div>🌐 <b>Global Coverage</b>{len(ALL)}+ Devices</div><div>🔄 <b>Updated Daily</b>Latest Prices</div><div>⚡ <b>Fast &amp; Responsive</b>On All Devices</div></div>"""
    home += foot(); write("index.html", home)
    # Category pages
    for c in CATS:
        items = sorted([d for d in ALL if d["cat"] == c], key=lambda d: (-(d["year"] or 0), d["name"]))
        pg = head(f"{c} Prices in Pakistan — Full Specs & Compare | {SITE}",
                  f"All {c.lower()} with prices in Pakistan (PKR & USD), full specifications and comparisons.", CATPAGE[c])
        _fbrands = sorted({d["brand"] for d in items})
        _fopts = "".join(f'<option value="{esc(b)}">{esc(b)}</option>' for b in _fbrands)
        pg += f"""<h1>{esc(c)} — Prices in Pakistan &amp; Full Specs</h1><p>{len(items)} models. Har model ke full specs aur Pakistan price ke liye model kholen.</p>
<div class="filterbar"><select id="fbrand" aria-label="Filter by brand"><option value="">All Brands</option>{_fopts}</select>
<select id="fsort" aria-label="Sort models"><option value="new">Newest First</option><option value="plo">Price: Low to High</option><option value="phi">Price: High to Low</option><option value="az">Name: A to Z</option></select>
<span class="fcount" id="fcount"></span></div>
<div class='grid' id='catgrid'>{''.join(card(d) for d in items)}</div>"""
        pg += foot(); write(CATPAGE[c], pg)
    # Device pages
    for d in ALL:
        specs_html = "<table>" + "".join(f'<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>' for k, v in _flat_rows(d)) + "</table>"
        hero_html = f'<div class="phero">{pic(d["hero"], d.get("hero_webp", ""), "hero-img", d["name"], base=BASE, lazy=False)}</div>' if d.get("hero") else ""
        others = [x for x in ALL if x["brand"] == d["brand"] and x["slug"] != d["slug"]][:3]
        links = "".join(f'<a class="chip" href="../{x["folder"]}/{x["slug"]}.html">{esc(x["name"])}</a>' for x in others)
        cmp = [x for x in ALL if x["cat"] == d["cat"] and x["slug"] != d["slug"] and x["price"] is not None and d["price"] is not None and abs(x["price"] - d["price"]) < max(30000, d["price"] * 0.4)][:2]
        _rel = [x for x in ALL if x["slug"] != d["slug"] and x["cat"] == d["cat"] and x["price"] is not None and d["price"] is not None and abs(x["price"] - d["price"]) <= max(25000, d["price"] * 0.35)][:4]
        if len(_rel) < 4:
            _rel += [x for x in others if x not in _rel][:4 - len(_rel)]
        rel_html = f'<h2>Related Devices</h2><div class="grid">{"".join(card(x, base="../") for x in _rel)}</div>' if _rel else ""
        clinks = "".join(f'<a class="chip" href="../compare.html?a={d["slug"]}&b={x["slug"]}">{esc(d["name"])} vs {esc(x["name"])}</a>' for x in cmp)
        label = {"Smartphones": "Mobile", "Keypad Phones": "Keypad Phone", "Tablets": "Tablet", "Laptops": "Laptop"}[d["cat"]]
        gal = ""
        if d.get("images"):
            figs = "".join(f'<figure>{pic(im["file"], im.get("webp", ""), "", d["name"] + " — " + im["color"], base=BASE)}<figcaption>{esc(im["color"])}</figcaption></figure>' for im in d["images"])
            gal = f'<p class="glabel">Colors</p><div class="gallery">{figs}</div>'
        src_line = ""
        # Phase 2 SEO: Product + Breadcrumb structured data, og:image, breadcrumbs
        _purl = f"{BASE}{d['folder']}/{d['slug']}.html"
        _img = f"{BASE}{d['hero']}" if d.get("hero") else ""
        _prod = {"@context": "https://schema.org", "@type": "Product", "name": d["name"],
                 "brand": {"@type": "Brand", "name": d["brand"]}, "url": _purl,
                 "description": f"{d['name']} full specifications and price in Pakistan. {'; '.join(d['hl'])}."}
        if _img: _prod["image"] = _img
        if d["price"] is not None:
            _prod["offers"] = {"@type": "Offer", "url": _purl, "priceCurrency": "PKR",
                               "price": d["price"],
                               "availability": "https://schema.org/Discontinued" if d["status"] == "Discontinued" else "https://schema.org/InStock"}
        _crumbs = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE},
            {"@type": "ListItem", "position": 2, "name": d["cat"], "item": f"{BASE}{CATPAGE[d['cat']]}"},
            {"@type": "ListItem", "position": 3, "name": d["brand"], "item": f"{BASE}brands/{bslug(d['brand'])}.html"},
            {"@type": "ListItem", "position": 4, "name": d["name"], "item": _purl}]}
        _ldx = f'<script type="application/ld+json">{json.dumps(_prod)}</script><script type="application/ld+json">{json.dumps(_crumbs)}</script>'
        _crumb_html = (f'<nav class="crumbs"><a href="{BASE}">Home</a> › <a href="{BASE}{CATPAGE[d["cat"]]}">{esc(d["cat"])}</a>'
                       f' › <a href="{BASE}brands/{bslug(d["brand"])}.html">{esc(d["brand"])}</a> › {esc(d["name"])}</nav>')
        pg = head(f"{d['name']} Price in Pakistan {pkrtitle(d['price'])} — Full Specifications | {SITE}",
                  f"{d['name']} full specifications and price in Pakistan {pkrtitle(d['price'])}. {'; '.join(d['hl'])}. Compare {d['name']} with other devices.",
                  f"{d['folder']}/{d['slug']}.html", depth=1, image=_img, ld_extra=_ldx)
        pg += _crumb_html
        pg += f"""<h1>{esc(d['name'])} — Full Specifications</h1>
<p><span class="badge2 {"disc" if d["status"] == "Discontinued" else "cont"}">{d["status"]}</span> <span class="note">{"This model is still in production and available in shops." if d["status"] == "Continued" else "This model has been discontinued by the company. It may still be found as old stock in some shops."}</span></p>
<p class="price">{dual(d['price'])}</p>
<p>{esc(d['tag'])}. {esc(d['name'])} ke mukammal specs, Pakistan price aur comparison neeche hai.</p>
{hero_html}
{gal}
{specs_html}
{src_line}
<h2>More {esc(d['brand'])} Devices</h2><div class="chips">{links}</div>
<h2>Compare {esc(d['name'])}</h2><div class="chips">{clinks}</div>{rel_html}"""
        pg += foot(depth=1)
        write(f"{d['folder']}/{d['slug']}.html", pg)
    # Brand pages
    for b in BRANDS:
        items = [d for d in ALL if d["brand"] == b]
        cards = "".join(card(d, base="../") for d in items)
        pg = head(f"{b} Prices in Pakistan — Mobiles, Tablets & Laptops Full Specs | {SITE}",
                  f"All {b} devices with prices in Pakistan (PKR & USD) and full specifications.", f"brands/{bslug(b)}.html", depth=1)
        pg += f"<h1>{esc(b)} — Prices in Pakistan &amp; Full Specs</h1><div class='grid'>{cards}</div>"
        pg += foot(depth=1); write(f"brands/{bslug(b)}.html", pg)
    # A-Z page — every model, alphabetical (user order 2026-11-03)
    from collections import defaultdict as _dd
    _az = _dd(list)
    for d in ALL:
        _ch = (d["name"] or "#")[0].upper()
        _az[_ch if _ch.isalpha() else "#"].append(d)
    _letters = sorted(_az.keys(), key=lambda c: (c == "#", c))
    _azbar = " ".join(f'<a class="chip" href="#az-{c}">{c} ({len(_az[c])})</a>' for c in _letters)
    _azsecs = ""
    for c in _letters:
        _links = "".join(
            f'<a class="azrow" href="{d["folder"]}/{d["slug"]}.html"><b>{esc(d["name"])}</b>'
            f'<span>{esc(d["cat"])} · {dual(d["price"])}</span></a>'
            for d in sorted(_az[c], key=lambda x: x["name"].lower()))
        _azsecs += f'<h2 class="sec" id="az-{c}">{c}</h2><div class="azlist">{_links}</div>'
    pg = head(f"All Models A–Z — Full List | {SITE}",
              "Every mobile phone, keypad phone, tablet and laptop on Check Specs in one A to Z list with prices in Pakistan.", "az.html")
    pg += f"""<style>.azlist{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px}}
.azrow{{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#0e2150;border:1px solid #ffffff1f;border-radius:10px;padding:9px 12px;color:#dbe7ff;text-decoration:none}}
.azrow b{{font-size:14px}}.azrow span{{font-size:12.5px;color:#9fb6dd;white-space:nowrap}}</style>
<h1>All Models — A to Z</h1><p>{len(ALL)} models, saari list ek hi page par — harf chuno ya neeche scroll karo.</p>
<div class="chips">{_azbar}</div>{_azsecs}"""
    pg += foot(); write("az.html", pg)
    # Compare page
    pg = head(f"Compare Phones, Tablets & Laptops — Side by Side Specs | {SITE}",
              "Compare any two devices side by side: price in Pakistan, display, camera, battery, processor and more.", "compare.html")
    pg += """<h1>Compare Devices</h1><p>Do devices chuno — specs side by side, farq yellow rang mein nazar ayega.</p>
<div class="grid"><div><label>Device 1 — Brand</label><select id="brandA"></select><label style="display:block;margin-top:10px">Device 1 — Model</label><select id="selA"></select></div>
<div><label>Device 2 — Brand</label><select id="brandB"></select><label style="display:block;margin-top:10px">Device 2 — Model</label><select id="selB"></select></div></div>
<div style="overflow-x:auto"><table class="cmptable" style="margin-top:16px;min-width:520px"><thead id="cmpHead"></thead><tbody id="cmp"></tbody></table></div>"""
    pg += foot(); write("compare.html", pg)
    # Budget guides (smartphones only)
    for limit, fname, label in [(200, "best-under-200.html", "Under $200"), (400, "best-under-400.html", "Under $400")]:
        items = sorted([d for d in ALL if d["cat"] == "Smartphones" and d["price"] is not None and usd(d["price"]) <= limit], key=lambda d: d["price"])
        pg = head(f"Best Mobile Phones {label} in Pakistan 2026 | {SITE}",
                  f"Best mobile phones {label.lower()} in Pakistan with full specs and USD prices.", fname)
        pg += f"<h1>Best Phones {label} in Pakistan</h1><p>Is budget mein sabse behtar phones — specs aur qeemat ke sath.</p><div class='grid'>{''.join(card(d) for d in items)}</div>"
        pg += foot(); write(fname, pg)
    # Trust & policy pages (Phase 5, 2026-11-03)
    TRUST = [
     ("about.html", "About Us", "About Check Specs — an independent mobile, tablet and laptop specifications and price guide for Pakistan and worldwide readers.",
      """<h1>About Check Specs</h1>
<p>Check Specs is an independent specifications and price guide for mobile phones, keypad phones, tablets and laptops. Our goal is simple: give every buyer the verified full specifications of a device and its current price in Pakistan — plus prices in 45 currencies for readers around the world — on one fast page, without clutter.</p>
<h2>What we cover</h2>
<p>We track every major brand sold in Pakistan and worldwide, from the newest flagships to budget and keypad phones. New models are added as they launch, and older models stay listed with a clear Continued or Discontinued banner so you always know whether a device is still in production.</p>
<h2>How we work</h2>
<p>Every specification on this site is read from a reputable source — the manufacturer's official product page, GSMArena's full-specifications database, or another established reference — and checked before it is published. We never invent specifications or prices. Where a Pakistani market price is available from local market listings (such as PriceOye), we show it; where it is not, we show a clearly approximate converted figure, or "Price not announced" when a device has not been priced yet. Read our <a href="sources.html">Data Sources &amp; Verification Policy</a> and <a href="editorial-policy.html">Editorial Policy</a> for the full method.</p>
<h2>Who runs it</h2>
<p>Check Specs is run by a small independent editorial desk in Kot Addu, Punjab, Pakistan. We are not owned by any phone brand or retailer, and no brand pays us to list or rank a device.</p>"""),
     ("contact.html", "Contact Us", "Contact Check Specs for specification corrections, price updates and business inquiries.",
      """<h1>Contact Us</h1>
<p>We read every message. The fastest way to reach the Check Specs desk is Facebook Messenger on our publisher page:</p>
<p><b>Her Khabar Rakho</b> — <a href="https://www.facebook.com/61595091102246" rel="noopener">facebook.com/61595091102246</a> (send us a message there and mention "Check Specs").</p>
<h2>Specification corrections</h2>
<p>Spotted a wrong specification or price? Tell us the device name, the exact line that looks wrong, and — if you have it — a link to the official source. Verified corrections are applied as quickly as we can check them, usually the same day.</p>
<h2>Price updates</h2>
<p>Local shopkeepers and readers are welcome to report current street prices. Prices on the site are approximate market figures and are refreshed regularly; a single report is always cross-checked before it changes a listing.</p>
<h2>Business inquiries</h2>
<p>For advertising and partnership questions, message the same page above with the subject of your inquiry. We do not sell rankings, reviews or specification changes — those are never for sale.</p>"""),
     ("privacy-policy.html", "Privacy Policy", "Privacy Policy of Check Specs — what data this website does and does not collect.",
      """<h1>Privacy Policy</h1>
<p>Check Specs is a static information website. We keep data collection to the minimum a specifications guide needs.</p>
<h2>What we do not collect</h2>
<p>There are no user accounts, no comments and no checkout on this site. We do not ask for or store your name, email address, phone number or payment details.</p>
<h2>What is stored on your device</h2>
<p>The currency selector saves your chosen currency in your browser's local storage so prices stay in your currency on your next visit. This never leaves your device and you can clear it any time from your browser settings.</p>
<h2>Hosting and analytics</h2>
<p>The site is hosted on GitHub Pages, which may keep standard server logs (such as IP address and browser type) for security and operation, under GitHub's own privacy statement. We may use privacy-respecting, aggregate analytics (such as Google Analytics) to understand which devices and pages are popular; such analytics work on aggregated statistics, not on identifying individual visitors. Advertising partners, when present, may use cookies as described in their own policies; you can block cookies in your browser without losing access to any specification or price on this site.</p>
<h2>External links</h2>
<p>Pages may link to manufacturer and reference websites. We are not responsible for the privacy practices of external sites.</p>
<h2>Changes</h2>
<p>If this policy changes, the new version will be published on this page.</p>"""),
     ("terms.html", "Terms & Conditions", "Terms and conditions for using Check Specs.",
      """<h1>Terms &amp; Conditions</h1>
<h2>Information only</h2>
<p>Specifications, prices and availability on Check Specs are provided for general information and comparison. Despite careful verification, errors can occur; the manufacturer's official product page is always the final authority on a device's specifications.</p>
<h2>Prices</h2>
<p>Prices are approximate market prices in Pakistani Rupees (PKR), with other currencies converted at mid-market rates shown on the site. Prices change frequently and differ between shops and cities. Always confirm the final price, PTA approval status and warranty terms with your seller before buying.</p>
<h2>Availability</h2>
<p>A "Continued" banner means the model is in production to the best of our knowledge; it does not guarantee stock at any particular shop. A "Discontinued" model may still be sold as remaining stock.</p>
<h2>Trademarks</h2>
<p>All brand names, model names and product images belong to their respective owners. Their use on this site is for identification and comparison only and implies no endorsement.</p>
<h2>Use of content</h2>
<p>You may link to any page of this site. Republishing specification tables or page content in bulk without permission is not allowed.</p>
<h2>Liability</h2>
<p>We are not liable for purchase decisions made solely on the information published here. Verify critical details — price, warranty and PTA status — before completing a purchase.</p>"""),
     ("editorial-policy.html", "Editorial Policy", "How Check Specs verifies specifications, handles prices and corrects errors.",
      """<h1>Editorial Policy</h1>
<h2>Verification before publication</h2>
<p>No specification is published from memory or from a single unverified listing. Every model's specification table is read from its official product page or GSMArena's full-specifications page and matched field by field before the model goes live. If a field cannot be verified, it is left out rather than guessed.</p>
<h2>Sources in order of trust</h2>
<p>1) The manufacturer's official product/support page. 2) GSMArena's specifications database. 3) Established retailer and reference listings, used mainly for prices. Where sources disagree on a status question — for example whether a model is discontinued — the manufacturer's position wins.</p>
<h2>Prices</h2>
<p>Pakistani prices come from current local market listings wherever a model is actually sold in Pakistan. Models not officially sold here are shown with an approximate converted price or "Price not announced". Rumoured or unannounced devices, when listed, are labelled with their expected status and their figures are replaced by final verified data at launch.</p>
<h2>Corrections</h2>
<p>Errors reported by readers are checked against the sources above and corrected as quickly as verification allows — see <a href="contact.html">Contact Us</a>. Silent edits are limited to obvious typos; factual corrections follow the verified source.</p>
<h2>Independence</h2>
<p>No brand, shop or advertiser can pay to change a specification, a price or a device's position on this site.</p>"""),
     ("sources.html", "Data Sources & Verification Policy", "Where Check Specs gets its specifications and prices, and how they are verified.",
      """<h1>Data Sources &amp; Verification Policy</h1>
<h2>Specifications</h2>
<p>Specification tables are compiled from the manufacturer's official product pages and <b>GSMArena</b>'s full-specifications database. Each model's data is read from its own specification page — never copied from a similar model — and a second check is made when a model's details are updated after launch (for example, when rumoured figures are replaced by final ones).</p>
<h2>Prices</h2>
<p>Pakistani market prices are checked against current local listings, principally <b>PriceOye</b>'s Pakistan price list. Where no Pakistani listing exists, the manufacturer's announced price in USD or EUR is converted at the mid-market rates referenced in the site footer and should be read as an estimate. Currency figures in the selector are conversions of the PKR price at the rates stated on the site; they are guides, not local shop prices.</p>
<h2>Status (Continued / Discontinued)</h2>
<p>Production status follows the manufacturer's announcements first and reference databases second; when they disagree, the manufacturer's position is shown.</p>
<h2>Images</h2>
<p>Device images are the manufacturers' official product images as carried by the reference sources above, shown for identification. A colour gallery is only published when a verified photo of that exact colour exists.</p>
<h2>Freshness</h2>
<p>New launches are added daily by automated checks against the reference databases, and prices of current models are refreshed regularly. If you find stale information, please report it via <a href="contact.html">Contact Us</a>.</p>"""),
    ]
    for _f, _t, _desc, _body in TRUST:
        pg = head(f"{_t} | {SITE}", _desc, _f)
        pg += _body
        pg += foot(); write(_f, pg)
    # SEO files
    urls = ["", "compare.html", "az.html", "best-under-200.html", "best-under-400.html",
            "about.html", "contact.html", "privacy-policy.html", "terms.html",
            "editorial-policy.html", "sources.html"] + [CATPAGE[c] for c in CATS]
    urls += [f"{d['folder']}/{d['slug']}.html" for d in ALL]
    urls += [f"brands/{bslug(b)}.html" for b in BRANDS]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sm += "".join(f"<url><loc>{BASE}{u}</loc></url>\n" for u in urls) + "</urlset>\n"
    write("sitemap.xml", sm)
    write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n")
    from collections import Counter
    print("COUNTS:", dict(Counter(d["cat"] for d in ALL)))
    print(f"DONE: {len(ALL)} devices, {len(BRANDS)} brands, {len(urls)} urls in sitemap")

if __name__ == "__main__":
    main()
