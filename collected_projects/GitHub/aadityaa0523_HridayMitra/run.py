"""HridayMitra: one command for everything.

  python run.py setup                 install Python packages, make the synthetic cohorts if missing
  python run.py test                  run the whole test suite
  python run.py demo                  open the dashboard (patient, family, ASHA/doctor views)
  python run.py live --simulate P0022 feed a pretend patient into the dashboard as if from the stool
  python run.py live --port COM5      log the real stool's check-ins into the dashboard
  python run.py hil --port COM5       hardware-in-the-loop: real stool's engine vs Python, must agree 100 %
  python run.py firmware [--upload COM5] [--amulet-port COM6]   make voice clips, compile (and flash) both boards
  python run.py wokwi                 build the Wokwi projects (virtual patient + phone chips) - see wokwi/README.md
  python run.py reproduce             re-run every result (tuning, tests, stress, assumptions, care loop, circuits)
  python run.py docs                  rebuild schematic, block diagram, cost, report and pitch PDFs
  python run.py all                   setup + test + reproduce + docs + firmware compile
"""
import os, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
PY = sys.executable
ARDUINO = shutil.which("arduino-cli") or str(pathlib.Path.home() / "tools/arduino/arduino-cli.exe")
STOOL_FQBN = "esp32:esp32:esp32:PartitionScheme=huge_app"
AMULET_FQBN = "esp32:esp32:esp32c3:CDCOnBoot=cdc"


def sh(*cmd, check=True):
    print("\n$ " + " ".join(map(str, cmd)), flush=True)
    return subprocess.run(list(map(str, cmd)), cwd=ROOT, check=check).returncode


def py(script, *args, check=True):
    return sh(PY, "-X", "utf8", "-W", "ignore", script, *args, check=check)


def setup():
    sh(PY, "-m", "pip", "install", "-q", "-r", "requirements.txt")
    if not (ROOT / "data/processed/daily_features.csv").exists():
        py("sim/patients/make_patients.py")
    if not (ROOT / "data/processed/realworld/daily_features.csv").exists():
        py("sim/patients/make_patients.py", "--patients", "1000", "--days", "180", "--event-fraction", "0.1",
           "--seed", "43", "--out", "data/processed/realworld")


def firmware(args):
    if not (ROOT / "firmware/hridaymitra_stool/voice_clips.h").exists():
        py("tools/make_voice_clips.py")
    for sketch, fqbn, port in (("firmware/hridaymitra_stool", STOOL_FQBN, opt(args, "--upload")),
                               ("firmware/hridaymitra_amulet", AMULET_FQBN, opt(args, "--amulet-port"))):
        sh(ARDUINO, "compile", "--fqbn", fqbn, sketch)
        if port:
            sh(ARDUINO, "upload", "--fqbn", fqbn, "-p", port, sketch)


def reproduce():
    for s in ["engine/leadtime_v2.py", "engine/amber_lead.py", "engine/stress_and_ablation.py",
              "engine/assumption_sensitivity.py", "engine/ml_comparator.py", "sim/careloop/careloop.py",
              "engine/validate_bidmc_hr.py"]:
        py(s, check=False)
    if shutil.which("LTspice") or pathlib.Path(r"C:\Users\Aadityaa\AppData\Local\Programs\ADI\LTspice\LTspice.exe").exists():
        for s in ["sim/circuit/trunk_paths.py", "sim/circuit/montecarlo.py", "sim/circuit/hum.py"]:
            py(s, check=False)


def docs():
    for s in ["tools/make_schematic.py", "tools/make_block_diagram.py", "tools/cost_sim.py", "tools/make_docs.py",
              "tools/progress.py"]:
        py(s, check=False)


def opt(args, name):
    return args[args.index(name) + 1] if name in args else None


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__); return
    cmd, rest = sys.argv[1], sys.argv[2:]
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if cmd == "setup": setup()
    elif cmd == "test": sh(PY, "-m", "pytest", "tests", "-q", "-W", "ignore")
    elif cmd == "demo": sh(PY, "-m", "streamlit", "run", "demo/app.py")
    elif cmd == "live": py("tools/stool_bridge.py", *rest)
    elif cmd == "hil": py("tools/stool_bridge.py", *rest, "--replay", opt(rest, "--patient") or "P0022")
    elif cmd == "firmware": firmware(rest)
    elif cmd == "wokwi": py("tools/make_wokwi.py", *rest)
    elif cmd == "reproduce": reproduce()
    elif cmd == "docs": docs()
    elif cmd == "all":
        setup(); sh(PY, "-m", "pytest", "tests", "-q", "-W", "ignore"); reproduce(); docs(); firmware([])
    else:
        print(__doc__); sys.exit(1)


if __name__ == "__main__":
    main()
