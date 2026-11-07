import streamlit as st
from datetime import datetime
import requests
from prediction_history import save_prediction
from history_viewer import get_prediction_history, filter_prediction_history
from io import BytesIO
from PIL import Image
from pathlib import Path
from disease_database.loader import (
    load_disease_information,
    load_disclaimer
)
# Load disease database and disclaimer
disclaimer = load_disclaimer()
disease_database = load_disease_information()

# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Plant Vision AI",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ============================================================
# FASTAPI CONNECTION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "best.pt"
import os

API_BASE_URL = os.getenv(
    "API_BASE_URL",
    "http://127.0.0.1:8000"
)

API_URL = f"{API_BASE_URL}/predict"

# ============================================================
# LOAD DISEASE DATABASE
# ============================================================

disease_database = load_disease_information()
disclaimer = load_disclaimer()
# ============================================================
# LANGUAGE SELECTION
# ============================================================

with st.sidebar:
    language = st.selectbox(
        "🌐 Information Language",
        options=["English", "తెలుగు"]
    )

    selected_language = (
        "english" if language == "English" else "telugu"
    )

    # Load bilingual disclaimer
    disease_database = load_disease_information()
# ============================================================
# FUTURISTIC ANIMATED BACKGROUND
# ============================================================

st.html("""
<style>

html, body {
    overflow-x: hidden;
}


/* ==========================================================
   MAIN BACKGROUND
   ========================================================== */

.plant-background {

    position: fixed;

    left: 0;
    top: 0;

    width: 100vw;
    height: 100vh;

    z-index: -999;

    overflow: hidden;

    pointer-events: none;

    background:
        radial-gradient(
            circle at 15% 25%,
            rgba(24, 255, 120, 0.12),
            transparent 30%
        ),
        radial-gradient(
            circle at 85% 75%,
            rgba(0, 220, 180, 0.10),
            transparent 30%
        ),
        linear-gradient(
            135deg,
            #020806 0%,
            #06150d 45%,
            #020806 100%
        );
}


/* ==========================================================
   ATMOSPHERIC GLOW
   ========================================================== */

.glow-orb {

    position: absolute;

    border-radius: 50%;

    filter: blur(90px);

    opacity: 0.22;

}


.glow-orb.one {

    width: 500px;
    height: 500px;

    left: -200px;
    top: -180px;

    background: #16ff72;

    animation:
        orbOne 18s ease-in-out infinite alternate;
}


.glow-orb.two {

    width: 450px;
    height: 450px;

    right: -180px;
    bottom: -170px;

    background: #00d6a0;

    animation:
        orbTwo 20s ease-in-out infinite alternate;
}


.glow-orb.three {

    width: 280px;
    height: 280px;

    left: 42%;
    top: 40%;

    background: #3aff96;

    opacity: 0.08;

    animation:
        orbThree 14s ease-in-out infinite alternate;
}


/* ==========================================================
   DIGITAL GRID
   ========================================================== */

.digital-grid {

    position: absolute;

    inset: 0;

    opacity: 0.035;

    background-image:

        linear-gradient(
            rgba(100,255,170,0.45) 1px,
            transparent 1px
        ),

        linear-gradient(
            90deg,
            rgba(100,255,170,0.45) 1px,
            transparent 1px
        );

    background-size:
        70px 70px;

    mask-image:
        radial-gradient(
            ellipse at center,
            black 0%,
            transparent 78%
        );

}


/* ==========================================================
   NEURAL NETWORK
   ========================================================== */

.neural-network {

    position: absolute;

    width: 100%;
    height: 100%;

    opacity: 0.35;

}


.connection {

    fill: none;

    stroke: #54ff9a;

    stroke-width: 1;

    stroke-dasharray: 7 17;

    animation:
        dataTravel 8s linear infinite;
}


.connection.cyan {

    stroke: #42e8d0;

    animation-duration: 11s;

}


.network-node {

    fill: #65ffa5;

    filter:
        drop-shadow(
            0 0 7px #42ff91
        );

    animation:
        nodeGlow 3s ease-in-out infinite;
}


.network-node.cyan {

    fill: #50e7d0;

    animation-delay: 1s;

}


/* ==========================================================
   MOVING DATA PARTICLES
   ========================================================== */

.data-particle {

    position: absolute;

    width: 4px;
    height: 4px;

    border-radius: 50%;

    background: #75ffae;

    box-shadow:

        0 0 8px #5dff9e,

        0 0 20px rgba(70,255,150,0.7);

    opacity: 0;

}


.p1 {

    left: 8%;
    top: 72%;

    animation:
        particleOne 9s linear infinite;
}


.p2 {

    left: 28%;
    top: 82%;

    animation:
        particleTwo 12s linear infinite 2s;
}


.p3 {

    left: 50%;
    top: 75%;

    animation:
        particleThree 10s linear infinite 1s;
}


.p4 {

    left: 73%;
    top: 28%;

    animation:
        particleFour 11s linear infinite 3s;
}


.p5 {

    left: 90%;
    top: 60%;

    animation:
        particleFive 9s linear infinite 4s;
}


/* ==========================================================
   SCANNING BEAM
   ========================================================== */

.scanner {

    position: absolute;

    left: -10%;

    width: 120%;

    height: 2px;

    top: -5%;

    background:
        linear-gradient(
            90deg,
            transparent 0%,
            transparent 20%,
            rgba(70,255,150,0.05) 35%,
            rgba(90,255,160,0.7) 50%,
            rgba(70,255,150,0.05) 65%,
            transparent 80%,
            transparent 100%
        );

    box-shadow:
        0 0 18px rgba(70,255,150,0.35);

    opacity: 0.45;

    animation:
        scanDown 12s linear infinite;
}


.scanner::after {

    content: "";

    position: absolute;

    left: 30%;
    right: 30%;

    top: -25px;

    height: 50px;

    background:
        radial-gradient(
            ellipse,
            rgba(60,255,150,0.12),
            transparent 70%
        );

    filter: blur(10px);
}


/* ==========================================================
   BOTANICAL VEINS
   ========================================================== */

.botanical {

    position: absolute;

    width: 550px;
    height: 550px;

    right: -130px;
    top: 70px;

    opacity: 0.06;

    animation:
        botanicalMove 15s ease-in-out infinite alternate;
}


.botanical svg {

    width: 100%;
    height: 100%;
}


.vein {

    fill: none;

    stroke: #8cffba;

    stroke-width: 2;
}


/* ==========================================================
   KEYFRAMES
   ========================================================== */

@keyframes orbOne {

    0% {
        transform:
            translate(0, 0)
            scale(1);
    }

    100% {
        transform:
            translate(220px, 160px)
            scale(1.25);
    }
}


@keyframes orbTwo {

    0% {
        transform:
            translate(0, 0)
            scale(1);
    }

    100% {
        transform:
            translate(-190px, -130px)
            scale(1.2);
    }
}


@keyframes orbThree {

    0% {
        transform:
            translate(0, 0);
    }

    100% {
        transform:
            translate(100px, -80px);
    }
}


@keyframes dataTravel {

    from {
        stroke-dashoffset: 0;
    }

    to {
        stroke-dashoffset: -150;
    }
}


@keyframes nodeGlow {

    0%, 100% {

        opacity: 0.35;

        transform:
            scale(0.8);
    }

    50% {

        opacity: 1;

        transform:
            scale(1.5);
    }
}


@keyframes scanDown {

    0% {

        top: -5%;

        opacity: 0;
    }

    10% {

        opacity: 0.45;
    }

    50% {

        opacity: 0.3;
    }

    90% {

        opacity: 0.45;
    }

    100% {

        top: 105%;

        opacity: 0;
    }
}


@keyframes particleOne {

    0% {

        transform:
            translate(0, 100px);

        opacity: 0;
    }

    15% {
        opacity: 0.9;
    }

    100% {

        transform:
            translate(420px, -420px);

        opacity: 0;
    }
}


@keyframes particleTwo {

    0% {

        transform:
            translate(0, 100px);

        opacity: 0;
    }

    15% {
        opacity: 0.8;
    }

    100% {

        transform:
            translate(-320px, -420px);

        opacity: 0;
    }
}


@keyframes particleThree {

    0% {

        transform:
            translate(0, 120px);

        opacity: 0;
    }

    15% {
        opacity: 0.8;
    }

    100% {

        transform:
            translate(300px, -430px);

        opacity: 0;
    }
}


@keyframes particleFour {

    0% {

        transform:
            translate(0, 100px);

        opacity: 0;
    }

    15% {
        opacity: 0.8;
    }

    100% {

        transform:
            translate(-350px, 400px);

        opacity: 0;
    }
}


@keyframes particleFive {

    0% {

        transform:
            translate(0, 100px);

        opacity: 0;
    }

    15% {
        opacity: 0.8;
    }

    100% {

        transform:
            translate(-450px, -300px);

        opacity: 0;
    }
}


@keyframes botanicalMove {

    0% {

        transform:
            rotate(-18deg)
            translate(0, 0);
    }

    100% {

        transform:
            rotate(-13deg)
            translate(-35px, 20px);
    }
}


/* ==========================================================
   REDUCED MOTION
   ========================================================== */

@media (prefers-reduced-motion: reduce) {

    * {
        animation: none !important;
    }

}

</style>


<div class="plant-background">

    <div class="glow-orb one"></div>

    <div class="glow-orb two"></div>

    <div class="glow-orb three"></div>

    <div class="digital-grid"></div>


    <!-- Neural network -->

    <svg
        class="neural-network"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
    >

        <path
            class="connection"
            d="
                M20 700
                L280 520
                L500 650
                L740 420
                L980 550
                L1230 300
                L1580 470
            "
        />

        <path
            class="connection cyan"
            d="
                M100 200
                L370 360
                L610 220
                L850 350
                L1090 180
                L1460 290
            "
        />

        <path
            class="connection"
            d="
                M280 520
                L370 360
            "
        />

        <path
            class="connection cyan"
            d="
                M500 650
                L610 220
            "
        />

        <path
            class="connection"
            d="
                M740 420
                L850 350
            "
        />

        <path
            class="connection cyan"
            d="
                M980 550
                L1090 180
            "
        />

        <path
            class="connection"
            d="
                M1230 300
                L1460 290
            "
        />


        <!-- Nodes -->

        <circle
            class="network-node"
            cx="20"
            cy="700"
            r="4"
        />

        <circle
            class="network-node"
            cx="280"
            cy="520"
            r="5"
        />

        <circle
            class="network-node cyan"
            cx="500"
            cy="650"
            r="4"
        />

        <circle
            class="network-node"
            cx="740"
            cy="420"
            r="5"
        />

        <circle
            class="network-node cyan"
            cx="980"
            cy="550"
            r="4"
        />

        <circle
            class="network-node"
            cx="1230"
            cy="300"
            r="5"
        />

        <circle
            class="network-node cyan"
            cx="1460"
            cy="290"
            r="4"
        />

    </svg>


    <!-- Botanical structure -->

    <div class="botanical">

        <svg viewBox="0 0 500 500">

            <path
                class="vein"
                d="
                    M100 450
                    C130 330
                    180 230
                    250 100
                "
            />

            <path
                class="vein"
                d="
                    M130 350
                    C210 340
                    270 300
                    340 230
                "
            />

            <path
                class="vein"
                d="
                    M155 300
                    C105 270
                    80 230
                    70 180
                "
            />

            <path
                class="vein"
                d="
                    M185 250
                    C260 230
                    305 185
                    340 130
                "
            />

            <path
                class="vein"
                d="
                    M220 190
                    C175 150
                    160 110
                    170 65
                "
            />

        </svg>

    </div>


    <!-- Moving particles -->

    <span class="data-particle p1"></span>

    <span class="data-particle p2"></span>

    <span class="data-particle p3"></span>

    <span class="data-particle p4"></span>

    <span class="data-particle p5"></span>


    <!-- Scanner -->

    <div class="scanner"></div>

</div>
""")


# ============================================================
# APPLICATION CSS
# ============================================================

st.markdown("""
<style>

/* Hide Streamlit branding */

#MainMenu {
    visibility: hidden;
}

footer {
    visibility: hidden;
}


/* Transparent header */

header {
    background: transparent !important;
}


/* Main content */

.block-container {

    max-width: 1250px;

    padding-top: 1.5rem;
    padding-bottom: 4rem;

}


/* Sidebar */

[data-testid="stSidebar"] {

    background:
        linear-gradient(
            180deg,
            rgba(4,18,11,0.98),
            rgba(2,9,6,0.98)
        );

    border-right:
        1px solid
        rgba(90,255,150,0.10);

}


/* Main title */

.main-title {

    font-size: 60px;

    font-weight: 850;

    text-align: center;

    letter-spacing: -2px;

    background:
        linear-gradient(
            90deg,
            #ffffff,
            #9affbd,
            #38ff8b,
            #ffffff
        );

    background-size: 250% auto;

    -webkit-background-clip: text;

    -webkit-text-fill-color: transparent;

    animation:
        titleFlow 7s linear infinite;

}


@keyframes titleFlow {

    0% {
        background-position: 0% center;
    }

    100% {
        background-position: 250% center;
    }

}


/* Subtitle */

.subtitle {

    text-align: center;

    color:
        #8ea397;

    font-size: 16px;

    margin-top: -10px;

}


/* Status */

.status-box {

    text-align: center;

    margin-top: 22px;

    margin-bottom: 35px;

}


.status-pill {

    display: inline-block;

    padding:
        8px 18px;

    border-radius: 50px;

    color:
        #9dffc0;

    background:
        rgba(30,100,60,0.18);

    border:
        1px solid
        rgba(80,255,150,0.25);

}


/* Glowing dot */

.status-pill::before {

    content: "●";

    color:
        #3cff88;

    margin-right: 8px;

    text-shadow:
        0 0 10px
        #3cff88;

}


/* Section headings */

.section-heading {

    font-size: 22px;

    font-weight: 750;

    color: #effff5;

}


.section-description {

    color:
        #81968a;

    font-size: 14px;

}


/* File uploader */

[data-testid="stFileUploader"] {

    background:
        rgba(10,30,19,0.55);

    border:
        1px dashed
        rgba(80,255,150,0.25);

    border-radius:
        18px;

    padding:
        8px;

    transition:
        0.3s ease;

}


[data-testid="stFileUploader"]:hover {

    border-color:
        rgba(80,255,150,0.65);

    box-shadow:
        0 0 30px
        rgba(60,255,140,0.08);

}


/* Camera */

[data-testid="stCameraInput"] {

    border-radius:
        18px;

}


/* Buttons */

.stButton > button {

    min-height:
        50px;

    border-radius:
        14px;

    border:
        1px solid
        rgba(90,255,150,0.32);

    background:
        linear-gradient(
            135deg,
            #145b38,
            #08351f
        );

    color:
        white;

    font-weight:
        700;

    transition:
        0.25s ease;

}


.stButton > button:hover {

    transform:
        translateY(-2px);

    border-color:
        rgba(100,255,170,0.70);

    box-shadow:
        0 0 30px
        rgba(60,255,140,0.15);

}


/* Images */

[data-testid="stImage"] {

    border-radius:
        20px;

    overflow:
        hidden;

    box-shadow:
        0 20px 70px
        rgba(0,0,0,0.40);

}


/* Result */

.result-box {

    padding:
        30px;

    margin-top:
        30px;

    border-radius:
        24px;

    background:
        linear-gradient(
            135deg,
            rgba(20,100,55,0.35),
            rgba(4,35,22,0.65)
        );

    border:
        1px solid
        rgba(90,255,150,0.25);

    box-shadow:
        0 20px 70px
        rgba(0,0,0,0.35);

    animation:
        resultIn 0.7s ease-out;

}


@keyframes resultIn {

    from {

        opacity: 0;

        transform:
            translateY(20px)
            scale(0.97);

    }

    to {

        opacity: 1;

        transform:
            translateY(0)
            scale(1);

    }

}


.result-label {

    color:
        #69ff9e;

    font-size:
        12px;

    font-weight:
        800;

    letter-spacing:
        2px;

}


.result-name {

    font-size:
        34px;

    font-weight:
        800;

    color:
        white;

    margin-top:
        8px;

}


/* Metric cards */

.metric-box {

    text-align:
        center;

    padding:
        20px;

    border-radius:
        18px;

    background:
        rgba(5,25,15,0.70);

    border:
        1px solid
        rgba(90,255,150,0.12);

}


.metric-number {

    font-size:
        28px;

    font-weight:
        800;

    color:
        #8cffb5;

}


.metric-name {

    font-size:
        11px;

    letter-spacing:
        1px;

    color:
        #71867b;

}


/* Prediction table */

.prediction-item {

    display:
        flex;

    justify-content:
        space-between;

    padding:
        13px 16px;

    margin:
        6px 0;

    border-radius:
        12px;

    background:
        rgba(255,255,255,0.025);

}


/* Mobile */

@media (max-width: 768px) {

    .main-title {

        font-size:
            40px;

    }

}

</style>
""", unsafe_allow_html=True)


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.markdown(
        "## 🌿 Plant Vision AI"
    )

    st.markdown("---")

    st.markdown(
        "### 🧠 AI MODEL"
    )

    st.success(
        "YOLO26n Classification"
    )

    st.markdown(
        """
**Dataset**

• PlantVillage  
• 38 classes  
• 54,305 images  

**Training**

• 43,429 images  

**Validation**

• 5,417 images  

**Testing**

• 5,459 images
"""
    )

    st.markdown("---")

    st.markdown(
        "### 📊 MODEL PERFORMANCE"
    )

    st.metric(
        "Test Top-1 Accuracy",
        "99.4%"
    )

    st.metric(
        "Test Top-5 Accuracy",
        "100%"
    )

    st.markdown("---")

    st.caption(
        "Plant Vision AI • Computer Vision • YOLO"
    )


# ============================================================
# HERO SECTION
# ============================================================

st.markdown(
    '<div style="text-align:center;font-size:58px;">🌿</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="main-title">Plant Vision AI</div>',
    unsafe_allow_html=True
)

st.markdown(
    """
<div class="subtitle">
Intelligent plant health analysis powered by computer vision
</div>
""",
    unsafe_allow_html=True
)

st.markdown(
    """
<div class="status-box">
<span class="status-pill">
AI Vision Engine Online
</span>
</div>
""",
    unsafe_allow_html=True
)


# ============================================================
# TWO COLUMN INPUT AREA
# ============================================================

left, right = st.columns(
    [1, 1],
    gap="large"
)


# ============================================================
# LEFT SIDE
# ============================================================

with left:

    st.markdown(
        '<div class="section-heading">🌱 Analyze Plant</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-description">'
        'Upload a plant leaf image for AI analysis.'
        '</div>',
        unsafe_allow_html=True
    )

    st.write("")

    uploaded_file = st.file_uploader(
        "Choose plant image",
        type=[
            "jpg",
            "jpeg",
            "png"
        ]
    )

    st.write("")

    camera_image = st.camera_input(
        "Or capture using camera"
    )


# ============================================================
# SELECT IMAGE
# ============================================================

image_source = None

if uploaded_file is not None:

    image_source = uploaded_file

elif camera_image is not None:

    image_source = camera_image


# ============================================================
# RIGHT SIDE
# ============================================================

with right:

    st.markdown(
        '<div class="section-heading">🔬 Vision Input</div>',
        unsafe_allow_html=True
    )

    st.markdown(
        '<div class="section-description">'
        'Your image will be processed by the trained YOLO model.'
        '</div>',
        unsafe_allow_html=True
    )

    st.write("")

    if image_source is not None:

        image = Image.open(
            image_source
        ).convert("RGB")

        st.image(
            image,
            caption="Plant image ready for analysis",
            width="stretch"
        )

    else:

        st.info(
            "Upload or capture a plant image to begin."
        )


# ============================================================
# PREDICTION
# ============================================================

if image_source is not None:

    st.write("")
    st.divider()

    analyze_col1, analyze_col2, analyze_col3 = st.columns(
        [1, 2, 1]
    )

    with analyze_col2:
        analyze = st.button(
            "🔬 ANALYZE PLANT",
            width="stretch"
        )

    if analyze:

        image = Image.open(
            image_source
        ).convert("RGB")

        # ----------------------------------------------------
        # Processing message
        # ----------------------------------------------------

        with st.spinner(
            "AI Vision Engine is analyzing the plant..."
        ):

            try:

                # Convert image into bytes
                image_bytes = BytesIO()
                image.save(
                    image_bytes,
                    format="JPEG"
                )
                image_bytes.seek(0)

                # Send image to FastAPI
                response = requests.post(
                    API_URL,
                    files={
                        "file": (
                            "plant_image.jpg",
                            image_bytes,
                            "image/jpeg"
                        )
                    },
                    timeout=60
                )

                # Check API response
                if response.status_code != 200:
                    st.error(
                        f"API Error {response.status_code}: "
                        f"{response.text}"
                    )
                    st.stop()

                # Read prediction from FastAPI
                prediction = response.json()

                predicted_disease = prediction[
                    "predicted_disease"
                ]

                confidence = float(
                    prediction["confidence"]
                )

                predicted_class = predicted_disease

                # ------------------------------------------------
                # SAVE PREDICTION HISTORY
                # ------------------------------------------------

                current_datetime = datetime.now()

                prediction_date = current_datetime.strftime("%Y-%m-%d")
                prediction_time = current_datetime.strftime("%H:%M:%S")

                image_reference = "uploaded_or_camera_image"

                save_prediction(
                    prediction_date,
                    prediction_time,
                    image_reference,
                    predicted_class,
                    confidence
                )

                # Find information about the predicted disease
                disease_info = next(
                    (
                        item
                        for item in disease_database
                        if item["class_name"] == predicted_class
                    ),
                    None
                )

            except requests.exceptions.ConnectionError:
                st.error(
                    "Cannot connect to FastAPI. "
                    "Please start the backend server."
                )
                st.stop()

            except requests.exceptions.Timeout:
                st.error(
                    "The FastAPI server took too long to respond. "
                    "Please try again."
                )
                st.stop()

            except Exception as error:
                st.error(
                    f"Prediction failed: {error}"
                )
                st.stop()

        # ----------------------------------------------------
        # RESULT
        # ----------------------------------------------------

        st.markdown(
            f"""
<div class="result-box">


<div class="result-label">
AI-ASSISTED PREDICTION
</div>

<div class="result-name">
🌿 {predicted_class}
</div>

</div>
""",
            unsafe_allow_html=True
        )

        st.write("")

        # ----------------------------------------------------
        # METRICS
        # ----------------------------------------------------

        metric1, metric2, metric3 = st.columns(3)

        with metric1:

            st.markdown(
                f"""
<div class="metric-box">

<div class="metric-number">
{confidence * 100:.2f}%
</div>

<div class="metric-name">
CONFIDENCE
</div>

</div>
""",
                unsafe_allow_html=True
            )

        with metric2:

            st.markdown(
                """
<div class="metric-box">

<div class="metric-number">
38
</div>

<div class="metric-name">
CLASSES
</div>

</div>
""",
                unsafe_allow_html=True
            )

        with metric3:

            st.markdown(
                """
<div class="metric-box">

<div class="metric-number">
YOLO
</div>

<div class="metric-name">
VISION ENGINE
</div>

</div>
""",
                unsafe_allow_html=True
            )

        # ----------------------------------------------------
        # CONFIDENCE INFORMATION
        # ----------------------------------------------------

        st.write("")

        st.markdown(
            "### 🧠 AI Confidence Map"
        )

        st.markdown(
            f"""
<div class="prediction-item">

<span>
<b>1.</b>
{predicted_class}
</span>

<span style="
color:#8cffb5;
font-weight:700;
">
{confidence * 100:.2f}%
</span>

</div>
""",
            unsafe_allow_html=True
        )

        # ----------------------------------------------------
        # DISEASE INFORMATION
        # ----------------------------------------------------

        st.write("")

        if disease_info is not None:

            st.markdown(
                "### 🌿 Disease Information"
            )

            st.markdown(
                f"**Disease:** {disease_info['disease_name']}"
            )

            st.markdown("#### 🔍 Symptoms")
            st.write(
                disease_info["symptoms"][selected_language]
            )

            st.markdown("#### 🛡️ Prevention")
            st.write(
                disease_info["prevention"][selected_language]
            )

            st.markdown("#### 🩺 Management")
            st.write(
                disease_info["management"][selected_language]
            )

        else:

            st.warning(
                "Disease information is not available."
            )

        # ----------------------------------------------------
        # AI DISCLAIMER
        # ----------------------------------------------------

        st.write("")

        st.markdown(
            f"""
            <div style="
                margin-top: 25px;
                padding: 18px 22px;
                border-radius: 16px;
                background: rgba(255, 193, 7, 0.08);
                border: 1px solid rgba(255, 193, 7, 0.25);
                color: #d8e4dc;
                font-size: 14px;
                line-height: 1.6;
            ">
                <div style="
                    color: #ffd166;
                    font-weight: 800;
                    margin-bottom: 6px;
                    font-size: 15px;
                ">
                    ⚠️ AI-ASSISTED RESULT
                </div>

                {disclaimer[selected_language]}
            </div>
            """,
            unsafe_allow_html=True
        )

        


# ============================================================
# PREDICTION HISTORY
# ============================================================

st.write("")
st.divider()

st.markdown(
    """
    <div class="section-heading">
        📜 Prediction History
    </div>
    """,
    unsafe_allow_html=True
)

st.markdown(
    """
    <div class="section-description">
        View and filter your previous AI-assisted plant disease predictions.
    </div>
    """,
    unsafe_allow_html=True
)

st.write("")

# ------------------------------------------------------------
# LOAD HISTORY
# ------------------------------------------------------------

history = get_prediction_history()

if history.empty:

    st.info(
        "No prediction history available yet."
    )

else:

    # --------------------------------------------------------
    # FILTER SECTION
    # --------------------------------------------------------

    st.markdown("### 🔎 Filter History")

    filter_col1, filter_col2, filter_col3 = st.columns(3)

    # --------------------------------------------------------
    # DATE FILTER
    # --------------------------------------------------------

    with filter_col1:

        use_date_filter = st.checkbox(
            "Filter by Date"
        )

        selected_date = None

        if use_date_filter:

            selected_date = st.date_input(
                "Select Date",
                value=datetime.now().date()
            )

    # --------------------------------------------------------
    # DISEASE FILTER
    # --------------------------------------------------------

    with filter_col2:

        disease_options = [
            "All"
        ] + sorted(
            history["predicted_class"]
            .dropna()
            .unique()
            .tolist()
        )

        selected_disease = st.selectbox(
            "Disease / Class",
            disease_options
        )

    # --------------------------------------------------------
    # CONFIDENCE FILTER
    # --------------------------------------------------------

    with filter_col3:

        minimum_confidence_percentage = st.slider(
            "Minimum Confidence",
            min_value=0,
            max_value=100,
            value=0,
            step=5
        )

        minimum_confidence = (
            minimum_confidence_percentage / 100
        )

    # --------------------------------------------------------
    # APPLY FILTERS
    # --------------------------------------------------------

    filtered_history = filter_prediction_history(
        history,
        selected_date=selected_date,
        selected_disease=selected_disease,
        minimum_confidence=minimum_confidence
    )

    st.write("")

    # --------------------------------------------------------
    # FILTER RESULT
    # --------------------------------------------------------

    st.caption(
        f"Showing {len(filtered_history)} "
        f"of {len(history)} prediction records."
    )

    # --------------------------------------------------------
    # DISPLAY HISTORY
    # --------------------------------------------------------

    if filtered_history.empty:

        st.warning(
            "No prediction history matches the selected filters."
        )

    else:

        history_display = filtered_history.copy()

        history_display["confidence"] = (
            history_display["confidence"] * 100
        ).round(2)

        history_display = history_display.rename(
            columns={
                "id": "ID",
                "prediction_date": "Date",
                "prediction_time": "Time",
                "image_reference": "Image",
                "predicted_class": "Prediction",
                "confidence": "Confidence (%)"
            }
        )

        st.dataframe(
            history_display,
            width="stretch",
            hide_index=True
        )


# ============================================================
# FOOTER
# ============================================================

st.write("")

st.divider()

st.markdown(
    """
<div style="
text-align:center;
padding:25px;
color:#60786b;
font-size:12px;
">

🌿 <b>PLANT VISION AI</b>

<br><br>

Intelligent Agriculture • Computer Vision • YOLO

<br>

AI-assisted plant health analysis

</div>
""",
    unsafe_allow_html=True
)
