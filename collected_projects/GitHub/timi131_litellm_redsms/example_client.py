"""Пример клиента: LiteLLM Proxy совместим с OpenAI API.

    .venv/bin/python example_client.py
"""
import os
from pathlib import Path

from openai import OpenAI

for line in Path(__file__).with_name(".env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())

client = OpenAI(
    base_url=f"http://{os.environ.get('LITELLM_HOST', '127.0.0.1')}:{os.environ.get('LITELLM_PORT', '4000')}",
    api_key=os.environ["LITELLM_MASTER_KEY"],
)

reply = client.chat.completions.create(
    model="llama3.1-8b",
    messages=[{"role": "user", "content": "Привет! Кто ты?"}],
)
print(reply.choices[0].message.content)
