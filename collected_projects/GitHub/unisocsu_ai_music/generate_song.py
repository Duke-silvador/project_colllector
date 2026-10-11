import os
import subprocess
from pathlib import Path

from acestep.handler import AceStepHandler
from acestep.llm_inference import LLMHandler
from acestep.inference import GenerationParams, GenerationConfig, generate_music

root = Path(os.environ.get("ACESTEP_ROOT", ".")).resolve()
out_dir = Path("output")
out_dir.mkdir(exist_ok=True)

prompt = os.environ.get("SONG_PROMPT", "").strip()
style = os.environ.get("STYLE", "").strip()
lyrics = os.environ.get("LYRICS", "").strip()
duration_seconds = int(os.environ.get("DURATION_SECONDS", "60"))
if not 20 <= duration_seconds <= 180:
    raise SystemExit("Duration must be between 20 and 180 seconds.")
if not prompt and not lyrics:
    raise SystemExit("Provide a song prompt or lyrics.")

# Give the model concrete arrangement and mix instructions, rather than just a genre label.
caption_parts = [prompt] if prompt else []
if style:
    caption_parts.append(f"Requested style: {style}")
style_lower = style.lower()
if any(term in style_lower for term in ("רוק", "rock", "metal", "מטאל")):
    caption_parts.append(
        "Create an energetic, full-band hard rock song with prominent distorted electric "
        "guitar riffs and power chords, audible electric bass, punchy live rock drums, "
        "strong melodic sung vocals, a memorable chorus, and a powerful guitar-led ending. "
        "Use a full, loud, polished studio mix. No ukulele, no synth-pop, no spoken-word "
        "delivery, and no quiet acoustic demo."
    )
else:
    caption_parts.append(
        "Create a complete, polished song arrangement in the requested style, with a clear "
        "rhythm section, present lead instruments, balanced full-band sound, and a strong "
        "mastered mix. Avoid a sparse, quiet demo."
    )
# Tell the model explicitly to sing in Hebrew when the lyrics contain Hebrew letters.
if any("\u0590" <= ch <= "\u05FF" for ch in lyrics):
    caption_parts.append(
        "The vocals must sing the supplied Hebrew lyrics in natural Hebrew pronunciation. "
        "Keep the original Hebrew words exactly; do not translate them or replace them "
        "with English-sounding syllables. Follow the lyric section labels if provided."
    )
caption = ". ".join(caption_parts)[:1200]

print("Initializing ACE-Step on CPU. Longer generation and prompt reasoning are enabled.", flush=True)
dit = AceStepHandler()
status = dit.initialize_service(
    project_root=str(root),
    config_path="acestep-v15-turbo",
    device="cpu",
)
print(status, flush=True)
if status is False or (isinstance(status, tuple) and not status[-1]):
    raise RuntimeError(f"ACE-Step model initialization failed: {status}")

lm = LLMHandler()
checkpoint_dir = str(root / "checkpoints")
lm_status, lm_ok = lm.initialize(
    checkpoint_dir=checkpoint_dir,
    lm_model_path="acestep-5Hz-lm-0.6B",
    backend="pt",
    device="cpu",
)
print(lm_status, flush=True)
if not lm_ok:
    raise RuntimeError(f"ACE-Step language model initialization failed: {lm_status}")

params = GenerationParams(
    task_type="text2music",
    caption=caption,
    lyrics=lyrics,
    instrumental=not bool(lyrics),
    vocal_language="he" if any("\u0590" <= ch <= "\u05FF" for ch in lyrics) else "unknown",
    duration=duration_seconds,
    inference_steps=8,
    thinking=True,
)
config = GenerationConfig(batch_size=1, use_random_seed=True, audio_format="mp3")
result = generate_music(dit, lm, params, config, save_dir=str(out_dir))
if not result.success:
    raise RuntimeError(f"Music generation failed: {result.error or result.status_message}")

# Trust actual files on disk, not only the model's result metadata.
valid_files = [
    p for p in out_dir.rglob("*.mp3")
    if p.is_file() and p.stat().st_size >= 1024
]
if not valid_files:
    files = [str(p) for p in out_dir.rglob("*") if p.is_file()]
    raise RuntimeError(
        "ACE-Step reported success but no valid MP3 was saved. "
        f"Files found in output/: {files}"
    )

# Raise perceived loudness to a normal streaming level and keep true peaks controlled.
for path in valid_files:
    normalized = path.with_name(path.stem + ".normalized.mp3")
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(path),
            "-af", "loudnorm=I=-14:TP=-1.0:LRA=11",
            "-codec:a", "libmp3lame", "-b:a", "192k",
            str(normalized),
        ],
        check=True,
    )
    if not normalized.is_file() or normalized.stat().st_size < 1024:
        raise RuntimeError(f"FFmpeg failed to create normalized audio for {path}")
    normalized.replace(path)
    duration_result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path),
        ],
        check=True, capture_output=True, text=True,
    )
    duration_seconds = float(duration_result.stdout.strip())
    if duration_seconds < int(os.environ.get("DURATION_SECONDS", "60")) * 0.75:
        raise RuntimeError(
            f"Generated audio is only {duration_seconds:.1f}s; expected at least 75% of the requested duration."
        )
    print(
        f"Generated normalized audio: {path} "
        f"({path.stat().st_size:,} bytes, {duration_seconds:.1f}s)",
        flush=True,
    )
