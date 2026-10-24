"""
Central configuration for the Smart Footfall Counter & Restricted Zone Monitor.

Edit the defaults here, or override everything via CLI flags in main.py
(run `python main.py --help` to see all options).
"""

# --- Video source -------------------------------------------------------
# 0 for default webcam, an integer for another USB camera index,
# a file path for an MP4, or an rtsp:// URL for an IP camera.
VIDEO_SOURCE = 0

# --- Model ---------------------------------------------------------------
MODEL_WEIGHTS = "yolov8n.pt"     # nano model: fastest, good for >=30 FPS
CONFIDENCE_THRESHOLD = 0.35
TRACKER_CONFIG = "bytetrack.yaml"  # ships with ultralytics
PERSON_CLASS_ID = 0               # COCO class 0 == 'person'

# --- Tripwire (footfall counting line) -----------------------------------
# Two points (x1, y1) and (x2, y2) in pixel coordinates of the source frame.
# Leave as None to draw it interactively at startup instead.
TRIPWIRE_LINE = None   # e.g. ((100, 400), (900, 400))

# --- Restricted zone polygon (geofence) -----------------------------------
# List of (x, y) vertices. Leave as None to draw it interactively at startup.
RESTRICTED_ZONE_POLYGON = None   # e.g. [(600, 100), (900, 100), (900, 400), (600, 400)]
RESTRICTED_ZONE_NAME = "Server Room"

# --- Output ----------------------------------------------------------------
CSV_LOG_PATH = "telemetry_log.csv"

# --- Display ----------------------------------------------------------------
WINDOW_NAME = "Smart Footfall Counter & Restricted Zone Monitor"
SHOW_TRAJECTORY_TRAILS = True
TRAIL_LENGTH = 30  # number of past points kept per subject for the trail
