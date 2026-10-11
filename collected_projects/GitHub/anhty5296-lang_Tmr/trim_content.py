#!/usr/bin/env python3
"""Analyze and trim content/ folder to target file count."""
from __future__ import annotations

import hashlib
import re
import urllib.parse
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
TARGET = 80

REF_PATTERN = re.compile(
    r'(?:src|data-src|content|href)\s*=\s*["\']([^"\']+)["\']',
    re.IGNORECASE,
)
BG_PATTERN = re.compile(
    r'background-image\s*:\s*url\(\s*["\']?([^"\')\s]+)["\']?\s*\)',
    re.IGNORECASE,
)


def normalize_ref(raw: str) -> str | None:
    ref = raw.split("?")[0].split("#")[0].strip()
    if "mcredit.com.vn/" in ref:
        ref = ref.split("mcredit.com.vn/", 1)[1]
    elif ref.startswith("/content/"):
        ref = ref.lstrip("/")
    if ref.startswith("content/"):
        return ref.replace("\\", "/")
    return None


def collect_refs() -> set[str]:
    refs: set[str] = set()
    for html in ROOT.rglob("*.html"):
        text = html.read_text(encoding="utf-8", errors="replace")
        for match in REF_PATTERN.finditer(text):
            ref = normalize_ref(match.group(1))
            if ref:
                refs.add(ref)
        for match in BG_PATTERN.finditer(text):
            ref = normalize_ref(match.group(1))
            if ref:
                refs.add(ref)
    return refs


def rel_path(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def decoded_key(ref: str) -> str:
    parts = ref.split("/")
    parts[-1] = urllib.parse.unquote(parts[-1])
    return "/".join(parts)


def collect_usage() -> dict[str, set[str]]:
    usage: dict[str, set[str]] = defaultdict(set)
    for html in ROOT.rglob("*.html"):
        text = html.read_text(encoding="utf-8", errors="replace")
        page = str(html.relative_to(ROOT)).replace("\\", "/")
        for match in REF_PATTERN.finditer(text):
            ref = normalize_ref(match.group(1))
            if ref:
                usage[ref].add(page)
        for match in BG_PATTERN.finditer(text):
            ref = normalize_ref(match.group(1))
            if ref:
                usage[ref].add(page)
    return usage


def choose_keep(paths: list[Path]) -> Path:
    return sorted(paths, key=lambda p: (len(rel_path(p)), rel_path(p)))[0]


def replace_refs_in_html(old_ref: str, new_ref: str) -> None:
    old_enc = old_ref.replace(" ", "%20")
    new_enc = new_ref.replace(" ", "%20")
    replacements = [
        (old_ref, new_ref),
        (old_enc, new_enc),
        (f"https://mcredit.com.vn/{old_ref}", f"https://mcredit.com.vn/{new_ref}"),
        (f"https://mcredit.com.vn/{old_enc}", f"https://mcredit.com.vn/{new_enc}"),
        (f"../../{old_ref}", f"../../{new_ref}"),
        (f"../{old_ref}", f"../{new_ref}"),
    ]
    for html in ROOT.rglob("*.html"):
        text = html.read_text(encoding="utf-8", errors="replace")
        updated = text
        for old, new in replacements:
            updated = updated.replace(old, new)
        if updated != text:
            html.write_text(updated, encoding="utf-8")


def trim_to_target() -> None:
    deleted: list[str] = []

    # 1. PDFs stay on CDN only.
    for pdf in list(CONTENT.rglob("*.pdf")):
        pdf.unlink()
        deleted.append(rel_path(pdf))

    # 2. Unreferenced files.
    refs = collect_refs()
    for path in list(CONTENT.rglob("*")):
        if not path.is_file():
            continue
        ref = rel_path(path)
        if ref not in refs and decoded_key(ref) not in refs:
            path.unlink()
            deleted.append(ref)

    # 3. Exact hash duplicates: keep one, repoint HTML.
    refs = collect_refs()
    files = [f for f in CONTENT.rglob("*") if f.is_file()]
    by_hash: dict[str, list[Path]] = defaultdict(list)
    for path in files:
        by_hash[hashlib.sha256(path.read_bytes()).hexdigest()].append(path)

    for group in by_hash.values():
        if len(group) < 2:
            continue
        keep = choose_keep(group)
        keep_ref = rel_path(keep)
        for path in group:
            if path == keep:
                continue
            drop_ref = rel_path(path)
            replace_refs_in_html(drop_ref, keep_ref)
            path.unlink()
            deleted.append(drop_ref)

    # 4. Remove empty folders.
    for folder in sorted(CONTENT.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        if folder.is_dir() and not any(folder.iterdir()):
            folder.rmdir()

    remaining = len([f for f in CONTENT.rglob("*") if f.is_file()])
    if remaining <= TARGET:
        print(f"Done: deleted={len(deleted)} remaining={remaining}")
        return

    # 5. Drop lowest-priority single-page carousel/news assets.
    usage = collect_usage()
    candidates: list[tuple[int, str, Path]] = []
    for path in CONTENT.rglob("*"):
        if not path.is_file():
            continue
        ref = rel_path(path)
        pages = usage.get(ref, set())
        score = 0
        if "index.html" in pages:
            score += 100
        if any(p.startswith("pages/") for p in pages):
            score += 80
        if any(p.startswith("vi/") for p in pages):
            score += 10
        if ref.endswith(".ico"):
            score += 200
        if "banner" in ref.lower() or "logo" in ref.lower():
            score += 60
        if "chrome_" in ref:
            score += 50
        candidates.append((score, ref, path))

    def point_ref_to_cdn(ref: str) -> None:
        cdn = f"https://mcredit.com.vn/{ref}"
        for html in ROOT.rglob("*.html"):
            text = html.read_text(encoding="utf-8", errors="replace")
            updated = text
            for old in (f"../../{ref}", f"../{ref}"):
                if old in updated:
                    updated = updated.replace(old, cdn)
            if updated != text:
                html.write_text(updated, encoding="utf-8")

    candidates.sort(key=lambda item: (item[0], item[1]))
    for score, ref, path in candidates:
        if remaining <= TARGET:
            break
        if score >= 100:
            continue
        point_ref_to_cdn(ref)
        path.unlink()
        deleted.append(ref)
        remaining -= 1

    for folder in sorted(CONTENT.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        if folder.is_dir() and not any(folder.iterdir()):
            folder.rmdir()

    remaining = len([f for f in CONTENT.rglob("*") if f.is_file()])
    print(f"Done: deleted={len(deleted)} remaining={remaining}")


def main() -> None:
    refs = collect_refs()
    files = [f for f in CONTENT.rglob("*") if f.is_file()]
    print(f"Files: {len(files)}, refs: {len(refs)}, target: {TARGET}")

    by_hash: dict[str, list[Path]] = defaultdict(list)
    for f in files:
        by_hash[hashlib.sha256(f.read_bytes()).hexdigest()].append(f)

    hash_dupes = [g for g in by_hash.values() if len(g) > 1]
    print(f"Hash duplicate groups: {len(hash_dupes)}")
    for g in hash_dupes:
        print("  HASH", [rel_path(x) for x in sorted(g, key=lambda p: len(rel_path(p)))])

    by_decoded: dict[str, list[str]] = defaultdict(list)
    for ref in refs:
        by_decoded[decoded_key(ref)].append(ref)
    name_dupes = {k: v for k, v in by_decoded.items() if len(v) > 1}
    print(f"Decoded-name duplicate ref groups: {len(name_dupes)}")
    for k, v in sorted(name_dupes.items()):
        print("  NAME", k, "->", v)

    pdfs = [f for f in files if f.suffix.lower() == ".pdf"]
    print(f"PDFs: {len(pdfs)}")

    unref = [f for f in files if rel_path(f) not in refs and decoded_key(rel_path(f)) not in refs]
    print(f"Unreferenced: {len(unref)}")
    for f in unref:
        print("  UNREF", rel_path(f))


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "run":
        trim_to_target()
    else:
        main()
