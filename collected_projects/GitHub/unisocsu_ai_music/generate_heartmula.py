import os
import subprocess
from pathlib import Path

lyrics = os.environ.get("LYRICS", "").strip()
style = os.environ.get("STYLE", "").strip()
prompt = os.environ.get("SONG_PROMPT", "").strip()
duration_seconds = int(os.environ.get("DURATION_SECONDS", "60"))
if not 20 <= duration_seconds <= 180:
    raise SystemExit("Duration must be between 20 and 180 seconds.")

if not lyrics:
    raise SystemExit("HeartMuLa workflow requires lyrics.")
if not style and not prompt:
    raise SystemExit("Provide a style or song prompt.")

Path("input").mkdir(exist_ok=True)
Path("../output").mkdir(exist_ok=True)
Path("input/lyrics.txt").write_text(lyrics, encoding="utf-8")

# HeartMuLa conditions on tags; include the user's style and any extra description.
tags = ", ".join(part for part in (style, prompt, "Hebrew vocals", "clear sung vocals") if part)
Path("input/tags.txt").write_text(tags, encoding="utf-8")

output = Path("../output/heartmula-song.mp3")
command = [
    str(Path(".venv/bin/python")), "examples/run_music_generation.py",
    "--model_path=./ckpt",
    "--version=3B",
    "--lyrics=./input/lyrics.txt",
    "--tags=./input/tags.txt",
    f"--save_path={output}",
    f"--max_audio_length_ms={duration_seconds * 1000}",
    "--mula_device=cpu",
    "--codec_device=cpu",
    "--mula_dtype=bfloat16",
    "--codec_dtype=float32",
    "--lazy_load=true",
]
print("Starting HeartMuLa 3B on CPU. This is experimental and may be very slow or exceed runner memory.", flush=True)
subprocess.run(command, check=True)

if not output.is_file() or output.stat().st_size < 1024:
    raise RuntimeError(f"HeartMuLa did not create a valid audio file at {output}")

normalized = output.with_name("heartmula-song-normalized.mp3")
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
    "-i", str(output),
    "-af", "loudnorm=I=-14:TP=-1.0:LRA=11",
    "-codec:a", "libmp3lame", "-b:a", "192k",
    str(normalized),
], check=True)
if not normalized.is_file() or normalized.stat().st_size < 1024:
    raise RuntimeError("FFmpeg failed to normalize HeartMuLa output")
normalized.replace(output)

duration_result = subprocess.run([
    "ffprobe", "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", str(output),
], check=True, capture_output=True, text=True)
duration_seconds = float(duration_result.stdout.strip())
if duration_seconds < int(os.environ.get("DURATION_SECONDS", "60")) * 0.75:
    raise RuntimeError(
        f"Generated audio is only {duration_seconds:.1f}s; expected at least 75% of the requested duration."
    )
print(f"Generated HeartMuLa audio: {output} ({output.stat().st_size:,} bytes, {duration_seconds:.1f}s)", flush=True)
