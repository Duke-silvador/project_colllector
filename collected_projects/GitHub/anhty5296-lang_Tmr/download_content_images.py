#!/usr/bin/env python3
"""Download content/* images referenced in HTML files from mcredit.com.vn."""
from __future__ import annotations

import re
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CDN = "https://mcredit.com.vn/"
REF_PATTERN = re.compile(
    r'(?:src|data-src|content|href)\s*=\s*["\']([^"\']+)["\']',
    re.IGNORECASE,
)
STYLE_URL_PATTERN = re.compile(
    r'background-image\s*:\s*url\(\s*["\']?([^"\')\s]+)["\']?\s*\)',
    re.IGNORECASE,
)


def collect_refs() -> set[str]:
    refs: set[str] = set()
    for html in ROOT.rglob("*.html"):
        text = html.read_text(encoding="utf-8", errors="replace")
        for match in REF_PATTERN.finditer(text):
            ref = match.group(1).split("?")[0].split("#")[0].strip()
            if "content/" not in ref:
                continue
            if ref.startswith("https://mcredit.com.vn/"):
                ref = ref[len("https://mcredit.com.vn/") :]
            elif ref.startswith("/content/"):
                ref = ref.lstrip("/")
            if ref.startswith("content/"):
                refs.add(ref)
        for match in STYLE_URL_PATTERN.finditer(text):
            ref = match.group(1).split("?")[0].split("#")[0].strip()
            if ref.startswith("https://mcredit.com.vn/"):
                ref = ref[len("https://mcredit.com.vn/") :]
            if ref.startswith("content/"):
                refs.add(ref)
    return refs


def download(ref: str, ctx: ssl.SSLContext) -> bool:
    dest = ROOT / ref.replace("/", "\\")
    if dest.is_file() and dest.stat().st_size > 100:
        return True

    dest.parent.mkdir(parents=True, exist_ok=True)
    url = CDN + ref
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        data = resp.read()
    if len(data) < 100:
        raise ValueError("response too small")
    dest.write_bytes(data)
    return True


def main() -> None:
    ctx = ssl.create_default_context()
    refs = sorted(collect_refs())
    print(f"Found {len(refs)} unique content references")

    ok = skipped = failed = 0
    for ref in refs:
        dest = ROOT / ref.replace("/", "\\")
        if dest.is_file() and dest.stat().st_size > 100:
            skipped += 1
            continue
        try:
            download(ref, ctx)
            ok += 1
            print(f"OK   {ref}")
        except Exception as exc:
            failed += 1
            print(f"FAIL {ref}: {exc}")

    print(f"Done: downloaded={ok} skipped={skipped} failed={failed}")


if __name__ == "__main__":
    main()
