"""
app.py — Main Streamlit application for FloraScan AI.
"""
import io
from html import escape

import numpy as np
from PIL import Image
import streamlit as st

# config.py imports
from config import (
    APP_NAME, APP_TAGLINE, CROP_EMOJI,
    CLASS_NAMES, NUM_CLASSES, CONFIDENCE_THRESHOLD, INPUT_SIZE,
    PATH_1, PATH_2,
    ENGINE_1_LABEL, ENGINE_2_LABEL, DUAL_LABEL, ENGINE_1_SHORT, ENGINE_2_SHORT,
    UNKNOWN_TONE, get_guide, get_meta,
)

# ---------------------------------------------------------
# Page Setup (must be the first Streamlit command)
# ---------------------------------------------------------
st.set_page_config(
    page_title=f"{APP_NAME} — Smart Phytopathology System",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded",
)

from model import load_all_models, model_stamp, predict_cached
from ui import (
    render, inject_css, init_state, log_scan,
    verdict_card, probability_bars, build_report,
)

inject_css()
init_state()


def show_image(img):
    """Full-width image renderer compatible with standard Streamlit versions."""
    try:
        st.image(img, use_container_width=True)
    except TypeError:
        st.image(img, use_column_width=True)


def clear_history():
    st.session_state.history = []


# ---------------------------------------------------------
# Sidebar Control Center
# ---------------------------------------------------------
with st.sidebar:
    st.markdown("### 🎛️ Control Center")
    selected_engine = st.radio(
        "Select Inference Engine",
        [ENGINE_1_LABEL, ENGINE_2_LABEL, DUAL_LABEL],
        index=0,
        help="Switching engines changes the background AI model in real-time.",
    )

    st.markdown("---")
    st.markdown("### 📡 System Status")
    c1, c2 = st.columns(2)
    c1.metric("Threshold", f"{CONFIDENCE_THRESHOLD:.0f}%", "Active")
    c2.metric("Compute", "CPU", "Ready")

    with st.expander("🛠️ Engine Specifications"):
        st.write("**Dataset:** Balanced 5-Class Set (4 Tomato + 1 Not_Leaf)")
        st.write(f"**Resolution:** {INPUT_SIZE}x{INPUT_SIZE} RGB")
        st.write(f"**Outputs:** {NUM_CLASSES} Health States")

    with st.expander("📸 Photo Tips", expanded=True):
        st.write("• Use natural daylight")
        st.write("• Fill the frame with one leaf")
        st.write("• Keep the leaf flat and in focus")

# ---------------------------------------------------------
# Model Loader Verification
# ---------------------------------------------------------
model_1, model_2, load_errors = load_all_models(model_stamp())
if load_errors or model_1 is None or model_2 is None:
    st.error(
        "⚠️ **System Offline:** the model checkpoints could not be loaded. "
        f"Please place `{PATH_1.name}` and `{PATH_2.name}` next to `app.py`."
    )
    for message in load_errors:
        st.warning(message)
    st.stop()

# ---------------------------------------------------------
# Hero Banner
# ---------------------------------------------------------
render(f"""
<div class="hero">
    <h1>{escape(APP_NAME)}</h1>
    <p>{escape(APP_TAGLINE)}</p>
    <span class="chip">{CROP_EMOJI} {NUM_CLASSES} Health States</span>
    <span class="chip">⚡ Real-time Inference</span>
    <span class="chip">🧠 Dual Engine Validation</span>
    <span class="chip">🛡️ {CONFIDENCE_THRESHOLD:.0f}% Safety Threshold</span>
</div>
""")

tab_scan, tab_lib, tab_hist = st.tabs(["🔬  Scan Leaf", "📚  Disease Library", "🕘  Scan History"])

# ---------------------------------------------------------
# Scan Tab
# ---------------------------------------------------------
with tab_scan:
    left, right = st.columns([1, 1.35], gap="large")

    sample = None   # {"name": str, "bytes": bytes}
    image = None

    with left:
        render('<div class="section-title">📥 Upload Leaf Sample</div>')
        uploaded_file = st.file_uploader(
            "Drop a leaf sample here for instant analysis",
            type=["jpg", "jpeg", "png", "webp"],
            label_visibility="collapsed",
            key="leaf_uploader",
        )
        if uploaded_file is not None:
            try:
                sample = {"name": uploaded_file.name, "bytes": uploaded_file.getvalue()}
                image = Image.open(io.BytesIO(sample["bytes"])).convert("RGB")
                show_image(image)
                render(f'<p class="muted" style="text-align:center;margin-top:8px;">📄 {escape(sample["name"])} · {image.size[0]}×{image.size[1]} px</p>')
            except Exception:
                sample = None
                image = None
                st.error("😕 We couldn't read that image. Please upload a valid JPG, PNG, or WEBP file.")

    with right:
        if image is None:
            render("""
            <div class="glass">
                <div class="section-title">✨ How it works</div>
                <div class="step"><div class="num">1</div><div><b>Upload a leaf photo</b><br><span class="muted">Drag & drop a JPG or PNG on the left.</span></div></div>
                <div class="step"><div class="num">2</div><div><b>AI analyzes the leaf</b><br><span class="muted">Your chosen engine reads color, texture and lesion patterns.</span></div></div>
                <div class="step"><div class="num">3</div><div><b>Get a clear action plan</b><br><span class="muted">See the diagnosis, confidence, and what to do next.</span></div></div>
            </div>
            <div class="glass" style="background:linear-gradient(135deg,#ecfdf5,#e0f2fe);">
                <div class="section-title">🌤️ Waiting for your leaf…</div>
                <p class="muted">Tip: switch to <b>Dual Benchmark Mode</b> in the sidebar to compare both engines side by side.</p>
            </div>
            """)
        else:
            file_name = sample["name"]
            file_id = f"{file_name}-{len(sample['bytes'])}"
            stamp = model_stamp()
            new_scan = False

            if selected_engine != DUAL_LABEL:
                # ---------------- SINGLE ENGINE ----------------
                use_engine_1 = selected_engine == ENGINE_1_LABEL
                engine_label = ENGINE_1_LABEL if use_engine_1 else ENGINE_2_LABEL

                with st.spinner("Analyzing leaf…"):
                    probabilities = predict_cached(sample["bytes"], 1 if use_engine_1 else 2, stamp)

                pred_class = CLASS_NAMES[int(np.argmax(probabilities))]
                confidence = float(np.max(probabilities) * 100)
                is_confident = confidence >= CONFIDENCE_THRESHOLD

                new_scan = log_scan(
                    f"{file_id}-{engine_label}", file_name, engine_label,
                    pred_class if is_confident else "Unrecognized", confidence,
                )

                verdict_card(pred_class, confidence)

                if not is_confident:
                    with st.expander("📊 See raw probability distribution"):
                        probability_bars(probabilities)
                else:
                    guide = get_guide(pred_class)
                    t_diag, t_metrics = st.tabs(["🩺 Diagnosis & Action Plan", "📊 Confidence Metrics"])

                    with t_diag:
                        if pred_class == "Non Leaf":
                            st.warning(f"**Notice:** {guide['description']}")
                            st.info(f"**Recommendation:** {guide['action']}")
                        else:
                            st.info(f"**Description:** {guide['description']}")
                            st.success(f"**Action Plan:** {guide['action']}")

                        st.download_button(
                            "⬇️ Download diagnosis report",
                            data=build_report(file_name, engine_label, pred_class, confidence),
                            file_name=f"florascan_report_{pred_class.replace(' ', '_').lower()}.txt",
                            mime="text/plain",
                            key=f"dl-{file_id}-{engine_label}",
                        )

                    with t_metrics:
                        render('<div class="section-title">Probability Distribution</div>')
                        probability_bars(probabilities)
            else:
                # ---------------- DUAL BENCHMARK ----------------
                with st.spinner("Running both engines…"):
                    prob_1 = predict_cached(sample["bytes"], 1, stamp)
                    prob_2 = predict_cached(sample["bytes"], 2, stamp)

                conf_1 = float(np.max(prob_1) * 100)
                conf_2 = float(np.max(prob_2) * 100)
                cls_1 = CLASS_NAMES[int(np.argmax(prob_1))]
                cls_2 = CLASS_NAMES[int(np.argmax(prob_2))]

                n1 = log_scan(f"{file_id}-engine1", file_name, ENGINE_1_SHORT,
                              cls_1 if conf_1 >= CONFIDENCE_THRESHOLD else "Unrecognized", conf_1)
                n2 = log_scan(f"{file_id}-engine2", file_name, ENGINE_2_SHORT,
                              cls_2 if conf_2 >= CONFIDENCE_THRESHOLD else "Unrecognized", conf_2)
                new_scan = n1 or n2

                both_sure = conf_1 >= CONFIDENCE_THRESHOLD and conf_2 >= CONFIDENCE_THRESHOLD
                if both_sure and cls_1 == cls_2:
                    if cls_1 == "Non Leaf":
                        banner_bg, banner_color = "#f1f5f9", "#334155"
                        banner_text = "📷 Both engines agree: <b>Non-leaf object detected</b>"
                    else:
                        banner_bg, banner_color = "#dcfce7", "#14532d"
                        banner_text = f"🤝 Both engines agree: <b>{escape(cls_1)}</b>"
                elif both_sure:
                    banner_bg, banner_color = "#fef2f2", "#7f1d1d"
                    banner_text = "⚖️ Engines disagree. Please review the sample manually."
                else:
                    banner_bg, banner_color = "#fffbeb", "#92400e"
                    banner_text = "🔎 At least one engine has low confidence. Try a clearer photo."

                render(f"""
                <div class="glass" style="background:{banner_bg}; color:{banner_color}; font-weight:600; padding:1rem 1.3rem;">
                    {banner_text}
                </div>
                """)

                col_a, col_b = st.columns(2, gap="medium")
                with col_a:
                    render(f'<div class="section-title">🔹 {escape(ENGINE_1_SHORT)} Engine</div>')
                    verdict_card(cls_1, conf_1, compact=True)
                    with st.expander(f"View {ENGINE_1_SHORT} Probabilities"):
                        probability_bars(prob_1)
                with col_b:
                    render(f'<div class="section-title">🔸 {escape(ENGINE_2_SHORT)} Engine</div>')
                    verdict_card(cls_2, conf_2, compact=True)
                    with st.expander(f"View {ENGINE_2_SHORT} Probabilities"):
                        probability_bars(prob_2)

            if new_scan:
                st.toast("Analysis complete — saved to history", icon="✅")

# ---------------------------------------------------------
# Disease Library Tab
# ---------------------------------------------------------
with tab_lib:
    render("""
    <div class="glass">
        <div class="section-title">📚 Know your leaf conditions</div>
        <p class="muted">The health states FloraScan can recognize, with telltale signs and recommended care.</p>
    </div>
    """)
    lib_cols = st.columns(2, gap="large")
    for idx, name in enumerate(CLASS_NAMES):
        meta = get_meta(name)
        guide = get_guide(name)
        signs_html = "".join(f'<span class="sig">{escape(s)}</span>' for s in meta["signs"])
        with lib_cols[idx % 2]:
            render(f"""
            <div class="lib" style="border-top:5px solid {meta['tone']};">
                <div class="icon">{meta['icon']}</div>
                <h3>{escape(name)}</h3>
                <span class="tag" style="background:{meta['tone']}22; color:{meta['tone']};">{escape(meta['kind']).upper()} · SEVERITY: {escape(meta['severity']).upper()}</span>
                <p class="muted" style="margin-top:8px;">{meta['desc_html']}</p>
                <div>{signs_html}</div>
                <div class="act"><b>Recommended action:</b> {escape(guide['action'])}</div>
            </div>
            """)

# ---------------------------------------------------------
# Scan History Tab
# ---------------------------------------------------------
with tab_hist:
    top_l, top_r = st.columns([4, 1])
    with top_l:
        render('<div class="section-title">🕘 Scans this session</div>')
    with top_r:
        if st.session_state.history:
            st.button("🧹 Clear history", key="clear_history", on_click=clear_history)

    if not st.session_state.history:
        render("""
        <div class="glass" style="text-align:center;">
            <div style="font-size:2.5rem;">🍃</div>
            <p class="muted">No scans yet. Upload a leaf in the Scan tab and your results will appear here.</p>
        </div>
        """)
    else:
        for item in reversed(st.session_state.history):
            if item["label"] in CLASS_NAMES:
                tone = get_meta(item["label"])["tone"]
            else:
                tone = UNKNOWN_TONE
            render(f"""
            <div class="hist">
                <div class="dot" style="background:{tone};"></div>
                <div style="flex:1;">
                    <b style="color:#0f172a;">{escape(item['label'])}</b><br>
                    <span class="muted">{escape(item['file'])} · {escape(item['engine'])}</span>
                </div>
                <div style="text-align:right;">
                    <b style="color:{tone};">{item['conf']:.1f}%</b><br>
                    <span class="muted">{item['time']}</span>
                </div>
            </div>
            """)

render(f'<div class="footnote">{escape(APP_NAME)} provides AI-assisted guidance. Confirm critical decisions with an agronomist.</div>')