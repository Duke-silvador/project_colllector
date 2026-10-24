# /// script
# requires-python = ">=3.9"
# dependencies = ["elevenlabs", "python-dotenv"]
# ///
"""Minimal ElevenLabs smoke test: list voices, then synthesize a short clip to out.mp3."""
import os

from dotenv import load_dotenv
from elevenlabs import save
from elevenlabs.client import ElevenLabs

load_dotenv()
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

voices = client.voices.search().voices
print(f"{len(voices)} voices available, e.g.:")
for v in voices[:5]:
    print(f"  {v.voice_id}  {v.name}")

audio = client.text_to_speech.convert(
    text="Hello from the ElevenLabs Python SDK.",
    voice_id="JBFqnCBsd6RMkjVDRZzb",  # "George", the default voice in the SDK README
    model_id="eleven_multilingual_v2",
    output_format="mp3_44100_128",
)
save(audio, "out.mp3")
print("Wrote out.mp3")
