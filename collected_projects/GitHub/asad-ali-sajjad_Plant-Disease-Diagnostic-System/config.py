"""
config.py — Master configuration file for FloraScan AI.
Alphabetical ImageFolder class mapping for 5-class model:
  0 -> Non Leaf (Not_Leaf)
  1 -> Tomato Bacterial Spot (Tomato_Bacterial_spot)
  2 -> Tomato Early Blight (Tomato_Early_blight)
  3 -> Tomato Late Blight (Tomato_Late_blight)
  4 -> Tomato Healthy (Tomato_healthy)
"""
from html import escape
from pathlib import Path

# ---------------------------------------------------------
# File Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent

# Support 5-class filename conventions from Drive / Colab
PATH_1 = BASE_DIR / "best_custom_cnn_5class.pth" if (BASE_DIR / "best_custom_cnn_5class.pth").exists() else BASE_DIR / "best_custom_cnn.pth"
PATH_2 = BASE_DIR / "best_resnet18_5class.pth" if (BASE_DIR / "best_resnet18_5class.pth").exists() else BASE_DIR / "best_resnet18.pth"
CSS_PATH = BASE_DIR / "styles.css"

# ---------------------------------------------------------
# Application Metadata
# ---------------------------------------------------------
APP_NAME = "FloraScan AI"
APP_TAGLINE = "Calm, instant leaf diagnostics — drop a photo and let the engines read it."
CROP_EMOJI = "🍅"

# ---------------------------------------------------------
# Engine Labels
# ---------------------------------------------------------
ENGINE_1_LABEL = "Primary Engine (CNN)"
ENGINE_2_LABEL = "Secondary Engine (ResNet)"
DUAL_LABEL = "Dual Benchmark Mode"
ENGINE_1_SHORT = "Custom CNN"
ENGINE_2_SHORT = "ResNet18"

# ---------------------------------------------------------
# Model Hyperparameters & Target Normalization
# ---------------------------------------------------------
CONFIDENCE_THRESHOLD = 65.0
INPUT_SIZE = 224
NORM_MEAN = [0.485, 0.456, 0.406]
NORM_STD = [0.229, 0.224, 0.225]

# EXACT ALPHABETICAL ORDER CREATED BY PYTORCH ImageFolder:
CLASS_NAMES = [
    "Non Leaf",                # Index 0 (Not_Leaf)
    "Tomato Bacterial Spot",   # Index 1 (Tomato_Bacterial_spot)
    "Tomato Early Blight",     # Index 2 (Tomato_Early_blight)
    "Tomato Late Blight",      # Index 3 (Tomato_Late_blight)
    "Tomato Healthy"           # Index 4 (Tomato_healthy)
]
NUM_CLASSES = len(CLASS_NAMES)

# ---------------------------------------------------------
# Diagnostic Knowledge Base
# ---------------------------------------------------------
DIAGNOSTIC_GUIDE = {
    "Non Leaf": {
        "description": "The uploaded image does not appear to contain a plant leaf (detected noise, background object, or non-foliar pattern).",
        "action": "Please upload a clear, focused photo of a plant leaf for accurate pathology analysis.",
    },
    "Tomato Bacterial Spot": {
        "description": "Triggered by Xanthomonas bacteria. Symptoms include small, water-soaked dark spots on foliage that quickly enlarge and yellow surrounding tissue.",
        "action": "Avoid overhead irrigation, apply copper-based bactericides early, and discard infected foliage to prevent spores spreading via water splash.",
    },
    "Tomato Early Blight": {
        "description": "Fungal infection caused by Alternaria solani. Characterized by distinct concentric target-like rings on mature leaf surfaces.",
        "action": "Ensure adequate plant spacing for airflow, stake foliage off soil, and treat proactively with suitable organic or chemical fungicides.",
    },
    "Tomato Late Blight": {
        "description": "Devastating water-mold infection caused by Phytophthora infestans. Causes rapidly spreading grayish-green dark foliage decay in cool, wet environments.",
        "action": "Immediately prune and dispose of infected leaves. Maintain low ambient humidity in greenhouses and apply preventive systemic fungicides.",
    },
    "Tomato Healthy": {
        "description": "Foliage exhibits rich chlorophyll saturation, standard vascular structure, and no signs of bacterial or fungal pathogen colonization.",
        "action": "Maintain optimal irrigation cycles, routine nitrogen balance, and continue periodic pest monitoring.",
    },
}

# ---------------------------------------------------------
# UI Card Formatting Metadata
# ---------------------------------------------------------
UI_META = {
    "Non Leaf": {
        "icon": "📷",
        "tone": "#64748b",
        "bg": "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
        "kind": "Invalid Input",
        "severity": "N/A",
        "signs": ["No leaf detected", "Background object / noise"],
        "desc_html": "The uploaded image does not contain a recognizable plant leaf subject.",
    },
    "Tomato Bacterial Spot": {
        "icon": "🦠",
        "tone": "#f59e0b",
        "bg": "linear-gradient(135deg,#fffbeb,#fef3c7)",
        "kind": "Bacterial",
        "severity": "Moderate",
        "signs": ["Water-soaked spots", "Yellow halos", "Rough leaf texture"],
        "desc_html": "Triggered by <em>Xanthomonas</em> bacteria. Dark spots surrounded by progressive yellow halos.",
    },
    "Tomato Early Blight": {
        "icon": "🎯",
        "tone": "#f97316",
        "bg": "linear-gradient(135deg,#fff7ed,#ffedd5)",
        "kind": "Fungal",
        "severity": "Moderate",
        "signs": ["Concentric target rings", "Older leaves affected first", "Progressive yellowing"],
        "desc_html": "Fungal infection caused by <em>Alternaria solani</em>. Distinct concentric target rings on mature foliage.",
    },
    "Tomato Late Blight": {
        "icon": "🌧️",
        "tone": "#ef4444",
        "bg": "linear-gradient(135deg,#fef2f2,#fee2e2)",
        "kind": "Water mold",
        "severity": "High",
        "signs": ["Grayish-green lesions", "Rapid tissue decay", "Cool/wet moisture dependence"],
        "desc_html": "Devastating water mold caused by <em>Phytophthora infestans</em> with rapid leaf tissue collapse.",
    },
    "Tomato Healthy": {
        "icon": "🌱",
        "tone": "#10b981",
        "bg": "linear-gradient(135deg,#ecfdf5,#d1fae5)",
        "kind": "Healthy",
        "severity": "None",
        "signs": ["Rich green coloration", "Intact leaf margins", "No visible lesions"],
        "desc_html": "Optimal chlorophyll saturation, healthy vascular network, and clear margins.",
    },
}

DEFAULT_META = {
    "icon": "🍃",
    "tone": "#0d9488",
    "bg": "linear-gradient(135deg,#f0fdfa,#ccfbf1)",
    "kind": "Condition",
    "severity": "Unknown",
    "signs": [],
    "desc_html": "",
}
UNKNOWN_TONE = "#f59e0b"


def get_guide(name: str) -> dict:
    return DIAGNOSTIC_GUIDE.get(name, {
        "description": "No description added yet for this class.",
        "action": "Consult an agronomist for guidance.",
    })


def get_meta(name: str) -> dict:
    meta = {**DEFAULT_META, **UI_META.get(name, {})}
    if not meta.get("desc_html"):
        meta["desc_html"] = escape(get_guide(name)["description"])
    return meta