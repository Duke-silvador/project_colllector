# =====================================================================
#  car_ai.py - IAI Project
#  Rule-Based Expert System for Car Problems (CAR MECHANIC ASSISTANT)
#  A DECISION SUPPORT tool - bilingual: English / Urdu (one button switches the whole app)
#  Run with:  streamlit run car_ai.py
#
#  This file = the Streamlit UI shell: page setup, CSS, header, language
#  and theme buttons. The expert system lives in codebase.py.
# =====================================================================
import streamlit as st
from codebase import T, reset_system, run

st.set_page_config(page_title="Car Mechanic AI", layout="centered")   # first Streamlit command

s = st.session_state   # short name for st.session_state

if 'step' not in s:    # first time only
    s.lang = 'en'; s.theme = 'light'; reset_system()
if 'theme' not in s:
    s.theme = 'light'

# ---------- Language: 'en' = English, 'ur' = Urdu ----------
L = s.lang

# ---------- Look and feel: animated, responsive CSS (one block, injected with st.markdown) ----------
# Colours are CSS variables so the Dark mode button can switch the whole theme.
CSS = """<style>
:root {
  --bg1:#eaf2ff; --bg2:#f7fbff; --bg3:#e9f8f0;
  --txt:#14213D; --card:#ffffff; --brd:#e0e9f6; --soft:#e3ecf8;
  --line:#d9e6f7; --btn:#cfe0f5; --head:#1F3A5F; --side2:#e8f1ff;
  --ptr:#14213D; --routine-txt:#3B2F00;
}
html, body, .stApp, button, input, textarea {font-family: 'Segoe UI', 'Noto Naskh Arabic', 'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', Tahoma, Arial, sans-serif;}
.stApp {background: linear-gradient(135deg, var(--bg1) 0%, var(--bg2) 45%, var(--bg3) 100%) !important; background-size: 300% 300% !important; animation: bgshift 20s ease infinite; color: var(--txt);}
.stApp p, .stApp li, .stApp label, .stApp h1, .stApp h2, .stApp h3, .stApp h4, .stApp span, .stApp div[data-testid="stMarkdownContainer"] {color: var(--txt);}
.stApp [data-testid="stAlert"], .stApp [data-testid="stAlert"] * {color: #14213D !important;}
.block-container {max-width: 860px; padding-top: 2rem;}
[data-testid="stSidebar"] {background: linear-gradient(180deg, var(--card), var(--side2)) !important; border-right: 1px solid var(--line);}
h1 {font-weight: 800 !important; color: var(--head) !important; letter-spacing: -0.5px; animation: fadeUp .6s ease both; display: inline-block; border-bottom: 3px solid var(--head); padding-bottom: 6px;}
@keyframes bgshift {0% {background-position: 0% 50%;} 50% {background-position: 100% 50%;} 100% {background-position: 0% 50%;}}
@keyframes fadeUp {from {opacity: 0; transform: translateY(14px);} to {opacity: 1; transform: translateY(0);}}
@keyframes grow {from {width: 0;}}
@keyframes drive {0% {left: -60px;} 100% {left: calc(100% + 10px);}}
@keyframes roadmove {to {background-position: -34px 0;}}
@keyframes slide {from {left: 0;}}
@keyframes pulse {0%, 100% {box-shadow: 0 0 0 0 rgba(239,68,68,.55);} 50% {box-shadow: 0 0 0 14px rgba(239,68,68,0);}}
@keyframes bob {0%, 100% {transform: translateY(0);} 50% {transform: translateY(-2px);}}
.hero {position: relative; overflow: hidden; border-radius: 20px; padding: 18px 20px 38px; margin: 6px 0 14px; background: linear-gradient(120deg, #1F3A5F, #0F766E, #2563EB); background-size: 240% 240%; animation: bgshift 10s ease infinite, fadeUp .6s ease both; box-shadow: 0 10px 30px rgba(31,58,95,.28);}
.stApp .hero, .stApp .hero * {color: #ffffff !important;}
.hero .tag {font-size: 1.15rem; font-weight: 800; letter-spacing: .3px;}
.hero .sub {opacity: .92; font-size: .88rem; margin-top: 2px;}
.road {position: absolute; left: 0; right: 0; bottom: 10px; height: 3px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.9) 0 18px, transparent 18px 34px); background-size: 34px 3px; animation: roadmove 1.1s linear infinite;}
.car {position: absolute; bottom: 13px; left: -60px; font-size: 1.7rem; animation: drive 7s linear infinite, bob .5s ease-in-out infinite;}
.qcard {background: var(--card); color: var(--txt); border-radius: 18px; padding: 16px 18px; margin: 8px 0 12px; border: 1px solid var(--brd); box-shadow: 0 8px 24px rgba(20,33,61,.09); animation: fadeUp .45s ease both;}
.qtop {display: flex; align-items: center; gap: 12px; margin-bottom: 10px;}
.qno {background: linear-gradient(135deg, #0F766E, #2563EB); border-radius: 999px; padding: 3px 12px; font-weight: 700; font-size: .8rem; white-space: nowrap;}
.stApp .qno {color: #ffffff;}
.qbar {flex: 1; height: 8px; border-radius: 99px; background: var(--soft); overflow: hidden;}
.qbar span {display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #0F766E, #22C55E); animation: grow .8s ease both;}
.qtext {font-size: 1.12rem; font-weight: 600; line-height: 1.55;}
.stButton > button, .stDownloadButton > button {border-radius: 14px; min-height: 3rem; height: auto; padding: .55rem .9rem; font-weight: 700; white-space: normal; border: 1.5px solid var(--btn); background: var(--card); color: var(--txt); box-shadow: 0 4px 12px rgba(20,33,61,.08); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;}
.stButton > button:hover, .stDownloadButton > button:hover {transform: translateY(-3px) scale(1.02); box-shadow: 0 12px 24px rgba(37,99,235,.24); border-color: #2563EB;}
.stButton > button:active, .stDownloadButton > button:active {transform: scale(.97);}
.stButton > button p, .stDownloadButton > button p {color: inherit; margin: 0;}
.stButton > button[kind="primary"], .stButton > button[data-testid="stBaseButton-primary"] {background: linear-gradient(135deg, #0F766E, #22C55E); color: #ffffff; border: none;}
.stDownloadButton > button {background: linear-gradient(135deg, #C2410C, #F59E0B); color: #ffffff; border: none;}
.stApp .stButton > button[kind="primary"] p, .stApp .stButton > button[data-testid="stBaseButton-primary"] p, .stApp .stDownloadButton > button p {color: #ffffff;}
[data-testid="stAlert"] {border-radius: 16px; box-shadow: 0 6px 18px rgba(20,33,61,.08); animation: fadeUp .5s ease both;}
[data-testid="stNumberInput"] input {border-radius: 12px; font-weight: 700; background: var(--card); color: var(--txt); border-color: var(--brd);}
.drive {border-radius: 18px; padding: 14px 18px; margin: 10px 0; font-weight: 700; box-shadow: 0 8px 22px rgba(0,0,0,.16); animation: fadeUp .5s ease both;}
.stApp .drive {color: #ffffff;}
.v-emergency {background: linear-gradient(135deg, #B91C1C, #EF4444); animation: fadeUp .5s ease both, pulse 1.6s ease-in-out infinite;}
.v-urgent {background: linear-gradient(135deg, #C2410C, #F59E0B);}
.v-routine {background: linear-gradient(135deg, #CA8A04, #FACC15);}
.stApp .v-routine {color: var(--routine-txt);}
.v-selfcare {background: linear-gradient(135deg, #15803D, #22C55E);}
.meter {position: relative; display: flex; direction: ltr; height: 16px; border-radius: 99px; margin: 44px 6px 12px;}
.meter .sg {height: 100%;}
.s1 {width: 20%; background: #22C55E; border-radius: 99px 0 0 99px;}
.s2 {width: 20%; background: #F4C430;}
.s3 {width: 30%; background: #F08A24;}
.s4 {width: 30%; background: #D62828; border-radius: 0 99px 99px 0;}
.pointer {position: absolute; top: -34px; left: var(--p); transform: translateX(-50%); animation: slide 1.3s cubic-bezier(.2,.8,.2,1) both; text-align: center;}
.pointer span {display: block; background: var(--ptr); border-radius: 8px; padding: 1px 9px; font-size: .78rem; font-weight: 800;}
.stApp .pointer span {color: #ffffff;}
.pointer::after {content: ''; display: block; width: 4px; height: 26px; background: var(--ptr); border-radius: 4px; margin: 2px auto 0;}
.legend {display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .78rem; margin-bottom: 8px;}
.legend span::before {content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-inline-end: 5px; background: var(--c);}
.stepc {display: flex; gap: 12px; align-items: center; background: var(--card); color: var(--txt); border: 1px solid var(--brd); border-radius: 14px; padding: 10px 14px; margin: 6px 0; box-shadow: 0 4px 12px rgba(20,33,61,.07); animation: fadeUp .5s ease both;}
.stepc b {flex: 0 0 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #0F766E, #2563EB); display: flex; align-items: center; justify-content: center;}
.stApp .stepc b {color: #ffffff;}
@media (max-width: 640px) {
  .block-container {padding: 1rem .8rem 3rem;}
  h1 {font-size: 1.45rem !important; line-height: 1.25;}
  .hero {padding: 14px 14px 34px; border-radius: 16px;}
  .hero .tag {font-size: 1rem;}
  .hero .sub {font-size: .8rem;}
  .qcard {padding: 12px 12px; border-radius: 14px;}
  .qtext {font-size: 1.02rem;}
  [data-testid="stHorizontalBlock"] {flex-direction: row !important; flex-wrap: nowrap !important; gap: .5rem !important;}
  [data-testid="stColumn"], [data-testid="column"] {min-width: 0 !important; width: auto !important; flex: 1 1 0 !important;}
  .stButton > button, .stDownloadButton > button {min-height: 3.2rem; font-size: .92rem; padding: .5rem .5rem;}
  .drive {font-size: .95rem; padding: 12px 14px;}
  .meter {margin: 40px 2px 10px;}
  .legend {font-size: .7rem; gap: 4px 10px;}
  .stepc {padding: 8px 10px; gap: 8px;}
}
@media (max-width: 380px) {
  h1 {font-size: 1.2rem !important;}
  .hero .tag {font-size: .9rem;}
  .qtext {font-size: .95rem;}
  .stButton > button, .stDownloadButton > button {font-size: .85rem; min-height: 2.9rem;}
  .legend {font-size: .65rem;}
}
@media (prefers-reduced-motion: reduce) {* {animation: none !important; transition: none !important;}}
</style>"""
CSS_UR = "<style>.stApp {direction: rtl; text-align: right; line-height: 2.1;} .qtext {line-height: 2.2;} .legend {flex-direction: row;}</style>"
CSS_DARK = "<style>:root {--bg1:#0b1220; --bg2:#0e1830; --bg3:#0c1a17; --txt:#e8eef8; --card:#16223c; --brd:#2b3c60; --soft:#22304f; --line:#28395c; --btn:#2b3c60; --head:#a9c2ec; --side2:#0c1730; --ptr:#0b1220; --routine-txt:#241d05;}</style>"

st.markdown(CSS, unsafe_allow_html=True)
if s.theme == 'dark':   # dark theme overrides the :root colour variables
    st.markdown(CSS_DARK, unsafe_allow_html=True)
if L == 'ur':   # right-to-left layout for Urdu
    st.markdown(CSS_UR, unsafe_allow_html=True)

st.title(T(' IAI Expert System: Car Mechanic Assistant', ' آئی اے آئی ایکسپرٹ سسٹم: کار مکینک اسسٹنٹ'))
st.markdown("<div class='hero'><div class='tag'>" + (T('Decide. Defend. Drive safe.', 'فیصلہ۔ وضاحت۔ محفوظ سفر۔')) + "</div><div class='sub'>" + (T('Your pocket car mechanic: answer a few questions and get a clear, explained decision.', 'آپ کا جیبی کار مکینک: چند سوالوں کے جواب دیں اور وضاحت کے ساتھ واضح فیصلہ پائیں۔')) + "</div><div class='road'></div><div class='car'></div></div>", unsafe_allow_html=True)
st.warning(T(' Disclaimer: This is a DECISION SUPPORT tool, NOT a replacement for a qualified mechanic. It never gives a final diagnosis. Always get your car checked by a qualified mechanic.', ' اعلان: یہ صرف فیصلہ سازی میں مدد کا ٹول ہے، کسی مستند مکینک کا متبادل نہیں۔ یہ کبھی حتمی تشخیص نہیں دیتا۔ اپنی گاڑی ہمیشہ کسی مستند مکینک سے چیک کروائیں۔'))
_next_lang = {'en': 'ur', 'ur': 'en'}
_lang_label = {'en': ' English', 'ur': ' اردو'}
_lc, _tc = st.columns(2)
if _lc.button(_lang_label[_next_lang[L]], key="lang_btn"):
    s.lang = _next_lang[L]; st.rerun()

# ---------- Theme toggle: light / dark ----------
if _tc.button(T('Dark mode', 'ڈارک موڈ') if s.theme == 'light' else T('Light mode', 'لائٹ موڈ'), key='theme_btn'):
    s.theme = 'dark' if s.theme == 'light' else 'light'; st.rerun()

# ---------- The expert system (all questions, rules, scoring, report) ----------
run()
