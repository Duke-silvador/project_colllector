#!/usr/bin/env python3
"""Optional LOCAL AI writing assistant. Requires user's own Ollama installation.
Produces a *review-only* draft, never mass-publishes unverified text.
No paid API keys and no data transmitted to a remote service by this program.
"""
import argparse
import datetime as dt
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('topic', help='Security topic for an editorial draft')
    parser.add_argument('--model', default='gemma3:4b', help='Local Ollama model already installed')
    args = parser.parse_args()
    prompt = ("Write a 600-word article DRAFT for a public cybersecurity information site. "
              "Make it actionable, avoid hype or unsupported statistics, and explicitly mark any factual assertion "
              "needing independent verification with [SOURCE NEEDED]. "
              "Do not fabricate quotes, government recommendations, CVEs, sources, or dates. "
              "Use Markdown headings. End with 'EDITORIAL REVIEW REQUIRED' and a checklist of points to verify. "
              "Topic: " + args.topic)
    payload = json.dumps({'model': args.model, 'prompt': prompt, 'stream': False}).encode('utf-8')
    request = urllib.request.Request('http://127.0.0.1:11434/api/generate', data=payload, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=180) as r:
            data = json.load(r)
    except Exception as error:
        raise SystemExit('Local AI not available. Install Ollama and download the selected model first. Details: ' + str(error))
    title = re.sub(r'[^a-z0-9-]+', '-', args.topic.lower()).strip('-')[:55] or 'article'
    path = ROOT / 'drafts' / f'{dt.date.today().isoformat()}-{title}.md'
    path.parent.mkdir(exist_ok=True)
    path.write_text('# EDITORIAL DRAFT — NOT READY FOR PUBLICATION\n\n' + data.get('response', '') + '\n', encoding='utf-8')
    print('Created draft for human verification:', path)


if __name__ == '__main__':
    main()
