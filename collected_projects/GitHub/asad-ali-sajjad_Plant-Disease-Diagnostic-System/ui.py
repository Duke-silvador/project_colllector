"""
ui.py — HTML/visual helpers. Contains no top-level Streamlit calls.
"""
from datetime import datetime
from html import escape

import numpy as np
import streamlit as st

from config import (
    APP_NAME, CLASS_NAMES, CONFIDENCE_THRESHOLD, CSS_PATH, UNKNOWN_TONE,
    get_guide, get_meta,
)


def render(markup: str):
    """Render HTML safely (strips indentation so Markdown never treats it as a code block)."""
    cleaned = "\n".join(line.strip() for line in markup.strip().splitlines() if line.strip())
    st.markdown(cleaned, unsafe_allow_html=True)


def inject_css():
    """Load styles.css next to the app."""
    if CSS_PATH.exists():
        css = CSS_PATH.read_text(encoding="utf-8")
        st.markdown("<style>\n" + css + "\n</style>", unsafe_allow_html=True)
    else:
        st.warning("styles.css was not found next to app.py, so the app is showing default styling.")


# ---------------------------------------------------------
# Session history
# ---------------------------------------------------------
def init_state():
    if "history" not in st.session_state:
        st.session_state.history = []
    if "logged" not in st.session_state:
        st.session_state.logged = set()


def log_scan(key, file_name, engine, label, conf):
    """Add a scan to history once. Returns True if it was newly added."""
    if key in st.session_state.logged:
        return False
    st.session_state.logged.add(key)
    st.session_state.history.append({
        "time": datetime.now().strftime("%H:%M:%S"),
        "file": file_name,
        "engine": engine,
        "label": label,
        "conf": conf,
    })
    return True


# ---------------------------------------------------------
# Result components
# ---------------------------------------------------------
def verdict_card(pred_class, confidence, compact=False):
    """Gauge-style result card, or an 'unrecognized' card when confidence is low."""
    cls = "result compact" if compact else "result"
    if confidence < CONFIDENCE_THRESHOLD:
        render(f"""
        <div class="{cls}" style="background:linear-gradient(135deg,#fffbeb,#fef3c7);">
            <div class="gauge" style="--p:{confidence:.1f}; --c:{UNKNOWN_TONE};">
                <div class="gauge-inner">{confidence:.0f}%<small>confidence</small></div>
            </div>
            <div>
                <span class="tag" style="color:#92400e;">⚠️ LOW CONFIDENCE</span>
                <h2>Unrecognized Sample</h2>
                <p>Confidence is below {CONFIDENCE_THRESHOLD:.0f}%. This doesn't match our leaf database well. Try a clearer, closer photo.</p>
            </div>
        </div>
        """)
        return

    meta = get_meta(pred_class)
    summary = "" if compact else f"<p>{meta['desc_html']}</p>"
    render(f"""
    <div class="{cls}" style="background:{meta['bg']};">
        <div class="gauge" style="--p:{confidence:.1f}; --c:{meta['tone']};">
            <div class="gauge-inner">{confidence:.0f}%<small>match</small></div>
        </div>
        <div>
            <span class="tag" style="color:{meta['tone']};">{meta['icon']} {escape(meta['kind']).upper()} · SEVERITY: {escape(meta['severity']).upper()}</span>
            <h2>{escape(pred_class)}</h2>
            {summary}
        </div>
    </div>
    """)


def probability_bars(probabilities):
    top = int(np.argmax(probabilities))
    for i, name in enumerate(CLASS_NAMES):
        meta = get_meta(name)
        score = float(probabilities[i]) * 100
        color = meta["tone"] if i == top else "#cbd5e1"
        text_color = meta["tone"] if i == top else "#64748b"
        render(f"""
        <div class="bar-row">
            <div class="bar-head"><span>{meta['icon']} {escape(name)}</span><span style="color:{text_color};">{score:.1f}%</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:{score:.1f}%; background:{color};"></div></div>
        </div>
        """)


def build_report(file_name, engine, pred_class, confidence):
    guide = get_guide(pred_class)
    clean_desc = guide["description"].replace("*", "")
    title = f"{APP_NAME.upper()} — DIAGNOSTIC REPORT"
    return (
        f"{title}\n"
        f"{'=' * len(title)}\n"
        f"Date       : {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
        f"Sample     : {file_name}\n"
        f"Engine     : {engine}\n"
        f"Diagnosis  : {pred_class}\n"
        f"Confidence : {confidence:.1f}%\n\n"
        f"Description:\n{clean_desc}\n\n"
        f"Recommended Action:\n{guide['action']}\n\n"
        "Note: AI-assisted guidance. Confirm with an agronomist for critical decisions.\n"
    )