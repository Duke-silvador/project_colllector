import csv
import json
import math
import statistics
from pathlib import Path

TRACE = Path("runs/disturbance_240s_trace.csv")
OUT_TXT = Path("runs/disturbance_240s_analysis.txt")
OUT_JSON = Path("runs/disturbance_240s_analysis.json")
OUT_PNG = Path("runs/disturbance_240s_trends.png")

SETPOINT = 50.0
DISTURBANCE_TIME = 5.0
REQUIRED = [
    "time_s",
    "level_pct",
    "feedwater_flow_pu",
    "steam_flow_pu",
    "valve_pct",
]

if not TRACE.exists():
    raise FileNotFoundError(f"Missing trace: {TRACE}")

rows = []
with TRACE.open("r", newline="", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    missing = [c for c in REQUIRED if c not in (reader.fieldnames or [])]
    if missing:
        raise ValueError(f"Missing CSV columns: {missing}")

    for line_no, row in enumerate(reader, start=2):
        record = {}
        for col in REQUIRED:
            try:
                value = float(row[col])
            except (TypeError, ValueError):
                raise ValueError(
                    f"Invalid {col} at CSV line {line_no}: {row[col]!r}"
                )
            if not math.isfinite(value):
                raise ValueError(f"Non-finite {col} at line {line_no}")
            record[col] = value
        rows.append(record)

if len(rows) < 2:
    raise ValueError(f"Insufficient trace records: {len(rows)}")

if any(
    rows[i]["time_s"] < rows[i - 1]["time_s"]
    for i in range(1, len(rows))
):
    raise ValueError("Trace timestamps are not in chronological order.")

post = [r for r in rows if r["time_s"] >= DISTURBANCE_TIME]
pre = [r for r in rows if r["time_s"] < DISTURBANCE_TIME]

if len(post) < 2:
    raise ValueError("Insufficient post-disturbance data.")

minimum = min(post, key=lambda r: r["level_pct"])
maximum = max(post, key=lambda r: r["level_pct"])
final = rows[-1]

def settling_time(band):
    """Sample-based permanent settling within setpoint +/- band."""
    last_outside = None

    for i, r in enumerate(post):
        if abs(r["level_pct"] - SETPOINT) > band:
            last_outside = i

    if abs(post[-1]["level_pct"] - SETPOINT) > band:
        return None

    if last_outside is None:
        return post[0]["time_s"]

    return post[last_outside + 1]["time_s"]

def integrate_error(power=1):
    total = 0.0
    for a, b in zip(post, post[1:]):
        dt = b["time_s"] - a["time_s"]
        ea = abs(a["level_pct"] - SETPOINT) ** power
        eb = abs(b["level_pct"] - SETPOINT) ** power
        total += 0.5 * (ea + eb) * dt
    return total

tail_start = final["time_s"] - 10.0
tail = [r for r in rows if r["time_s"] >= tail_start]
base = pre if pre else [rows[0]]

settling_half = settling_time(0.5)
settling_one = settling_time(1.0)

metrics = {
    "trace_file": str(TRACE),
    "record_count": len(rows),
    "first_time_s": rows[0]["time_s"],
    "last_time_s": final["time_s"],
    "disturbance_time_s": DISTURBANCE_TIME,
    "setpoint_pct": SETPOINT,
    "pre_disturbance_mean_level_pct": statistics.mean(
        r["level_pct"] for r in base
    ),
    "minimum_level_pct": minimum["level_pct"],
    "minimum_level_time_s": minimum["time_s"],
    "maximum_level_pct": maximum["level_pct"],
    "maximum_level_time_s": maximum["time_s"],
    "maximum_overshoot_percentage_points": maximum["level_pct"] - SETPOINT,
    "maximum_undershoot_percentage_points": SETPOINT - minimum["level_pct"],
    "peak_to_peak_level_percentage_points": (
        maximum["level_pct"] - minimum["level_pct"]
    ),
    "final_level_pct": final["level_pct"],
    "final_level_error_percentage_points": final["level_pct"] - SETPOINT,
    "final_feedwater_flow_pu": final["feedwater_flow_pu"],
    "final_steam_flow_pu": final["steam_flow_pu"],
    "final_valve_pct": final["valve_pct"],
    "last_10s_mean_level_pct": statistics.mean(
        r["level_pct"] for r in tail
    ),
    "last_10s_level_population_std_pct": statistics.pstdev(
        r["level_pct"] for r in tail
    ),
    "settling_within_plus_minus_0_5pp_absolute_time_s": settling_half,
    "settling_within_plus_minus_0_5pp_elapsed_s": (
        settling_half - DISTURBANCE_TIME
        if settling_half is not None else None
    ),
    "settling_within_plus_minus_1_0pp_absolute_time_s": settling_one,
    "settling_within_plus_minus_1_0pp_elapsed_s": (
        settling_one - DISTURBANCE_TIME
        if settling_one is not None else None
    ),
    "integrated_absolute_level_error_pp_seconds": integrate_error(1),
    "integrated_squared_level_error_pp_squared_seconds": integrate_error(2),
}

lines = [
    "BOILER DCS - DISTURBANCE RESPONSE ANALYSIS",
    "=" * 48,
    f"Trace records: {metrics['record_count']}",
    f"Recorded time: {metrics['first_time_s']:.2f} to "
    f"{metrics['last_time_s']:.2f} s",
    f"Disturbance time: {DISTURBANCE_TIME:.2f} s",
    f"Setpoint: {SETPOINT:.2f}%",
    "",
    f"Pre-disturbance mean level: "
    f"{metrics['pre_disturbance_mean_level_pct']:.4f}%",
    f"Maximum level: {maximum['level_pct']:.4f}% "
    f"at {maximum['time_s']:.2f} s",
    f"Minimum level: {minimum['level_pct']:.4f}% "
    f"at {minimum['time_s']:.2f} s",
    f"Peak-to-peak variation: "
    f"{metrics['peak_to_peak_level_percentage_points']:.4f} pp",
    f"Final recorded level: {final['level_pct']:.4f}%",
    f"Final level error: "
    f"{metrics['final_level_error_percentage_points']:+.4f} pp",
    "",
    "SETTLING (sample-based; measured from disturbance at 5 s)",
    f"Within +/-0.5 percentage points: "
    f"{settling_half if settling_half is not None else 'NOT ACHIEVED'}",
    f"Within +/-1.0 percentage point: "
    f"{settling_one if settling_one is not None else 'NOT ACHIEVED'}",
    "",
    f"Last 10 s mean level: "
    f"{metrics['last_10s_mean_level_pct']:.4f}%",
    f"Last 10 s population standard deviation: "
    f"{metrics['last_10s_level_population_std_pct']:.5f} percentage points",
    f"IAE: {metrics['integrated_absolute_level_error_pp_seconds']:.4f} "
    f"percentage-point seconds",
    f"ISE: {metrics['integrated_squared_level_error_pp_squared_seconds']:.4f} "
    f"percentage-point squared seconds",
    "",
    "FINAL RECORDED PROCESS VALUES",
    f"Feedwater: {final['feedwater_flow_pu']:.4f} pu",
    f"Steam flow: {final['steam_flow_pu']:.4f} pu",
    f"Valve position: {final['valve_pct']:.2f}%",
    "",
    "Settling results are based on recorded samples, not continuous-time proof.",
]

OUT_TXT.write_text("\n".join(lines) + "\n", encoding="utf-8")
OUT_JSON.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

print("\n".join(lines))
print(f"\nReport saved: {OUT_TXT}")
print(f"Metrics saved: {OUT_JSON}")

try:
    import matplotlib.pyplot as plt
except ImportError:
    print("Matplotlib unavailable; trend plot skipped.")
else:
    times = [r["time_s"] for r in rows]
    fig, axes = plt.subplots(3, 1, figsize=(11, 9), sharex=True)

    axes[0].plot(times, [r["level_pct"] for r in rows],
                 label="Drum level")
    axes[0].axhline(SETPOINT, linestyle="--", label="Setpoint")
    axes[0].axhspan(SETPOINT - 0.5, SETPOINT + 0.5, alpha=0.12,
                    label=" +/-0.5 percentage-point band")
    axes[0].set_ylabel("Level (%)")
    axes[0].legend(loc="best")

    axes[1].plot(times, [r["feedwater_flow_pu"] for r in rows],
                 label="Feedwater flow")
    axes[1].plot(times, [r["steam_flow_pu"] for r in rows],
                 label="Steam flow")
    demand = [1.0 if t < DISTURBANCE_TIME else 1.2 for t in times]
    axes[1].plot(times, demand, linestyle="--",
                 label="Commanded steam demand")
    axes[1].set_ylabel("Flow (pu)")
    axes[1].legend(loc="best")

    axes[2].plot(times, [r["valve_pct"] for r in rows],
                 label="Feedwater valve")
    axes[2].set_ylabel("Valve (%)")
    axes[2].set_xlabel("Simulation time (s)")
    axes[2].legend(loc="best")

    for ax in axes:
        ax.axvline(DISTURBANCE_TIME, linestyle=":", linewidth=1)
        ax.grid(True, alpha=0.3)

    fig.suptitle("Boiler DCS: 20% Steam-Demand Step Response")
    fig.tight_layout()
    fig.savefig(OUT_PNG, dpi=180)
    plt.close(fig)
    print(f"Trend plot saved: {OUT_PNG}")
