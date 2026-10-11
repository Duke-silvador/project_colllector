#!/usr/bin/env python3
"""Cross-platform graphical settings and status panel for Mawaqit Notify.
Uses Python built-in Tkinter (zero external dependencies)."""
import json
import subprocess
import sys
from datetime import date
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox

CONFIG_FILE = Path.home() / ".config" / "mawaqit-notify" / "config.json"
CACHE_DIR = Path.home() / ".cache" / "mawaqit-notify"
TODAY_FILE = CACHE_DIR / "today.json"
FETCH_SCRIPT = Path(__file__).resolve().parent / "mawaqit_fetch.py"
NOTIFY_SCRIPT = Path(__file__).resolve().parent / "prayer_notify.py"

PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]


def load_config() -> dict:
    try:
        return json.loads(CONFIG_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            "mosque_url": "https://mawaqit.net/en/islamic-culture-centre-thiruvananthapuram-695016-india",
            "notify_azan": True,
            "notify_azan_before_minutes": 0,
            "notify_iqama": True,
            "notify_iqama_before_minutes": 5,
            "sound_enabled": True,
        }


def save_config(config: dict) -> None:
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2, ensure_ascii=False))


def load_today_cache() -> dict | None:
    try:
        return json.loads(TODAY_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None


class MawaqitSettingsApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Mawaqit Prayer Notifications")
        self.root.geometry("620x720")
        self.root.minsize(580, 680)

        # Apply ttk styles
        self.style = ttk.Style()
        self.style.theme_use("clam")

        self.config = load_config()
        self.create_widgets()
        self.load_prayer_times()

    def create_widgets(self):
        main_frame = ttk.Frame(self.root, padding=16)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Title Header
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill=tk.X, pady=(0, 12))

        title_label = ttk.Label(
            header_frame,
            text="🕌 Mawaqit Prayer Notifications",
            font=("Helvetica", 16, "bold")
        )
        title_label.pack(side=tk.LEFT)

        self.status_badge = ttk.Label(
            header_frame,
            text="Online",
            font=("Helvetica", 9, "bold"),
            foreground="#2e7d32"
        )
        self.status_badge.pack(side=tk.RIGHT, padx=4)

        # Mosque URL Section
        url_frame = ttk.LabelFrame(main_frame, text="Mosque Configuration", padding=10)
        url_frame.pack(fill=tk.X, pady=(0, 12))

        ttk.Label(url_frame, text="Mawaqit Mosque Page URL:").pack(anchor=tk.W)
        self.url_var = tk.StringVar(value=self.config.get("mosque_url", ""))
        url_entry = ttk.Entry(url_frame, textvariable=self.url_var, width=50)
        url_entry.pack(fill=tk.X, pady=(4, 8))

        btn_row = ttk.Frame(url_frame)
        btn_row.pack(fill=tk.X)
        self.btn_fetch = ttk.Button(btn_row, text="🔄 Fetch Today's Times", command=self.on_fetch_clicked)
        self.btn_fetch.pack(side=tk.LEFT)

        # Notification Preferences Section
        prefs_frame = ttk.LabelFrame(main_frame, text="Notification Settings", padding=10)
        prefs_frame.pack(fill=tk.X, pady=(0, 12))

        # Adhan (Azan) Row
        azan_frame = ttk.Frame(prefs_frame)
        azan_frame.pack(fill=tk.X, pady=4)

        self.azan_var = tk.BooleanVar(value=self.config.get("notify_azan", True))
        chk_azan = ttk.Checkbutton(azan_frame, text="Notify for Adhan (Azan)", variable=self.azan_var)
        chk_azan.pack(side=tk.LEFT)

        ttk.Label(azan_frame, text="Timing:").pack(side=tk.LEFT, padx=(20, 6))
        self.azan_min_var = tk.StringVar(value=str(self.config.get("notify_azan_before_minutes", 0)))
        azan_combo = ttk.Combobox(
            azan_frame,
            textvariable=self.azan_min_var,
            values=["0", "1", "2", "5", "10", "15"],
            width=4,
            state="readonly"
        )
        azan_combo.pack(side=tk.LEFT)
        ttk.Label(azan_frame, text="min before (0 = at Adhan)").pack(side=tk.LEFT, padx=6)

        # Iqamah (Iqamat) Row
        iqama_frame = ttk.Frame(prefs_frame)
        iqama_frame.pack(fill=tk.X, pady=4)

        self.iqama_var = tk.BooleanVar(value=self.config.get("notify_iqama", True))
        chk_iqama = ttk.Checkbutton(iqama_frame, text="Notify for Iqamah (Iqamat)", variable=self.iqama_var)
        chk_iqama.pack(side=tk.LEFT)

        ttk.Label(iqama_frame, text="Timing:").pack(side=tk.LEFT, padx=(13, 6))
        self.iqama_min_var = tk.StringVar(value=str(self.config.get("notify_iqama_before_minutes", self.config.get("notify_before_minutes", 5))))
        iqama_combo = ttk.Combobox(
            iqama_frame,
            textvariable=self.iqama_min_var,
            values=["0", "1", "2", "3", "5", "10", "15", "20"],
            width=4,
            state="readonly"
        )
        iqama_combo.pack(side=tk.LEFT)
        ttk.Label(iqama_frame, text="min before (0 = at Iqamah)").pack(side=tk.LEFT, padx=6)

        # Sound Option
        sound_frame = ttk.Frame(prefs_frame)
        sound_frame.pack(fill=tk.X, pady=(6, 0))

        self.sound_var = tk.BooleanVar(value=self.config.get("sound_enabled", True))
        chk_sound = ttk.Checkbutton(
            sound_frame,
            text="Play Standard Notification Sound (System Chime)",
            variable=self.sound_var
        )
        chk_sound.pack(side=tk.LEFT)

        # Test Buttons
        test_frame = ttk.Frame(prefs_frame)
        test_frame.pack(fill=tk.X, pady=(10, 0))

        btn_test_azan = ttk.Button(test_frame, text="🔔 Test Adhan Alert", command=self.on_test_azan)
        btn_test_azan.pack(side=tk.LEFT, padx=(0, 8))

        btn_test_iqama = ttk.Button(test_frame, text="⏰ Test Iqamah Alert", command=self.on_test_iqama)
        btn_test_iqama.pack(side=tk.LEFT)

        # Today's Schedule Table Section
        times_frame = ttk.LabelFrame(main_frame, text="Today's Prayer Schedule", padding=10)
        times_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 12))

        self.mosque_label = ttk.Label(times_frame, text="Mosque: Loading...", font=("Helvetica", 10, "bold"))
        self.mosque_label.pack(anchor=tk.W, pady=(0, 4))

        self.offline_banner = ttk.Label(
            times_frame,
            text="",
            font=("Helvetica", 9, "italic"),
            foreground="#d97706"
        )
        self.offline_banner.pack(anchor=tk.W, pady=(0, 6))

        # Schedule Table
        columns = ("prayer", "adhan", "iqama")
        self.tree = ttk.Treeview(times_frame, columns=columns, show="headings", height=6)
        self.tree.heading("prayer", text="Prayer")
        self.tree.heading("adhan", text="Adhan (Azan)")
        self.tree.heading("iqama", text="Iqamah (Iqamat)")

        self.tree.column("prayer", width=120, anchor=tk.CENTER)
        self.tree.column("adhan", width=120, anchor=tk.CENTER)
        self.tree.column("iqama", width=120, anchor=tk.CENTER)
        self.tree.pack(fill=tk.BOTH, expand=True)

        # Bottom Action Bar
        bottom_bar = ttk.Frame(main_frame)
        bottom_bar.pack(fill=tk.X)

        self.save_btn = ttk.Button(bottom_bar, text="💾 Save Settings", command=self.on_save_clicked)
        self.save_btn.pack(side=tk.RIGHT)

        self.msg_label = ttk.Label(bottom_bar, text="", foreground="#2e7d32")
        self.msg_label.pack(side=tk.LEFT)

    def load_prayer_times(self):
        data = load_today_cache()
        for item in self.tree.get_children():
            self.tree.delete(item)

        if not data:
            self.mosque_label.config(text="No cached times found. Click 'Fetch Today's Times'.")
            self.status_badge.config(text="No Cache", foreground="#d32f2f")
            return

        mosque_name = data.get("mosque", "Mosque")
        date_str = data.get("date", date.today().isoformat())
        is_fallback = data.get("offline_fallback", False)

        self.mosque_label.config(text=f"Mosque: {mosque_name} ({date_str})")

        if is_fallback:
            self.status_badge.config(text="Offline Fallback Active", foreground="#d97706")
            self.offline_banner.config(text="⚠️ Internet unavailable: Using yesterday's times for today.")
        else:
            self.status_badge.config(text="Online", foreground="#2e7d32")
            self.offline_banner.config(text="")

        adhan = data.get("adhan", {})
        iqama = data.get("iqama", {})
        shuruq = data.get("shuruq")

        for p in PRAYERS:
            a_time = adhan.get(p, "--:--")
            i_time = iqama.get(p, "--:--")
            self.tree.insert("", tk.END, values=(p, a_time, i_time))
            if p == "Fajr" and shuruq:
                self.tree.insert("", tk.END, values=("Sunrise (Shuruq)", shuruq, "-"))

    def on_fetch_clicked(self):
        self.btn_fetch.config(state=tk.DISABLED)
        self.msg_label.config(text="Fetching latest times from Mawaqit...", foreground="#1565c0")
        self.root.update_idletasks()

        url = self.url_var.get().strip()
        cmd = [sys.executable, str(FETCH_SCRIPT)]
        if url:
            cmd.extend(["--url", url])

        res = subprocess.run(cmd, capture_output=True, text=True)
        self.btn_fetch.config(state=tk.NORMAL)

        if res.returncode == 0:
            self.load_prayer_times()
            self.msg_label.config(text="Prayer times refreshed successfully!", foreground="#2e7d32")
        else:
            self.load_prayer_times()
            self.msg_label.config(text="Fetch failed (checked offline fallback).", foreground="#c62828")

    def on_save_clicked(self):
        try:
            azan_min = int(self.azan_min_var.get())
            iqama_min = int(self.iqama_min_var.get())
        except ValueError:
            messagebox.showerror("Error", "Timing values must be numbers.")
            return

        new_config = {
            "mosque_url": self.url_var.get().strip(),
            "notify_azan": self.azan_var.get(),
            "notify_azan_before_minutes": azan_min,
            "notify_iqama": self.iqama_var.get(),
            "notify_iqama_before_minutes": iqama_min,
            "sound_enabled": self.sound_var.get(),
        }

        save_config(new_config)
        self.config = new_config
        self.msg_label.config(text="Settings saved successfully!", foreground="#2e7d32")
        self.root.after(3000, lambda: self.msg_label.config(text=""))

    def on_test_azan(self):
        self.on_save_clicked()
        subprocess.run([sys.executable, str(NOTIFY_SCRIPT), "--test-azan"], check=False)
        self.msg_label.config(text="Sent test Adhan notification.", foreground="#2e7d32")

    def on_test_iqama(self):
        self.on_save_clicked()
        subprocess.run([sys.executable, str(NOTIFY_SCRIPT), "--test-iqama"], check=False)
        self.msg_label.config(text="Sent test Iqamah notification.", foreground="#2e7d32")


def main():
    root = tk.Tk()
    app = MawaqitSettingsApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
