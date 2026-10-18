import subprocess
import time
import sys
import os
import re
import threading

ADB = r"C:\Users\SHOAIB\AppData\Local\Android\Sdk\platform-tools\adb.exe"
PACKAGE = "dev.muguet"
LOG_FILE = "live_monitor.log"
REPORT_FILE = "crash_analysis.txt"

def adb_cmd(cmd_list):
    try:
        return subprocess.check_output([ADB] + cmd_list, stderr=subprocess.STDOUT).decode('utf-8', errors='ignore')
    except Exception as e:
        return ""

def logcat_listener(stop_event, logs_captured):
    proc = subprocess.Popen([ADB, "logcat", "-v", "time"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    while not stop_event.is_set():
        line = proc.stdout.readline()
        if not line:
            break
        decoded = line.decode('utf-8', errors='ignore')
        if any(tag in decoded for tag in ["dev.muguet", "muguet", "DEBUG", "AndroidRuntime", "FATAL", "SIGSEGV", "Fatal signal", "Out of memory", "OutOfMemory"]):
            logs_captured.append(decoded)
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(decoded)
    proc.terminate()

def run_monitor():
    print("=" * 60)
    print("GTA WEB MALI - Active Game Process Monitor")
    print("=" * 60)
    
    logs_captured = []
    stop_event = threading.Event()
    t = threading.Thread(target=logcat_listener, args=(stop_event, logs_captured), daemon=True)
    t.start()
    
    peak_cpu = 0.0
    peak_mem_mb = 0.0
    start_time = time.time()
    
    was_running = False
    
    try:
        while True:
            # Check all muguet PIDs
            ps_out = adb_cmd(["shell", "ps -A | grep muguet"]).strip()
            # lines look like: u0_a1659 14740 960 ... dev.muguet:game
            game_pid = None
            launcher_pid = None
            
            for line in ps_out.splitlines():
                parts = line.split()
                if len(parts) >= 9:
                    pid = parts[1]
                    name = parts[-1]
                    if ":game" in name:
                        game_pid = pid
                    elif name == "dev.muguet":
                        launcher_pid = pid
                        
            active_pid = game_pid or launcher_pid
            proc_label = "Game (Native Engine)" if game_pid else "Launcher Menu"
            
            if active_pid:
                was_running = True
                
                # Get CPU & Memory via top
                top_out = adb_cmd(["shell", f"top -b -n 1 -p {active_pid}"]).strip()
                cpu_pct = 0.0
                mem_rss_str = "0M"
                
                for line in top_out.splitlines():
                    if active_pid in line:
                        parts = line.split()
                        try:
                            # Typically: PID USER PR NI VIRT RES SHR S [%CPU] %MEM TIME+ ARGS
                            cpu_pct = float(parts[-4].replace('%', ''))
                            mem_rss_str = parts[5]
                        except:
                            pass
                
                if cpu_pct > peak_cpu:
                    peak_cpu = cpu_pct

                # Print live status
                sys.stdout.write(f"\r[RUNNING] Mode: {proc_label} | PID: {active_pid} | CPU: {cpu_pct:.1f}% (Peak: {peak_cpu:.1f}%) | RAM (RSS): {mem_rss_str} | Active: {int(time.time() - start_time)}s    ")
                sys.stdout.flush()
                
            else:
                if was_running:
                    print("\n\n" + "!" * 60)
                    print("GAME PROCESS TERMINATED OR EXITED!")
                    print("!" * 60)
                    break
                else:
                    sys.stdout.write("\rWaiting for game process to start...    ")
                    sys.stdout.flush()
                    
            time.sleep(1.5)
            
    except KeyboardInterrupt:
        print("\nMonitoring stopped by user.")
        
    stop_event.set()
    
    # Capture Exit Info & Crash Dump
    print("\nExtracting crash & exit diagnostics...")
    exit_info = adb_cmd(["shell", f"dumpsys activity exit-info {PACKAGE}"])
    tombstones = adb_cmd(["shell", "ls -lt /data/tombstones 2>/dev/null | head -n 5"])
    
    error_lines = [l for l in logs_captured if any(w in l for w in ["FATAL", "DEBUG   :", "SIGSEGV", "backtrace:", "Crash", "Caused by", "Exception", "Error", "panic", "unwrap"])]
    
    report = []
    report.append("==================================================")
    report.append("GTA WEB MALI - SESSION REPORT")
    report.append(f"Timestamp: {time.ctime()}")
    report.append("==================================================\n")
    report.append(f"Session Duration: {int(time.time() - start_time)} seconds")
    report.append(f"Peak CPU Usage: {peak_cpu:.1f}%\n")
    report.append("--- EXIT REASON ---")
    report.append(exit_info.strip() if exit_info else "No exit-info available.")
    report.append("\n--- LOGS ---")
    if error_lines:
        report.extend(error_lines[-30:])
    else:
        report.append("No native crash detected.")
        report.extend(logs_captured[-20:])
        
    report_text = "\n".join(report)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write(report_text)
        
    print(f"\nReport written to: {REPORT_FILE}")

if __name__ == "__main__":
    run_monitor()
