"""
Smart Footfall Counter & Restricted Zone Monitor
--------------------------------------------------
Real-time edge-deployable computer vision system combining YOLOv8 object
detection with ByteTrack multi-object tracking to deliver:
  1. Unlimited bidirectional tripwires
  2. Unlimited restricted-zone intrusion detection (point-in-polygon)
  3. Structured CSV telemetry logging
  4. Live annotated video UI, fullscreen by default
  5. Phone remote viewer + remote control (reset, pause, snapshot,
     add tripwire/zone, close app)

Usage:
    python main.py                              # use config.py defaults
    python main.py --source 0                   # webcam
    python main.py --source path/to/video.mp4   # video file
    python main.py --source rtsp://ip:port/...  # IP camera

Desktop controls while running:
    q  - quit
    f  - toggle fullscreen
    During initial setup only:
      t   - switch to tripwire mode (click pairs of points freely to add
            as many tripwires as you like - stays in this mode)
      z   - switch to zone mode (click 3+ points, ENTER to add that zone -
            stays in this mode so you can keep adding more zones)
      u   - undo the last added tripwire/zone
      n / ENTER (with nothing pending) - done with setup, start monitoring
"""

import argparse
import csv
import os
import threading
import time
from collections import defaultdict, deque

import cv2
import numpy as np
from flask import Flask, Response, jsonify, request, send_file
from ultralytics import YOLO

import config
from utils.geometry import (
    cross_product_side,
    crossing_direction,
    point_in_polygon_ray_casting,
    bottom_center_anchor,
)
from utils.csv_logger import CSVTelemetryLogger


# ---------------------------------------------------------------------------
# Phone / remote-viewer live stream + remote control (Flask, background thread)
# ---------------------------------------------------------------------------
STREAM_PORT = 8000
SNAPSHOT_DIR = "snapshots"
csv_path_global = None  # set in main(); used by phone history/download routes

stream_lock = threading.Lock()
latest_jpeg = None  # most recent annotated frame, JPEG-encoded bytes

stats_lock = threading.Lock()
live_stats = {
    "fps": 0.0, "active_intrusions": 0, "paused": False,
    "tripwires": [], "zones": [],
    "occupancy": 0, "occupancy_limit": 0,
}

control_lock = threading.Lock()
control_state = {
    "reset_counts": False,
    "snapshot": False,
    "paused": False,
    "shutdown_requested": False,
    "add_start": None,       # None | "tripwire" | "zone"
    "add_active": False,
    "add_kind": None,        # "tripwire" | "zone"
    "add_points": [],        # list of [x, y]
    "add_finish": None,      # None | "finish" | "cancel"
    "undo_geometry": False,  # undo last pending point, or last completed zone/tripwire
    "occupancy_limit": 0,    # 0 = no limit
}

flask_app = Flask(__name__)


def make_fullscreen(window_name):
    """
    Create (or reuse) the desktop OpenCV window and force it to fullscreen.
    Must be called again after any cv2.destroyWindow() on this window name,
    since OpenCV does not preserve window properties across recreation.
    """
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)


# ---------------------------------------------------------------------------
# Phone dashboard page
# ---------------------------------------------------------------------------
@flask_app.route("/")
def index():
    return """
    <html>
      <head>
        <title>Smart Footfall Monitor - Live</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          :root {
            --bg:#0d0d0f; --card:#1a1a1e; --card-2:#141417; --accent:#2f5496;
            --accent-2:#3d6ab8; --danger:#d32f2f; --danger-2:#a13030; --ok:#2e7d32;
            --text:#eee; --text-dim:#9aa0a6; --radius:12px;
          }
          * { box-sizing:border-box; }
          body {
            background:var(--bg); margin:0; font-family:-apple-system,'Segoe UI',Roboto,sans-serif;
            color:var(--text); transition: background-color 0.2s; padding-bottom:24px;
          }
          body.breach-flash { animation: flash 0.6s ease-in-out infinite; }
          @keyframes flash {
            0%   { background-color:var(--bg); }
            50%  { background-color:#3a0000; }
            100% { background-color:var(--bg); }
          }
          header {
            position:sticky; top:0; z-index:10; background:var(--card-2);
            padding:12px 16px; display:flex; align-items:center; justify-content:space-between;
            border-bottom:1px solid #262626;
          }
          header h1 { font-size:15px; margin:0; font-weight:600; }
          #conn-dot {
            width:9px; height:9px; border-radius:50%; background:#666; display:inline-block;
            margin-right:6px; transition: background-color 0.3s;
          }
          #conn-dot.live { background:var(--ok); box-shadow:0 0 6px var(--ok); }
          #conn-dot.down { background:var(--danger); }
          #conn-label { font-size:11px; color:var(--text-dim); }

          .wrap { max-width:900px; margin:0 auto; padding:0 12px; }

          #alert-banner {
            display:none; background:var(--danger); color:#fff; font-weight:bold;
            font-size:15px; padding:10px; margin:12px 0; border-radius:var(--radius);
            text-align:center; letter-spacing:0.5px;
          }

          .stat-grid {
            display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin:12px 0;
          }
          .stat-card {
            background:var(--card); border-radius:var(--radius); padding:10px 6px;
            text-align:center;
          }
          .stat-card .val { font-size:20px; font-weight:700; }
          .stat-card .lbl { font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.5px; }
          .stat-card.breach { background:#3a0000; }
          .stat-card.breach .val { color:#ff6b6b; }

          .video-card {
            background:var(--card); border-radius:var(--radius); overflow:hidden;
            border:2px solid #262626; transition: border-color 0.2s;
          }
          .video-card.breach { border-color:var(--danger); }
          .video-card img { width:100%; display:block; touch-action:manipulation; }
          #video-status { padding:6px 10px; font-size:11px; color:var(--text-dim); }

          #geom-list { font-size:12px; color:var(--text-dim); padding:8px 10px; }
          #geom-list div { padding:2px 0; }

          .section-title {
            font-size:12px; color:var(--text-dim); text-transform:uppercase;
            letter-spacing:0.5px; margin:16px 0 6px 2px;
          }
          .btn-row { display:flex; flex-wrap:wrap; gap:8px; }
          button {
            background:var(--accent); color:#fff; border:none; padding:11px 14px;
            font-size:13px; border-radius:8px; cursor:pointer; flex:1 1 auto; min-width:120px;
          }
          button:active { background:var(--accent-2); }
          button.danger { background:var(--danger-2); }
          button.secondary { background:#333; }
          button:disabled { opacity:0.5; }

          #add-geom-controls {
            display:none; background:var(--card); margin-top:10px;
            padding:10px; border-radius:var(--radius); color:#ddd; font-size:13px;
          }
          #add-geom-hint { margin:0 0 10px; color:var(--text-dim); font-size:12px; }
        </style>
      </head>
      <body>
        <header>
          <h1>Smart Footfall Monitor</h1>
          <div><span id="conn-dot"></span><span id="conn-label">Connecting</span></div>
        </header>

        <div class="wrap">
          <div id="alert-banner">!!! RESTRICTED ZONE BREACH !!!</div>

          <div class="stat-grid">
            <div class="stat-card"><div class="val" id="s-fps">-</div><div class="lbl">FPS</div></div>
            <div class="stat-card" id="s-breach-card"><div class="val" id="s-breach">-</div><div class="lbl">Breaches</div></div>
            <div class="stat-card"><div class="val" id="s-tw">-</div><div class="lbl">Tripwires</div></div>
            <div class="stat-card"><div class="val" id="s-zn">-</div><div class="lbl">Zones</div></div>
          </div>

          <div class="video-card" id="video-card">
            <img id="video-img" src="/video_feed">
            <div id="video-status">Live</div>
            <div id="geom-list"></div>
          </div>

          <div class="section-title">Alerts</div>
          <div class="btn-row">
            <button id="btn-sound">Tap to Enable Sound</button>
          </div>

          <div class="section-title">Session</div>
          <div class="btn-row">
            <button id="btn-reset" class="secondary">Reset Counts</button>
            <button id="btn-snapshot" class="secondary">Take Snapshot</button>
            <button id="btn-pause">Pause</button>
          </div>

          <div class="section-title">Geometry</div>
          <div class="btn-row">
            <button id="btn-add-tripwire" class="secondary">Add Tripwire</button>
            <button id="btn-add-zone" class="secondary">Add Zone</button>
            <button id="btn-undo" class="secondary">Undo</button>
          </div>
          <div id="add-geom-controls">
            <p id="add-geom-hint">...</p>
            <div class="btn-row">
              <button id="btn-add-finish">Finish</button>
              <button id="btn-add-cancel" class="danger">Cancel</button>
            </div>
          </div>

          <div class="section-title">Occupancy</div>
          <div class="btn-row">
            <div id="occ-text" style="flex:1 1 100%;font-size:14px;color:#ddd;padding:4px 2px;">-</div>
            <input id="occ-limit" type="number" min="0" placeholder="Limit (0 = off)"
                   style="flex:1 1 55%;padding:10px;border-radius:8px;border:none;background:#222;color:#eee;font-size:14px;">
            <button id="btn-occ-set" class="secondary">Set Limit</button>
          </div>

          <div class="section-title">History (last 10 events)</div>
          <div class="btn-row">
            <button id="btn-history" class="secondary">Refresh History</button>
          </div>
          <div id="history-list" style="font-size:12px;color:#ccc;padding:6px 2px;"></div>

          <div class="section-title">Downloads</div>
          <div class="btn-row">
            <a href="/download/csv" style="flex:1 1 auto;"><button class="secondary" style="width:100%;">Download CSV</button></a>
            <a href="/download/snapshot" style="flex:1 1 auto;"><button class="secondary" style="width:100%;">Latest Snapshot</button></a>
          </div>

          <div class="section-title">App</div>
          <div class="btn-row">
            <button id="btn-close-app" class="danger">Close App</button>
          </div>
        </div>

        <script>
          let audioCtx = null;
          let wasBreached = false;
          let beepTimer = null;
          let addMode = null;       // null | 'tripwire' | 'zone'
          let isPaused = false;
          let connFailCount = 0;

          // ---- Sound alert setup ----
          document.getElementById('btn-sound').addEventListener('click', function () {
            if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
            if (audioCtx.state === 'suspended') { audioCtx.resume(); }
            this.textContent = 'Sound Alerts Enabled';
            this.disabled = true;
          });

          function beep() {
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = 880;
            gain.gain.value = 0.25;
            osc.connect(gain).connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);
          }

          // ---- Session controls ----
          document.getElementById('btn-reset').addEventListener('click', () => {
            fetch('/control/reset', { method: 'POST' });
          });
          document.getElementById('btn-pause').addEventListener('click', function () {
            fetch('/control/' + (isPaused ? 'resume' : 'pause'), { method: 'POST' });
          });
          document.getElementById('btn-snapshot').addEventListener('click', () => {
            fetch('/control/snapshot', { method: 'POST' })
              .then(r => r.json()).then(d => { alert(d.message || 'Snapshot requested'); });
          });

          // ---- Close app ----
          document.getElementById('btn-close-app').addEventListener('click', () => {
            if (confirm('Close the desktop app? This ends the monitoring session.')) {
              fetch('/control/shutdown', { method: 'POST' })
                .then(() => { alert('Shutdown requested. The desktop app will close shortly.'); });
            }
          });

          // ---- Add-geometry flow ----
          function startAdd(kind) {
            fetch('/control/geom/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ kind: kind })
            }).then(() => {
              document.getElementById('add-geom-controls').style.display = 'block';
              document.getElementById('add-geom-hint').textContent = 'Preparing... please wait.';
              waitForAddReady(0, kind);
            });
          }
          function waitForAddReady(attempt, kind) {
            fetch('/stats').then(r => r.json()).then(d => {
              if (d.add_active) {
                addMode = kind;
                const need = kind === 'tripwire' ? '2 taps' : '3+ taps, then Finish';
                document.getElementById('add-geom-hint').textContent =
                  'Ready! Tap the video: ' + need + '.';
              } else if (attempt < 15) {
                setTimeout(() => waitForAddReady(attempt + 1, kind), 200);
              } else {
                document.getElementById('add-geom-hint').textContent = 'Desktop did not respond. Try again.';
              }
            });
          }
          document.getElementById('btn-add-tripwire').addEventListener('click', () => startAdd('tripwire'));
          document.getElementById('btn-add-zone').addEventListener('click', () => startAdd('zone'));

          document.getElementById('btn-add-finish').addEventListener('click', () => {
            fetch('/control/geom/finish', { method: 'POST' }).then(r => r.json()).then(d => {
              if (!d.ok) { alert(d.message); return; }
              addMode = null;
              document.getElementById('add-geom-controls').style.display = 'none';
            });
          });
          document.getElementById('btn-add-cancel').addEventListener('click', () => {
            fetch('/control/geom/cancel', { method: 'POST' }).then(() => {
              addMode = null;
              document.getElementById('add-geom-controls').style.display = 'none';
            });
          });

          document.getElementById('btn-undo').addEventListener('click', () => {
            fetch('/control/geom/undo', { method: 'POST' });
          });

          // ---- Tap-to-place points on the video while adding geometry ----
          const img = document.getElementById('video-img');
          img.addEventListener('click', function (e) {
            if (!addMode) return;
            const rect = img.getBoundingClientRect();
            const scaleX = img.naturalWidth / rect.width;
            const scaleY = img.naturalHeight / rect.height;
            const x = Math.round((e.clientX - rect.left) * scaleX);
            const y = Math.round((e.clientY - rect.top) * scaleY);
            fetch('/control/geom/point', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ x: x, y: y })
            });
          });

          // ---- Auto-reconnect the video stream if the connection drops ----
          img.addEventListener('error', function () {
            document.getElementById('video-status').textContent = 'Reconnecting...';
            setTimeout(() => { img.src = '/video_feed?_=' + Date.now(); }, 1500);
          });
          img.addEventListener('load', function () {
            document.getElementById('video-status').textContent = 'Live';
          });

          // ---- Occupancy limit ----
          document.getElementById('btn-occ-set').addEventListener('click', () => {
            const v = parseInt(document.getElementById('occ-limit').value || '0', 10);
            fetch('/control/occupancy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ limit: v })
            }).then(r => r.json()).then(d => { if (!d.ok) { alert(d.message); } });
          });

          // ---- History ----
          function loadHistory() {
            fetch('/history').then(r => r.json()).then(d => {
              const el = document.getElementById('history-list');
              if (!d.rows.length) { el.textContent = 'No events yet.'; return; }
              el.innerHTML = d.rows.map(r =>
                `<div>${(r.timestamp || '').slice(11, 19)}  ${r.event_type}  #${r.track_id}  ${r.detail || ''}  ${r.geometry_name || ''}</div>`
              ).join('');
            });
          }
          document.getElementById('btn-history').addEventListener('click', loadHistory);

          // ---- Live stats polling ----
          async function pollStats() {
            try {
              const res = await fetch('/stats');
              const data = await res.json();
              connFailCount = 0;
              document.getElementById('conn-dot').className = 'live';

              const breached = data.active_intrusions > 0;
              const banner = document.getElementById('alert-banner');
              const body = document.body;
              const videoCard = document.getElementById('video-card');
              const breachCard = document.getElementById('s-breach-card');
              if (breached) {
                banner.style.display = 'block';
                body.classList.add('breach-flash');
                videoCard.classList.add('breach');
                breachCard.classList.add('breach');
                if (!wasBreached) { beep(); beepTimer = setInterval(beep, 2000); }
              } else {
                banner.style.display = 'none';
                body.classList.remove('breach-flash');
                videoCard.classList.remove('breach');
                breachCard.classList.remove('breach');
                if (beepTimer) { clearInterval(beepTimer); beepTimer = null; }
              }
              wasBreached = breached;

              isPaused = data.paused;
              document.getElementById('btn-pause').textContent = isPaused ? 'Resume' : 'Pause';
              document.getElementById('conn-label').textContent =
                data.paused ? 'Paused' : (breached ? 'Breach!' : 'Live');

              document.getElementById('s-fps').textContent = data.fps;
              document.getElementById('s-breach').textContent = data.active_intrusions;
              document.getElementById('s-tw').textContent = data.tripwires.length;
              document.getElementById('s-zn').textContent = data.zones.length;
              document.getElementById('occ-text').textContent =
                'Occupancy: ' + data.occupancy +
                (data.occupancy_limit ? ' / limit ' + data.occupancy_limit : ' (no limit set)') +
                (data.occupancy_limit && data.occupancy > data.occupancy_limit ? '  OVER LIMIT' : '');

              let html = '';
              data.tripwires.forEach(tw => {
                html += `<div>${tw.name}: IN ${tw.count_in} / OUT ${tw.count_out}</div>`;
              });
              data.zones.forEach(z => {
                html += `<div>${z.name}: ${z.active ? 'BREACH' : 'clear'}</div>`;
              });
              document.getElementById('geom-list').innerHTML = html;
            } catch (e) {
              connFailCount++;
              if (connFailCount >= 2) {
                document.getElementById('conn-dot').className = 'down';
                document.getElementById('conn-label').textContent = 'Disconnected';
              }
            }
            setTimeout(pollStats, 800);
          }

          pollStats();
          loadHistory();
        </script>
      </body>
    </html>
    """


def _mjpeg_generator():
    while True:
        with stream_lock:
            frame_bytes = latest_jpeg
        if frame_bytes is not None:
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n")
        time.sleep(0.03)


@flask_app.route("/video_feed")
def video_feed():
    return Response(_mjpeg_generator(),
                     mimetype="multipart/x-mixed-replace; boundary=frame")


@flask_app.route("/stats")
def stats():
    with stats_lock:
        result = dict(live_stats)
    with control_lock:
        result["add_active"] = control_state["add_active"]
    return jsonify(result)


@flask_app.route("/control/reset", methods=["POST"])
def control_reset():
    with control_lock:
        control_state["reset_counts"] = True
    return jsonify({"ok": True, "message": "Reset requested"})


@flask_app.route("/control/pause", methods=["POST"])
def control_pause():
    with control_lock:
        control_state["paused"] = True
    return jsonify({"ok": True, "paused": True})


@flask_app.route("/control/resume", methods=["POST"])
def control_resume():
    with control_lock:
        control_state["paused"] = False
    return jsonify({"ok": True, "paused": False})


@flask_app.route("/control/snapshot", methods=["POST"])
def control_snapshot():
    with control_lock:
        control_state["snapshot"] = True
    return jsonify({"ok": True, "message": "Snapshot requested"})


@flask_app.route("/control/shutdown", methods=["POST"])
def control_shutdown():
    with control_lock:
        control_state["shutdown_requested"] = True
    return jsonify({"ok": True, "message": "Shutdown requested"})


@flask_app.route("/control/geom/start", methods=["POST"])
def control_geom_start():
    data = request.get_json(force=True, silent=True) or {}
    kind = data.get("kind")
    if kind not in ("tripwire", "zone"):
        return jsonify({"ok": False, "message": "kind must be 'tripwire' or 'zone'"}), 400
    with control_lock:
        control_state["add_start"] = kind
        control_state["add_points"] = []
        control_state["add_finish"] = None
    return jsonify({"ok": True})


@flask_app.route("/control/geom/point", methods=["POST"])
def control_geom_point():
    data = request.get_json(force=True, silent=True) or {}
    try:
        x = int(data.get("x", 0))
        y = int(data.get("y", 0))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "message": "Invalid point"}), 400
    with control_lock:
        if not control_state["add_active"]:
            return jsonify({"ok": False, "message": "Not currently adding geometry"}), 400
        control_state["add_points"].append([x, y])
        kind = control_state["add_kind"]
        n = len(control_state["add_points"])
        if kind == "tripwire" and n >= 2:
            control_state["add_finish"] = "finish"
    return jsonify({"ok": True, "points_count": n})


@flask_app.route("/control/geom/finish", methods=["POST"])
def control_geom_finish():
    with control_lock:
        if not control_state["add_active"]:
            return jsonify({"ok": False, "message": "Not currently adding geometry"}), 400
        kind = control_state["add_kind"]
        n = len(control_state["add_points"])
        min_needed = 2 if kind == "tripwire" else 3
        if n < min_needed:
            return jsonify({"ok": False,
                             "message": f"Need at least {min_needed} points for a {kind}"}), 400
        control_state["add_finish"] = "finish"
    return jsonify({"ok": True})


@flask_app.route("/control/geom/undo", methods=["POST"])
def control_geom_undo():
    with control_lock:
        control_state["undo_geometry"] = True
    return jsonify({"ok": True, "message": "Undo requested"})


@flask_app.route("/control/geom/cancel", methods=["POST"])
def control_geom_cancel():
    with control_lock:
        control_state["add_finish"] = "cancel"
    return jsonify({"ok": True})


@flask_app.route("/control/occupancy", methods=["POST"])
def control_occupancy():
    data = request.get_json(force=True, silent=True) or {}
    try:
        limit = int(data.get("limit", 0))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "message": "Limit must be a whole number"}), 400
    if limit < 0:
        return jsonify({"ok": False, "message": "Limit must be 0 or more (0 = no limit)"}), 400
    with control_lock:
        control_state["occupancy_limit"] = limit
    return jsonify({"ok": True, "limit": limit})


@flask_app.route("/history")
def history():
    rows = []
    if csv_path_global and os.path.exists(csv_path_global):
        with open(csv_path_global, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
    return jsonify({"rows": rows[-10:][::-1]})


@flask_app.route("/download/csv")
def download_csv():
    if csv_path_global and os.path.exists(csv_path_global):
        return send_file(os.path.abspath(csv_path_global), as_attachment=True)
    return jsonify({"ok": False, "message": "No CSV file yet"}), 404


@flask_app.route("/download/snapshot")
def download_snapshot():
    if not os.path.isdir(SNAPSHOT_DIR):
        return jsonify({"ok": False, "message": "No snapshots yet"}), 404
    files = sorted(f for f in os.listdir(SNAPSHOT_DIR) if f.endswith(".jpg"))
    if not files:
        return jsonify({"ok": False, "message": "No snapshots yet"}), 404
    return send_file(os.path.abspath(os.path.join(SNAPSHOT_DIR, files[-1])), as_attachment=True)


def start_stream_server():
    global STREAM_PORT
    port = STREAM_PORT
    for attempt in range(5):
        try:
            flask_app.run(host="0.0.0.0", port=port, threaded=True,
                          debug=False, use_reloader=False)
            return
        except OSError as e:
            print(f"[WARN] Could not bind phone-stream server to port {port} ({e}); "
                  f"trying port {port + 1}...")
            port += 1
            STREAM_PORT = port
    print("[ERROR] Could not start the phone stream server on any port tried. "
          "Phone viewing/control will be unavailable this session.")


# ---------------------------------------------------------------------------
# Interactive multi-geometry setup (desktop)
# ---------------------------------------------------------------------------
class MultiGeometrySetup:
    """
    Lets the operator add an unlimited number of tripwires and restricted
    zones before monitoring begins.

    Keys:
      t         - switch to tripwire mode; click pairs of points freely to
                  add as many tripwires as you like (stays in this mode)
      z         - switch to zone mode; click 3+ points, ENTER adds that zone
                  and keeps you in zone mode for the next one
      u         - undo the most recently added tripwire/zone
      n / ENTER - done, start monitoring (only when nothing is pending)
      ESC       - finish immediately (keeps whatever was added so far)
    """

    def __init__(self, frame):
        self.base_frame = frame.copy()
        self.tripwires = []   # list of ((x1,y1),(x2,y2))
        self.zones = []       # list of [(x,y), ...]
        self.mode = None      # None | "tripwire" | "zone"
        self.pending_points = []

    def _mouse_callback(self, event, x, y, flags, param):
        if event != cv2.EVENT_LBUTTONDOWN or self.mode is None:
            return
        self.pending_points.append((x, y))
        if self.mode == "tripwire" and len(self.pending_points) == 2:
            self.tripwires.append(tuple(self.pending_points))
            self.pending_points = []
            # Stay in tripwire mode so multiple tripwires can be added
            # back-to-back without pressing 't' again each time.

    def run(self, window_name):
        make_fullscreen(window_name)
        cv2.setMouseCallback(window_name, self._mouse_callback)

        print("\n--- Geometry setup ---")
        print("  t = tripwire mode (click pairs of points freely, add as many as you like)")
        print("  z = zone mode (click 3+ points, ENTER to add - stays in zone mode)")
        print("  u = undo last item    n / ENTER (nothing pending) = start monitoring")

        while True:
            display = self.base_frame.copy()

            for i, tw in enumerate(self.tripwires):
                cv2.circle(display, tw[0], 5, (0, 255, 255), -1)
                cv2.circle(display, tw[1], 5, (0, 255, 255), -1)
                cv2.line(display, tw[0], tw[1], (0, 255, 255), 2)
                cv2.putText(display, f"TW{i + 1}", tw[0], cv2.FONT_HERSHEY_SIMPLEX,
                            0.5, (0, 255, 255), 2)

            for i, z in enumerate(self.zones):
                pts = np.array(z, dtype=np.int32)
                cv2.polylines(display, [pts], isClosed=True, color=(0, 0, 255), thickness=2)
                cv2.putText(display, f"Z{i + 1}", z[0], cv2.FONT_HERSHEY_SIMPLEX,
                            0.5, (0, 0, 255), 2)

            if self.mode == "tripwire":
                for p in self.pending_points:
                    cv2.circle(display, p, 5, (0, 255, 255), -1)
            elif self.mode == "zone":
                for p in self.pending_points:
                    cv2.circle(display, p, 5, (0, 0, 255), -1)
                if len(self.pending_points) >= 2:
                    cv2.polylines(display, [np.array(self.pending_points)],
                                   isClosed=False, color=(0, 0, 255), thickness=2)

            status = (f"Tripwires: {len(self.tripwires)}  Zones: {len(self.zones)}  "
                      f"|  Mode: {self.mode or 'none'}")
            cv2.putText(display, status, (15, 25), cv2.FONT_HERSHEY_SIMPLEX,
                        0.55, (255, 255, 255), 2)
            cv2.putText(display, "t=tripwire mode  z=zone mode  u=undo  n/ENTER=start monitoring",
                        (15, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

            cv2.imshow(window_name, display)
            key = cv2.waitKey(20) & 0xFF

            if key == ord("t"):
                self.mode = "tripwire"
                self.pending_points = []
            elif key == ord("z"):
                self.mode = "zone"
                self.pending_points = []
            elif key == 13:  # ENTER
                if self.mode == "zone" and len(self.pending_points) >= 3:
                    self.zones.append(list(self.pending_points))
                    self.pending_points = []
                    # Stay in zone mode so multiple zones can be added
                    # back-to-back without pressing 'z' again each time.
                elif not self.pending_points:
                    # Nothing in progress - ENTER means "done, start monitoring"
                    break
                else:
                    print("Need at least 3 points for a zone.")
            elif key == ord("n") and not self.pending_points:
                break
            elif key == ord("u"):
                if self.pending_points:
                    self.pending_points = []
                elif self.zones:
                    self.zones.pop()
                elif self.tripwires:
                    self.tripwires.pop()
            elif key == 27:  # ESC
                break

        return self.tripwires, self.zones


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------
def main():
    global latest_jpeg, csv_path_global

    parser = argparse.ArgumentParser(description="Smart Footfall Counter & Restricted Zone Monitor")
    parser.add_argument("--source", default=None,
                         help="Video source: webcam index, file path, or RTSP URL")
    parser.add_argument("--weights", default=None, help="YOLOv8 weights path")
    parser.add_argument("--conf", type=float, default=None, help="Detection confidence threshold")
    parser.add_argument("--csv", default=None, help="CSV telemetry log output path")
    args = parser.parse_args()

    source = args.source if args.source is not None else config.VIDEO_SOURCE
    if isinstance(source, str) and source.isdigit():
        source = int(source)
    weights = args.weights or config.MODEL_WEIGHTS
    conf_thresh = args.conf if args.conf is not None else config.CONFIDENCE_THRESHOLD
    csv_path = args.csv or config.CSV_LOG_PATH
    csv_path_global = csv_path

    print(f"[INFO] Loading model: {weights}")
    model = YOLO(weights)

    print(f"[INFO] Opening video source: {source}")
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video source: {source}")

    ret, first_frame = cap.read()
    if not ret:
        raise RuntimeError("Could not read the first frame from the video source.")

    setup = MultiGeometrySetup(first_frame)
    tripwire_list, zone_list = setup.run(config.WINDOW_NAME)
    cv2.destroyWindow(config.WINDOW_NAME)

    next_tripwire_id = 1
    tripwires = []
    for pts in tripwire_list:
        tripwires.append({"id": next_tripwire_id, "points": pts,
                           "name": f"Tripwire {next_tripwire_id}",
                           "count_in": 0, "count_out": 0})
        next_tripwire_id += 1

    next_zone_id = 1
    zones = []
    for pts in zone_list:
        zones.append({"id": next_zone_id, "points": pts, "name": f"Zone {next_zone_id}"})
        next_zone_id += 1

    make_fullscreen(config.WINDOW_NAME)
    desktop_fullscreen = True

    logger = CSVTelemetryLogger(csv_path)

    server_thread = threading.Thread(target=start_stream_server, daemon=True)
    server_thread.start()
    time.sleep(0.3)  # let port-fallback logic settle before printing the URL
    print(f"[INFO] Live stream + remote control available on your network at: "
          f"http://<this-pc-local-ip>:{STREAM_PORT}  (see README for how to find your IP)")

    prev_side = {}                      # (tripwire_id, track_id) -> last signed side
    in_zone_state = defaultdict(bool)   # (zone_id, track_id) -> was inside last time seen?
    trails = defaultdict(lambda: deque(maxlen=config.TRAIL_LENGTH))

    prev_time = time.time()
    fps_display = 0.0
    breach_latencies_ms = []

    last_frame_for_pause = None
    pending_frame = first_frame
    occupancy = 0  # people currently inside: net IN-OUT at the first tripwire

    print("[INFO] Starting real-time monitoring. Press 'q' to quit, 'f' to toggle fullscreen.")

    while True:
        with control_lock:
            do_reset = control_state["reset_counts"]
            control_state["reset_counts"] = False
            do_snapshot = control_state["snapshot"]
            control_state["snapshot"] = False
            paused_now = control_state["paused"]
            do_shutdown = control_state["shutdown_requested"]
            do_undo = control_state["undo_geometry"]
            occ_limit = control_state["occupancy_limit"]
            control_state["undo_geometry"] = False

            add_start = control_state["add_start"]
            control_state["add_start"] = None
            if add_start and not control_state["add_active"]:
                control_state["add_active"] = True
                control_state["add_kind"] = add_start
            add_active = control_state["add_active"]
            add_kind = control_state["add_kind"]
            add_points_snapshot = [tuple(p) for p in control_state["add_points"]]
            add_finish_cmd = control_state["add_finish"]
            control_state["add_finish"] = None

        if do_shutdown:
            print("[INFO] Shutdown requested via phone remote control.")
            break

        if do_reset:
            for tw in tripwires:
                tw["count_in"] = 0
                tw["count_out"] = 0
            prev_side.clear()
            occupancy = 0
            print("[INFO] Counters reset via phone remote control.")

        if do_undo:
            if add_active:
                # Mid-add: remove the last tapped point only
                with control_lock:
                    if control_state["add_points"]:
                        control_state["add_points"].pop()
                        print("[INFO] Undo: removed last pending point (phone).")
            elif zones:
                removed = zones.pop()
                print(f"[INFO] Undo: removed {removed['name']} (phone).")
            elif tripwires:
                removed = tripwires.pop()
                print(f"[INFO] Undo: removed {removed['name']} (phone).")

        # --- Add-geometry mode (from phone): freeze frame, collect taps ----
        if add_active:
            base = last_frame_for_pause if last_frame_for_pause is not None else first_frame
            display = base.copy()
            pts = add_points_snapshot
            for p in pts:
                color = (0, 255, 255) if add_kind == "tripwire" else (0, 0, 255)
                cv2.circle(display, p, 6, color, -1)
            if add_kind == "tripwire" and len(pts) == 2:
                cv2.line(display, pts[0], pts[1], (0, 255, 255), 2)
            elif add_kind == "zone" and len(pts) > 1:
                cv2.polylines(display, [np.array(pts)], isClosed=False,
                              color=(0, 0, 255), thickness=2)
            cv2.putText(display, f"ADDING {add_kind.upper()} (from phone) - {len(pts)} pt(s)",
                        (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            cv2.imshow(config.WINDOW_NAME, display)
            ok, jpeg_buf = cv2.imencode(".jpg", display, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if ok:
                with stream_lock:
                    latest_jpeg = jpeg_buf.tobytes()
            with stats_lock:
                live_stats["paused"] = paused_now

            key = cv2.waitKey(50) & 0xFF
            if key == ord("q"):
                break

            if add_finish_cmd == "finish":
                if add_kind == "tripwire" and len(pts) >= 2:
                    tripwires.append({"id": next_tripwire_id, "points": pts[:2],
                                       "name": f"Tripwire {next_tripwire_id}",
                                       "count_in": 0, "count_out": 0})
                    next_tripwire_id += 1
                    print(f"[INFO] Tripwire added via phone: {pts[:2]}")
                elif add_kind == "zone" and len(pts) >= 3:
                    zones.append({"id": next_zone_id, "points": pts,
                                   "name": f"Zone {next_zone_id}"})
                    next_zone_id += 1
                    print(f"[INFO] Zone added via phone: {len(pts)} points")
                with control_lock:
                    control_state["add_active"] = False
                    control_state["add_points"] = []
            elif add_finish_cmd == "cancel":
                with control_lock:
                    control_state["add_active"] = False
                    control_state["add_points"] = []

            continue

        # --- Paused mode ----------------------------------------------------
        if paused_now:
            if last_frame_for_pause is not None:
                paused_frame = last_frame_for_pause.copy()
                cv2.putText(paused_frame, "PAUSED (resume from phone)", (10, 110),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
                cv2.imshow(config.WINDOW_NAME, paused_frame)
                ok, jpeg_buf = cv2.imencode(".jpg", paused_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if ok:
                    with stream_lock:
                        latest_jpeg = jpeg_buf.tobytes()
            with stats_lock:
                live_stats["paused"] = True

            key = cv2.waitKey(50) & 0xFF
            if key == ord("q"):
                break
            continue

        # --- Normal frame processing -----------------------------------------
        frame_start = time.time()

        if pending_frame is not None:
            frame = pending_frame
            pending_frame = None
        else:
            ret, frame = cap.read()
            if not ret:
                print("[WARN] Frame read failed; retrying...")
                for _ in range(5):
                    time.sleep(0.15)
                    ret, frame = cap.read()
                    if ret:
                        break
            if not ret:
                print("[WARN] Camera did not recover; attempting to reopen the video source...")
                cap.release()
                time.sleep(0.5)
                cap = cv2.VideoCapture(source)
                if not cap.isOpened():
                    print("[ERROR] Could not reopen the video source. Ending session.")
                    break
                print("[INFO] Video source reopened successfully.")
                continue

        try:
            results = model.track(
                frame, persist=True, classes=[config.PERSON_CLASS_ID],
                conf=conf_thresh, tracker=config.TRACKER_CONFIG, verbose=False,
            )
            boxes = results[0].boxes
        except Exception as e:
            print(f"[WARN] Detection/tracking failed on this frame: {e}")
            boxes = None

        annotated = frame.copy()

        for tw in tripwires:
            (x1, y1), (x2, y2) = tw["points"]
            cv2.line(annotated, (x1, y1), (x2, y2), (0, 255, 255), 2)
            cv2.putText(annotated, tw["name"], (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)

        for z in zones:
            pts_arr = np.array(z["points"], dtype=np.int32)
            cv2.polylines(annotated, [pts_arr], isClosed=True, color=(0, 0, 255), thickness=2)
            overlay = annotated.copy()
            cv2.fillPoly(overlay, [pts_arr], (0, 0, 255))
            annotated = cv2.addWeighted(overlay, 0.15, annotated, 0.85, 0)
            cv2.putText(annotated, z["name"], tuple(z["points"][0]),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        current_zone_ids = {z["id"]: set() for z in zones}
        seen_track_ids = set()

        if boxes is not None and boxes.id is not None:
            xyxy = boxes.xyxy.cpu().numpy()
            ids = boxes.id.cpu().numpy().astype(int)
            confs = boxes.conf.cpu().numpy()

            for box, track_id, sc in zip(xyxy, ids, confs):
                seen_track_ids.add(int(track_id))
                x1, y1, x2, y2 = box
                anchor = bottom_center_anchor((x1, y1, x2, y2))
                trails[track_id].append((int(anchor[0]), int(anchor[1])))

                for tw in tripwires:
                    (lx1, ly1), (lx2, ly2) = tw["points"]
                    side = cross_product_side(anchor[0], anchor[1], lx1, ly1, lx2, ly2)
                    key = (tw["id"], track_id)
                    if key in prev_side:
                        direction = crossing_direction(prev_side[key], side)
                        if direction == "IN":
                            tw["count_in"] += 1
                            logger.log_crossing(track_id, "IN", tw["name"])
                            if tripwires and tw is tripwires[0]:
                                occupancy += 1
                        elif direction == "OUT":
                            tw["count_out"] += 1
                            logger.log_crossing(track_id, "OUT", tw["name"])
                            if tripwires and tw is tripwires[0]:
                                occupancy = max(0, occupancy - 1)
                    prev_side[key] = side

                zone_alert = False
                for z in zones:
                    inside = point_in_polygon_ray_casting(anchor, z["points"])
                    key = (z["id"], track_id)
                    if inside and not in_zone_state[key]:
                        logger.log_intrusion(track_id, z["name"])
                        zone_alert = True
                        latency_ms = (time.time() - frame_start) * 1000.0
                        breach_latencies_ms.append(latency_ms)
                    in_zone_state[key] = inside
                    zone_alert = zone_alert or inside
                    if inside:
                        current_zone_ids[z["id"]].add(track_id)

                color = (0, 0, 255) if zone_alert else (0, 200, 0)
                cv2.rectangle(annotated, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                cv2.putText(annotated, f"ID {track_id} {sc:.2f}", (int(x1), int(y1) - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

                if config.SHOW_TRAJECTORY_TRAILS:
                    trail_pts = list(trails[track_id])
                    for i in range(1, len(trail_pts)):
                        cv2.line(annotated, trail_pts[i - 1], trail_pts[i], color, 1)

        # Stale-state cleanup: any (zone_id, track_id) not seen this frame
        # can no longer be "inside" - prevents the breach counter sticking.
        for key in list(in_zone_state.keys()):
            zid, tid = key
            if tid not in seen_track_ids:
                in_zone_state[key] = False

        now = time.time()
        instant_fps = 1.0 / max(now - prev_time, 1e-6)
        fps_display = 0.9 * fps_display + 0.1 * instant_fps if fps_display else instant_fps
        prev_time = now

        total_active = sum(len(v) for v in current_zone_ids.values())

        panel_h = min(40 + 20 * (len(tripwires) + 1), 220)
        cv2.rectangle(annotated, (0, 0), (340, panel_h), (20, 20, 20), -1)
        cv2.putText(annotated, f"FPS: {fps_display:.1f}", (10, 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
        y_off = 44
        for tw in tripwires[:8]:
            cv2.putText(annotated, f"{tw['name']}: IN {tw['count_in']} OUT {tw['count_out']}",
                        (10, y_off), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)
            y_off += 18

        if total_active:
            cv2.putText(annotated, "!!! RESTRICTED ZONE BREACH !!!",
                        (annotated.shape[1] // 2 - 220, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 3)

        if occ_limit and occupancy > occ_limit:
            cv2.putText(annotated, f"OCCUPANCY {occupancy} > LIMIT {occ_limit}",
                        (10, annotated.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 3)

        if do_snapshot:
            os.makedirs(SNAPSHOT_DIR, exist_ok=True)
            fname = f"snapshot_{int(time.time() * 1000)}.jpg"
            fpath = os.path.join(SNAPSHOT_DIR, fname)
            cv2.imwrite(fpath, annotated)
            print(f"[INFO] Snapshot saved via phone remote control: {fpath}")

        last_frame_for_pause = annotated.copy()

        with stats_lock:
            live_stats["fps"] = round(fps_display, 1)
            live_stats["active_intrusions"] = total_active
            live_stats["occupancy"] = occupancy
            live_stats["occupancy_limit"] = occ_limit
            live_stats["paused"] = False
            live_stats["tripwires"] = [{"name": tw["name"], "count_in": tw["count_in"],
                                          "count_out": tw["count_out"]} for tw in tripwires]
            live_stats["zones"] = [{"name": z["name"], "active": len(current_zone_ids[z["id"]]) > 0}
                                     for z in zones]

        cv2.imshow(config.WINDOW_NAME, annotated)

        ok, jpeg_buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 70])
        if ok:
            with stream_lock:
                latest_jpeg = jpeg_buf.tobytes()

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        elif key == ord("f"):
            desktop_fullscreen = not desktop_fullscreen
            prop = cv2.WINDOW_FULLSCREEN if desktop_fullscreen else cv2.WINDOW_NORMAL
            cv2.setWindowProperty(config.WINDOW_NAME, cv2.WND_PROP_FULLSCREEN, prop)

    cap.release()
    cv2.destroyAllWindows()
    logger.close()

    print("[INFO] Session ended. Per-tripwire totals:")
    for tw in tripwires:
        print(f"  {tw['name']}: IN={tw['count_in']}  OUT={tw['count_out']}")
    print(f"[INFO] Telemetry saved to: {csv_path}")
    if breach_latencies_ms:
        avg_latency = sum(breach_latencies_ms) / len(breach_latencies_ms)
        print(f"[INFO] Breach alert latency over {len(breach_latencies_ms)} event(s): "
              f"avg={avg_latency:.1f}ms, min={min(breach_latencies_ms):.1f}ms, "
              f"max={max(breach_latencies_ms):.1f}ms")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[INFO] Interrupted by user (Ctrl+C). Shutting down cleanly.")
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        print("[INFO] If the webcam appears stuck afterward, unplug/replug it "
              "or restart this app before running again.")
    finally:
        cv2.destroyAllWindows()