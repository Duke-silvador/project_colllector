#!/usr/bin/env python3
"""Download and add local product pages: vay tien mat, vay tra gop, the tin dung."""
from __future__ import annotations

import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE_URL = "https://mcredit.com.vn"
PREFIX = "../../"
LOCAL_SLUGS = ("vay-tien-mat", "vay-tra-gop", "the-tin-dung")
SKIP_LINK_PREFIXES = ("http://", "https://", "tel:", "mailto:", "javascript:", "#")
PAGE_PREFIXES = ("vi/", "pages/", "ca-nhan/", "app/")
ASSET_ROOTS = ("content/", "css/", "js/", "lib/", "image/")

LOCAL_FILE_MAP = {
    "css/bundle.min.css": "css/bundle.min_a134b64b.css",
    "js/output/common.min.js": "js/output/common.min_a134b64b.js",
    "js/output/services/services.min.js": "js/output/services/services.min_a134b64b.js",
    "js/output/pages/pages.min.js": "js/output/pages/pages.min_a134b64b.js",
    "js/output/pages/notification.min.js": "js/output/pages/notification.min_a134b64b.js",
    "js/output/pages/loanComponent.min.js": "js/output/pages/loanComponent.min_a134b64b.js",
    "js/output/pages/loanModal.min.js": "js/output/pages/loanModal.min_a134b64b.js",
    "js/pages/footer_user.js": "js/pages/footer_user_a134b64b.js",
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def to_external_url(path: str) -> str:
    path = path.replace("\\", "/").lstrip("/")
    if path.endswith("index.html"):
        path = path[: -len("index.html")]
    path = path.rstrip("/")
    return f"{BASE_URL}/{path}" if path else BASE_URL + "/"


def map_local_asset(path: str) -> str:
    path = path.split("?")[0].split("#")[0]
    if path.startswith("/"):
        path = path[1:]
    return LOCAL_FILE_MAP.get(path, path)


def local_product_href(slug: str, current: str) -> str:
    if slug == current:
        return "index.html"
    return f"../{slug}/index.html"


def rewrite_page(html: str, slug: str) -> str:
    def repl_attr(m: re.Match) -> str:
        attr, quote, val = m.group(1), m.group(2), m.group(3)
        if val.startswith(SKIP_LINK_PREFIXES) or val.startswith("data:"):
            return m.group(0)

        raw = val
        if raw.startswith("/"):
            for s in LOCAL_SLUGS:
                if raw in (f"/vi/{s}", f"/vi/{s}/"):
                    return f'{attr}={quote}{local_product_href(s, slug)}{quote}'
            if raw == "/" or raw == "/vi" or raw == "/vi/":
                return f'{attr}={quote}../../index.html{quote}'
            if any(raw.startswith(f"/{r}") for r in ASSET_ROOTS):
                rel = map_local_asset(raw[1:])
                return f'{attr}={quote}{PREFIX}{rel}{quote}'

        if any(raw.startswith(r) for r in ASSET_ROOTS):
            rel = map_local_asset(raw)
            return f'{attr}={quote}{PREFIX}{rel}{quote}'

        return m.group(0)

    html = re.sub(
        r'(href|src|data-src|content)=(["\'])([^"\']+)\2',
        repl_attr,
        html,
        flags=re.IGNORECASE,
    )

    for s in LOCAL_SLUGS:
        html = html.replace(to_external_url(f"vi/{s}"), local_product_href(s, slug))
        html = html.replace(f"/vi/{s}", local_product_href(s, slug))

    def repl_href(m: re.Match) -> str:
        quote, href = m.group(1), m.group(2)
        if href.startswith(SKIP_LINK_PREFIXES):
            return m.group(0)
        if href in ("index.html", "../../index.html") or href.startswith("../"):
            return m.group(0)
        if href.startswith(PAGE_PREFIXES) or href.endswith(".html"):
            return f'href={quote}{to_external_url(href)}{quote}'
        return m.group(0)

    html = re.sub(r'href=(["\'])([^"\']+)\1', repl_href, html)

    def repl_abs_path(m: re.Match) -> str:
        quote, path = m.group(1), m.group(2)
        for s in LOCAL_SLUGS:
            if path in (f"/vi/{s}", f"/vi/{s}/"):
                return f"href={quote}{local_product_href(s, slug)}{quote}"
        if path.startswith(("/vi/", "/pages/", "/ca-nhan/", "/app/")):
            return f"href={quote}{to_external_url(path.lstrip('/'))}{quote}"
        return m.group(0)

    html = re.sub(r'href=(["\'])(/[^"\']+)\1', repl_abs_path, html)

    for s in LOCAL_SLUGS:
        target = local_product_href(s, slug)
        html = html.replace(f"window.location.href='{to_external_url(f'vi/{s}')}'", f"window.location.href='{target}'")
        html = html.replace(f'window.location.href = "{to_external_url(f"vi/{s}")}"', f'window.location.href = "{target}"')
        html = html.replace(f"window.location.href = '/vi/{s}'", f"window.location.href = '{target}'")

    return html


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


def collect_used_from(paths: list[Path]) -> set[Path]:
    used: set[Path] = set(paths)
    queue = list(paths)
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
            mapped = map_local_asset(ref.lstrip("/") if ref.startswith("../../") else ref)
            if mapped != ref:
                ref = mapped
            resolved = resolve_ref(ref, current)
            if resolved and resolved.is_file():
                if resolved not in used:
                    used.add(resolved)
                    if resolved.suffix.lower() in {".css", ".js", ".html"}:
                        queue.append(resolved)
    return used


def download_missing_assets(paths: set[Path]) -> int:
    downloaded = 0
    for p in sorted(paths):
        if p.is_file():
            continue
        rel = p.relative_to(ROOT).as_posix()
        url = f"{BASE_URL}/{rel}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=60).read()
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
            downloaded += 1
            print(f"  downloaded {rel}")
        except Exception as e:
            print(f"  skip {rel}: {e}")
    return downloaded


def update_index_links() -> None:
    index = ROOT / "index.html"
    text = index.read_text(encoding="utf-8", errors="replace")
    for slug in LOCAL_SLUGS:
        ext = to_external_url(f"vi/{slug}")
        local = f"vi/{slug}/index.html"
        text = text.replace(f'href="{ext}"', f'href="{local}"')
        text = text.replace(f"window.location.href='{ext}'", f"window.location.href='{local}'")
        text = text.replace(f'window.location.href = "{ext}"', f'window.location.href = "{local}"')
    index.write_text(text, encoding="utf-8")


def main() -> None:
    saved: list[Path] = []
    for slug in LOCAL_SLUGS:
        print(f"Fetching vi/{slug}...")
        raw = fetch(f"{BASE_URL}/vi/{slug}")
        html = rewrite_page(raw, slug)
        out = ROOT / "vi" / slug / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html, encoding="utf-8")
        saved.append(out)
        print(f"  saved {out.relative_to(ROOT)} ({len(html)} bytes)")

    print("Updating index.html links...")
    update_index_links()

    print("Collecting required assets...")
    used = collect_used_from(saved + [ROOT / "index.html"])
    missing = {p for p in used if not p.is_file()}
    if missing:
        print(f"Downloading {len(missing)} missing assets...")
        download_missing_assets(missing)
        used = collect_used_from(saved + [ROOT / "index.html"])

    print(f"Done. Product pages: {len(saved)}, assets used: {len(used)}")


if __name__ == "__main__":
    main()
