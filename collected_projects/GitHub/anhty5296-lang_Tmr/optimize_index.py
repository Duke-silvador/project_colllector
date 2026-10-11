#!/usr/bin/env python3
"""Keep only index page; link other pages to mcredit.com.vn; remove duplicate/unused assets."""
from __future__ import annotations

import hashlib
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
BASE_URL = "https://mcredit.com.vn"
INDEX = ROOT / "index.html"

ASSET_EXTS = {
    ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot", ".map",
}

SKIP_LINK_PREFIXES = ("http://", "https://", "tel:", "mailto:", "javascript:", "#")
PAGE_PREFIXES = ("vi/", "pages/", "ca-nhan/", "app/")


def normalize_href(href: str) -> str | None:
    href = href.strip()
    if not href or href.startswith(SKIP_LINK_PREFIXES):
        return None
    if href in ("index.html", "./index.html", "/"):
        return None
    return href


def to_external_url(path: str) -> str:
    path = path.replace("\\", "/")
    if path.startswith("/"):
        path = path[1:]
    if path.endswith("index.html"):
        path = path[: -len("index.html")]
    path = path.rstrip("/")
    return f"{BASE_URL}/{path}" if path else BASE_URL + "/"


def rewrite_internal_links(text: str) -> str:
    def repl_href(m: re.Match) -> str:
        quote, href = m.group(1), m.group(2)
        if normalize_href(href) is None:
            return m.group(0)
        if href.startswith(PAGE_PREFIXES) or href.endswith(".html"):
            return f'href={quote}{to_external_url(href)}{quote}'
        return m.group(0)

    text = re.sub(r'href=(["\'])([^"\']+)\1', repl_href, text)
    return text


def extract_refs(text: str) -> set[str]:
    refs: set[str] = set()
    patterns = [
        r'(?:src|href|data-src|content)=["\']([^"\']+)["\']',
        r'url\(\s*["\']?([^"\')\s]+)["\']?\s*\)',
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            ref = m.group(1).strip()
            if ref.startswith(SKIP_LINK_PREFIXES) or ref.startswith("data:"):
                continue
            if ref.startswith("/"):
                ref = ref[1:]
            refs.add(ref.split("?")[0].split("#")[0])
    return refs


def resolve_ref(ref: str, base: Path) -> Path | None:
    ref = ref.replace("\\", "/")
    if ref.startswith("/"):
        candidate = ROOT / ref.lstrip("/")
    else:
        candidate = (base.parent / ref).resolve()
    try:
        candidate.relative_to(ROOT)
    except ValueError:
        return None
    return candidate


def collect_used_assets() -> set[Path]:
    used: set[Path] = {INDEX}
    queue: list[Path] = [INDEX]
    seen: set[Path] = set()

    while queue:
        current = queue.pop()
        if current in seen or not current.is_file():
            continue
        seen.add(current)
        try:
            text = current.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for ref in extract_refs(text):
            resolved = resolve_ref(ref, current)
            if resolved and resolved.is_file():
                if resolved not in used:
                    used.add(resolved)
                    if resolved.suffix.lower() in {".css", ".js", ".html"}:
                        queue.append(resolved)
    return used


def find_duplicate_images() -> dict[bytes, list[Path]]:
    by_hash: dict[bytes, list[Path]] = {}
    img_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"}
    for p in ROOT.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in img_exts:
            continue
        try:
            h = hashlib.md5(p.read_bytes()).digest()
        except OSError:
            continue
        by_hash.setdefault(h, []).append(p)
    return {h: paths for h, paths in by_hash.items() if len(paths) > 1}


def pick_canonical(paths: list[Path], used: set[Path]) -> Path:
    used_paths = [p for p in paths if p in used]
    pool = used_paths or paths
    return sorted(pool, key=lambda p: (len(str(p)), str(p).lower()))[0]


def main() -> None:
    print("1. Rewriting internal links in index.html -> mcredit.com.vn")
    original = INDEX.read_text(encoding="utf-8", errors="replace")
    updated = rewrite_internal_links(original)
    if updated != original:
        INDEX.write_text(updated, encoding="utf-8")
        print("   Updated index.html")
    else:
        print("   No link changes needed")

    print("2. Collecting assets required by index.html")
    used = collect_used_assets()
    print(f"   Used files: {len(used)}")

    print("3. Removing duplicate images (same content)")
    dups = find_duplicate_images()
    dup_removed = 0
    for paths in dups.values():
        canonical = pick_canonical(paths, used)
        for p in paths:
            if p == canonical:
                continue
            if p in used:
                # rewrite references in index and css to canonical relative path
                rel_old = p.relative_to(ROOT).as_posix()
                rel_new = canonical.relative_to(ROOT).as_posix()
                for f in list(used):
                    if f.suffix.lower() not in {".html", ".css", ".js"}:
                        continue
                    text = f.read_text(encoding="utf-8", errors="replace")
                    if rel_old in text:
                        f.write_text(text.replace(rel_old, rel_new), encoding="utf-8")
            try:
                p.unlink()
                dup_removed += 1
            except OSError:
                pass
    print(f"   Removed duplicate images: {dup_removed}")

    # refresh used set after rewrites
    used = collect_used_assets()

    print("4. Deleting unused files")
    removed_files = 0
    for p in list(ROOT.rglob("*")):
        if not p.is_file():
            continue
        if p == INDEX or p.name in ("optimize_index.py", "start_server.py", "brand_rename.py", "HUONG-DAN.txt"):
            continue
        if p not in used:
            try:
                p.unlink()
                removed_files += 1
            except OSError:
                pass
    print(f"   Removed unused files: {removed_files}")

    print("5. Deleting empty directories and page-only folders")
    page_dirs = ["vi", "pages", "ca-nhan", "app", "XX1S", "zCWd", "configs"]
    for name in page_dirs:
        d = ROOT / name
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)
            print(f"   Removed directory: {name}/")

    # remove any remaining empty dirs (bottom-up)
    for d in sorted(ROOT.rglob("*"), key=lambda x: len(x.parts), reverse=True):
        if d.is_dir() and d != ROOT:
            try:
                d.rmdir()
            except OSError:
                pass

    remaining = sum(1 for _ in ROOT.rglob("*") if _.is_file())
    html_count = sum(1 for _ in ROOT.rglob("*.html") if _.is_file())
    print(f"\nDone. Files remaining: {remaining}, HTML pages: {html_count}")


if __name__ == "__main__":
    main()
