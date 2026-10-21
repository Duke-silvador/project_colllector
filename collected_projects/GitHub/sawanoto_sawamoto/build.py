"""Build the public, static GitHub Pages site from reviewed content files."""
from __future__ import annotations

import html
import json
import os
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape as xml_escape

import markdown

from kigo import load_kigo

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
OUT = ROOT / "dist"
BASE = os.environ.get("SITE_BASE_PATH", "/sawamoto/")
if not BASE.startswith("/") or not BASE.endswith("/") or ".." in BASE:
    raise ValueError("SITE_BASE_PATH must be an absolute URL path ending in /")
ORIGIN = "https://sawanoto.github.io"
SITE = json.loads((CONTENT / "site.json").read_text(encoding="utf-8"))
TIMELINE = json.loads((CONTENT / "timeline.json").read_text(encoding="utf-8"))
BOOKS = json.loads((CONTENT / "books.json").read_text(encoding="utf-8"))
SERIES = json.loads((CONTENT / "series.json").read_text(encoding="utf-8"))


def e(value: object) -> str:
    return html.escape(str(value), quote=True)


def safe_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise ValueError(f"Only absolute HTTP(S) links are allowed: {value}")
    return e(value)


def external(label: str, url: str) -> str:
    return f'<a href="{safe_url(url)}" target="_blank" rel="noopener noreferrer">{e(label)} <span aria-hidden="true">↗</span></a>'


def local(path: str) -> str:
    return BASE + path


def image_url(value: str) -> str:
    if value.startswith("https://") or value.startswith("http://"):
        return safe_url(value)
    if value.startswith("assets/") and ".." not in value:
        return local(value)
    raise ValueError(f"Use a public assets/ path or HTTP(S) image URL: {value}")


def data_files(folder: str) -> list[dict]:
    items = []
    for file in sorted((CONTENT / folder).glob("*.md")):
        raw = file.read_text(encoding="utf-8")
        match = re.match(r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z", raw, re.S)
        if not match:
            raise ValueError(f"Missing JSON front matter: {file}")
        item = json.loads(match.group(1))
        if "draft" in item and type(item["draft"]) is not bool:
            raise ValueError(f"draft must be a JSON boolean: {file}")
        if item.get("draft", False):
            continue
        item["body"] = match.group(2)
        item["slug"] = file.stem
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item["slug"]):
            raise ValueError(f"Use an ASCII slug: {file}")
        items.append(item)
    return items


WORKS = data_files("works")
WRITING = data_files("writing")
series_by_id = {x["id"]: x for x in SERIES}
work_by_id = {x["id"]: x for x in WORKS}
article_by_id = {x["id"]: x for x in WRITING}
timeline_by_id = {x["id"]: x for x in TIMELINE}
for items in (WORKS, WRITING, TIMELINE):
    if len({x["id"] for x in items}) != len(items):
        raise ValueError("Duplicate content ID")
for item in TIMELINE:
    if item.get("importance") not in {"major", "medium", "minor"}:
        raise ValueError(f"Invalid timeline importance: {item['id']}")
    if "date" in item and not re.fullmatch(r"\d{4}(?:-(?:0[1-9]|1[0-2]))?", item["date"]):
        raise ValueError(f"Timeline date must be YYYY or YYYY-MM: {item['id']}")
if len(series_by_id) != len(SERIES):
    raise ValueError("Duplicate series ID")
if {x["slug"] for x in SERIES} & {x["slug"] for x in WRITING}:
    raise ValueError("Series and article slugs must be distinct")
for series in SERIES:
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", series["slug"]):
        raise ValueError(f"Use an ASCII series slug: {series['slug']}")
for item in WRITING:
    if item.get("series_id") and item["series_id"] not in series_by_id:
        raise ValueError(f"Unknown series ID: {item['series_id']}")
    if item.get("series_id") and not all(item.get(x) for x in ("visit_date", "center", "activity")):
        raise ValueError(f"Series article needs visit_date, center and activity: {item['slug']}")


def related(ids: list[str], collection: dict, section: str) -> str:
    links = []
    for id_ in ids:
        if id_ not in collection:
            raise ValueError(f"Unknown related ID: {id_}")
        item = collection[id_]
        href = local(f"{section}/{item['slug']}/") if section != "about" else local(f"about/#timeline-{e(id_)}")
        links.append(f'<li><a href="{href}">{e(item["title"])}</a></li>')
    return '<ul class="link-list">' + "".join(links) + "</ul>" if links else ""


def page(title: str, description: str, path: str, body: str) -> str:
    full_title = f"{title} | {SITE['name']}" if title else f"{SITE['name']} / {SITE['name_en']}"
    url = ORIGIN + local(path)
    nav = [("Home", ""), ("About", "about/"), ("Works", "works/"), ("Writing", "writing/")]
    if BOOKS:
        nav.append(("Books", "books/"))
    nav_html = "".join(f'<a href="{local(p)}" {"aria-current=\"page\"" if p == path else ""}>{label}</a>' for label, p in nav)
    kigo_assets = (f'<link rel="stylesheet" href="{local("assets/kigo.css")}">'
                   f'<script src="{local("assets/kigo.js")}" defer></script>') if path == "" else ""
    timeline_script = f'<script src="{local("assets/timeline.js")}" defer></script>' if path == "about/" else ""
    seasonal_mark = '<span class="seasonal-mark" hidden aria-hidden="true"></span>'
    if path == "":
        seasonal_mark = f'<div class="brand-seasonal">{seasonal_mark}{kigo_widget()}</div>'
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Google tag (gtag.js): config sends one page_view per document load. -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-V2C8N1DQLS"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-V2C8N1DQLS');
</script>
<meta name="theme-color" content="#f8f7f3"><title>{e(full_title)}</title><meta name="description" content="{e(description)}">
<link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:locale" content="ja_JP">
<meta property="og:title" content="{e(full_title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{url}">
<meta property="og:site_name" content="{e(SITE['name'])}"><link rel="stylesheet" href="{local('assets/style.css')}">
<link rel="stylesheet" href="{local('assets/seasonal.css')}"><script src="{local('assets/seasonal.js')}" defer></script>
{kigo_assets}{timeline_script}</head><body><a class="skip" href="#main">本文へ移動</a><div class="shell"><header class="header">
<div class="brand-lockup"><a class="brand" href="{local('')}">{e(SITE['name'])}<small>{e(SITE['name_en'])}</small></a>{seasonal_mark}</div>
<nav aria-label="メインナビゲーション">{nav_html}</nav></header><main id="main">{body}</main>
<footer class="footer"><span>{e(SITE['name'])} / {e(SITE['name_en'])}</span><a href="#main">上へ戻る ↑</a></footer></div></body></html>'''


def kigo_widget() -> str:
    # Embed validated local data; no runtime fetch, API or third-party service.
    data = json.dumps(load_kigo(CONTENT / "kigo.json"), ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return f'''<aside class="daily-kigo" aria-label="今日の季語" hidden>
    <details><summary title="今日の季語を読む"><span class="kigo-label">今日の季語：</span>
    <span class="kigo-term" data-kigo="term"></span></summary>
    <div class="kigo-detail"><p class="kigo-detail-label">今日の季語</p><time></time>
    <p class="kigo-detail-term" data-kigo="term"></p><p class="kigo-reading" data-kigo="reading"></p>
    <dl><dt>季節</dt><dd data-kigo="season"></dd>
    <dt>意味・由来</dt><dd data-kigo="summary"></dd><dt>言葉の情景</dt><dd data-kigo="scene"></dd></dl>
    <p class="kigo-source"><a data-kigo="source" href="https://kigosai.sub.jp/kigoken3.html" target="_blank" rel="noopener noreferrer">参考：きごさい歳時記 ↗</a></p>
    <button class="kigo-close" type="button">閉じる</button></div></details></aside>
    <script id="kigo-data" type="application/json">{data}</script>
'''


def write(path: str, content: str) -> None:
    file = OUT / path / "index.html"
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content, encoding="utf-8")


def card(item: dict, section: str) -> str:
    href = local(f"{section}/{item['slug']}/")
    image = f'<a class="card-image" href="{href}"><img src="{image_url(item["thumbnail"])}" alt="{e(item.get("thumbnail_alt", ""))}" loading="lazy"></a>' if item.get("thumbnail") else ""
    card_class = ("card card-writing-image" if section == "writing" else "card") if image else "card card-text"
    meta = " · ".join(e(value) for value in [item.get("period", item.get("date", "")), item.get("category", "")] if value)
    count = f'<p class="meta">作品数：{e(item["work_count"])}</p>' if item.get("work_count") else ""
    return f'<article class="{card_class}">{image}<div class="card-body"><p class="meta">{meta}</p><h3><a href="{href}">{e(item["title"])}</a></h3><p>{e(item.get("list_summary", item.get("summary", "")))}</p>{count}</div></article>'


def youtube_frame(video_id: str, title: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise ValueError(f"Invalid YouTube ID: {video_id}")
    return f'<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/{video_id}" title="{e(title)}の動画" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>'


def interactive_work(url: str, title: str) -> str:
    parsed = urlparse(url)
    if (parsed.scheme, parsed.netloc) != ("https", "sawanoto.github.io") or not parsed.path.startswith("/LifeSketch/"):
        raise ValueError(f"LifeSketch embed must use the public LifeSketch URL: {url}")
    return (
        '<div class="interactive-placeholder" data-interactive-url="' + e(url) + '" data-interactive-title="' + e(title) + '">'
        '<p>作品をページ内で遊べます。読み込み後、作品内のパイプをタップすると音が鳴ります。</p>'
        '<button class="interactive-activate" type="button">作品を読み込む</button>'
        '</div><script src="' + local("assets/interactive-embed.js") + '" defer></script>'
    )


def project_videos(videos: list[dict]) -> str:
    if not videos:
        return ""
    sections = []
    for index, video in enumerate(videos):
        label = "代表動画" if index == 0 else "関連動画"
        note = f'<p class="video-note">{e(video["note"])}</p>' if video.get("note") else ""
        video_id = video["youtube_id"]
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
            raise ValueError(f"Invalid YouTube ID: {video_id}")
        if video.get("availability_note"):
            player = f'<p class="video-unavailable">{e(video["availability_note"])}</p>'
        elif index == 0:
            player = youtube_frame(video_id, video["title"])
        else:
            player = f'<div class="video-frame video-placeholder"><button class="video-activate" type="button" data-youtube-id="{video_id}" data-video-title="{e(video["title"])}の動画" aria-label="{e(video["title"])}を読み込む"><span aria-hidden="true">▶</span> 動画を読み込む</button></div>'
        link_label = "YouTubeで公開状態を確認" if video.get("availability_note") else "YouTubeで動画を開く"
        sections.append(f'<section class="project-video"><p class="kicker">{label} / {index + 1:02d}</p><h3>{e(video["title"])}</h3><p>{e(video.get("description", ""))}</p>{note}{player}<p class="outbound">{external(link_label, video["url"])}</p></section>')
    script = f'<script src="{local("assets/video-embed.js")}" defer></script>'
    return '<section class="project-videos" aria-labelledby="project-videos-title"><h2 id="project-videos-title">プロジェクトの動画</h2>' + "".join(sections) + "</section>" + script


def featured_links(links: list[dict]) -> str:
    if not links:
        return ""
    cards = "".join(f'<li><a href="{safe_url(link["url"])}" target="_blank" rel="noopener noreferrer"><strong>{e(link["label"])}</strong><span>{e(link["description"])}</span><span aria-hidden="true">↗</span></a></li>' for link in links)
    return '<section class="gallery-links" aria-label="作品ギャラリー"><ul>' + cards + "</ul></section>"


def highlights(items: list[dict]) -> str:
    if not items:
        return ""
    cards = "".join(f'<li><p class="kicker">{e(item["series"])}</p><h3>{e(item["title"])}</h3><p>{e(item["description"])}</p></li>' for item in items)
    return '<section class="work-highlights" aria-labelledby="work-highlights-title"><h2 id="work-highlights-title">代表的な作品</h2><ul>' + cards + "</ul></section>"


def section_head(kicker: str, title: str, path: str = "") -> str:
    link = f'<a class="text-link" href="{local(path)}">一覧を見る <span aria-hidden="true">→</span></a>' if path else ""
    return f'<div class="section-head"><div><p class="kicker">{e(kicker)}</p><h2>{e(title)}</h2></div>{link}</div>'


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    shutil.copy(ROOT / "assets" / "style.css", OUT / "assets" / "style.css")
    for asset in (ROOT / "assets").rglob("*"):
        if asset.is_file() and asset.name != "style.css":
            target = OUT / "assets" / asset.relative_to(ROOT / "assets")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(asset, target)
    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    verification_file = "google9f55b9147023d4f7.html"
    shutil.copyfile(ROOT / verification_file, OUT / verification_file)

    recent_works = sorted(WORKS, key=lambda x: x.get("sort", x.get("date", "")), reverse=True)[:3]
    recent_articles = sorted(WRITING, key=lambda x: x.get("published", ""), reverse=True)[:3]
    works_home = "".join(card(x, "works") for x in recent_works) if recent_works else '<p class="empty">公開できる制作物を準備中です。</p>'
    writing_home = "".join(card(x, "writing") for x in recent_articles) if recent_articles else '<p class="empty">記事を準備中です。</p>'
    sketch_links = work_by_id["sketches-of-sound-and-movement"].get("featured_links", [])
    life_links = work_by_id["lifesketch-doremi-pipes"].get("featured_links", [])
    home_links = [link for link in sketch_links if "MovingSketch" in link["label"]] + life_links
    home_galleries = featured_links(home_links)
    about_galleries = featured_links(sketch_links + life_links)
    support = SITE.get("support")
    support_html = f'''<section class="support-section" aria-labelledby="support-title"><h2 id="support-title">{e(support["title"])}</h2>
    <p>{e(support["description"])}</p><p>{e(support["note"])}</p>
    <a class="button" href="{safe_url(support["url"])}" target="_blank" rel="noopener noreferrer">{e(support["label"])} <span aria-hidden="true">↗</span></a>
    <p class="support-external">外部サイトを新しいタブで開きます。</p></section>''' if support else ""
    home = f'''<section class="hero"><p class="kicker">Personal site</p><h1>{e(SITE['name'])}<span>{e(SITE['name_en'])}</span></h1>
    <p class="lead">{e(SITE['description'])}</p><p class="intro">{e(SITE['intro'])}</p>
    {home_galleries}
    <a class="button" href="{local('about/')}">澤本優哉について <span aria-hidden="true">→</span></a></section>
    <section class="home-section">{section_head('01 / Writing', '文章・考察', 'writing/')}<div class="card-grid">{writing_home}</div></section>
    <section class="home-section">{section_head('02 / Works', '制作物', 'works/')}<div class="card-grid">{works_home}</div></section>
    <section class="home-section">{section_head('03 / About', 'これまでの活動', 'about/#timeline')}<p class="section-copy">活動の記録は、時期や公開範囲を確認しながら年表に加えていきます。</p></section>{support_html}'''
    write("", page("", SITE["description"], "", home))

    timeline_parts = []
    importance_labels = {"major": "大", "medium": "中", "minor": "小"}
    for item in sorted(TIMELINE, key=lambda x: x.get("order", 0), reverse=True):
        links = related(item.get("work_ids", []), work_by_id, "works") + related(item.get("article_ids", []), article_by_id, "writing")
        importance = item["importance"]
        timeline_parts.append(f'<li id="timeline-{e(item["id"])}" class="timeline-item timeline-{importance}" data-importance="{importance}"><span class="meta">{e(item.get("period", ""))}<span class="importance-label">{importance_labels[importance]}</span></span><div><h3>{e(item["title"])}</h3><p>{e(item.get("summary", ""))}</p>{links}</div></li>')
    timeline_controls = '''<div class="timeline-controls" aria-label="年表の表示範囲" hidden>
    <span>表示する項目</span><div class="timeline-options" role="group" aria-label="重要度で絞り込む">
    <button type="button" data-timeline-filter="major" aria-pressed="false">大のみ</button>
    <button type="button" data-timeline-filter="medium" aria-pressed="true">大・中</button>
    <button type="button" data-timeline-filter="all" aria-pressed="false">すべて</button></div></div>'''
    timeline_html = timeline_controls + '<ol class="timeline">' + "".join(timeline_parts) + "</ol>" if timeline_parts else '<p class="empty">公開する記録を確認中です。</p>'
    social = '<ul class="link-list">' + "".join(f'<li>{external(x["label"], x["url"])}</li>' for x in SITE.get("links", [])) + "</ul>" if SITE.get("links") else '<p class="empty">公開中の外部リンクはありません。</p>'
    likes = "".join(f'<li>{e(x)}</li>' for x in SITE.get("likes", []))
    interests = "".join(f'<li>{e(x)}</li>' for x in SITE.get("interests", []))
    hobby_groups = []
    for group in SITE.get("hobbies", []):
        items = "".join(f'<li>{e(item)}</li>' for item in group["items"])
        hobby_groups.append(f'<div class="hobby-group"><h3>{e(group["category"])}</h3><ul class="chips">{items}</ul></div>')
    hobbies = f'<section class="content-section" id="hobbies">{section_head("Hobbies", "趣味")}<p class="section-copy">現在楽しんでいることや、過去に取り組んだこと。</p><div class="hobby-grid">{"".join(hobby_groups)}</div></section>' if hobby_groups else ""
    qualification_groups = []
    for group in SITE.get("qualifications", []):
        items = "".join(f'<li>{e(item)}</li>' for item in group["items"])
        qualification_groups.append(f'<div class="hobby-group"><h3>{e(group["category"])}</h3><ul class="chips">{items}</ul></div>')
    qualifications = f'<section class="content-section" id="qualifications">{section_head("Qualifications", "資格・検定")}<div class="hobby-grid">{"".join(qualification_groups)}</div></section>' if qualification_groups else ""
    about = f'''<div class="page-heading"><p class="kicker">About</p><h1>澤本優哉について</h1><p>{e(SITE['about'])}</p></div>
    <section class="content-section" id="likes">{section_head('Favorites', '好きなもの')}<ul class="chips">{likes}</ul>
    <div class="hobby-group about-daily-life" id="daily-life"><h3>普段の過ごし方</h3><p class="section-copy">{e(SITE.get('daily_life', ''))}</p></div></section>
    <section class="content-section" id="interests">{section_head('Interests', '最近気になっていること')}<ul class="chips">{interests}</ul></section>
    {hobbies}
    <section class="content-section" id="timeline">{section_head('Timeline', '活動の記録')}{timeline_html}</section>
    <section class="content-section">{section_head('Elsewhere', '外部リンク')}{about_galleries}{social}</section>
    {qualifications}'''
    write("about", page("About", "澤本優哉のプロフィールと活動の記録。", "about/", about))

    works_list = "".join(card(x, "works") for x in sorted(WORKS, key=lambda x: x.get("sort", ""), reverse=True)) if WORKS else '<p class="empty">公開できる制作物を準備中です。作品を確認後、ここに追加します。</p>'
    write("works", page("Works", "澤本優哉の制作物。", "works/", f'<div class="page-heading"><p class="kicker">Works</p><h1>制作物</h1><p>形式や時期を問わず、公開できる作品を掲載します。</p></div><div class="card-grid listing">{works_list}</div>'))
    for item in WORKS:
        youtube_id = item.get("youtube_id")
        if item.get("videos"):
            media = ""
            link = ""
        elif item.get("interactive_url"):
            media = interactive_work(item["interactive_url"], item["title"])
            link = f'<p class="outbound">{external("作品を別のページで開く", item["url"])}</p>'
        elif youtube_id:
            media = youtube_frame(youtube_id, item["title"])
            link = f'<p class="outbound">{external("YouTubeで動画を開く", item["url"])}</p>' if item.get("url") else ""
        else:
            media = f'<figure class="feature-image"><img src="{image_url(item["thumbnail"])}" alt="{e(item.get("thumbnail_alt", ""))}"></figure>' if item.get("thumbnail") else ""
            link = f'<p class="outbound">{external("作品を見る", item["url"])}</p>' if item.get("url") else ""
        facts = [("制作時期", "period"), ("カテゴリ", "category"), ("作品数", "work_count"), ("関連組織", "organization"), ("動画の長さ", "duration"), ("使用ソフト", "software"), ("担当", "role")]
        facts_html = "".join(f'<div><dt>{label}</dt><dd>{e(item[key])}</dd></div>' for label, key in facts if item.get(key))
        info = f'<dl class="work-facts">{facts_html}</dl>' if facts_html else ""
        video_gallery = project_videos(item.get("videos", []))
        gallery_links = featured_links(item.get("featured_links", []))
        work_highlights = highlights(item.get("highlights", []))
        article_links = related(item.get("article_ids", []), article_by_id, "writing")
        timeline_links = related(item.get("timeline_ids", []), timeline_by_id, "about")
        related_html = f'<aside class="related"><h2>関連する記録</h2>{article_links}{timeline_links}</aside>' if article_links or timeline_links else ""
        body = markdown.markdown(item["body"], extensions=["extra", "sane_lists"])
        heading_meta = " · ".join(e(value) for value in [item.get("period", ""), item.get("category", "")] if value)
        detail = f'<div class="detail-heading"><a class="back" href="{local("works/")}">← Works</a><p class="meta">{heading_meta}</p><h1>{e(item["title"])}</h1><p class="lead">{e(item.get("summary", ""))}</p></div>{gallery_links}{media}{link}{info}{video_gallery}<article class="prose">{body}</article>{work_highlights}{related_html}'
        write(f'works/{item["slug"]}', page(item["title"], item.get("summary", ""), f'works/{item["slug"]}/', detail))

    writing_list = "".join(card(x, "writing") for x in sorted(WRITING, key=lambda x: x.get("published", ""), reverse=True)) if WRITING else '<p class="empty">公開する記事を準備中です。</p>'
    series_links = "".join(f'<li><a href="{local(f"writing/{series["slug"]}/")}"><strong>{e(series["title"])}</strong><span>{e(series["description"])}</span><span aria-hidden="true">→</span></a></li>' for series in SERIES if any(x.get("series_id") == series["id"] for x in WRITING))
    series_html = f'<section class="writing-series"><h2>連載</h2><ul>{series_links}</ul></section>' if series_links else ""
    write("writing", page("Writing", "澤本優哉の文章と考察。", "writing/", f'<div class="page-heading"><p class="kicker">Writing</p><h1>文章・考察</h1><p>制作の記録や、日々考えたことを文章で残します。</p></div>{series_html}<div class="card-grid listing">{writing_list}</div>'))
    for series in SERIES:
        entries = sorted((x for x in WRITING if x.get("series_id") == series["id"]), key=lambda x: x.get("visit_date", x.get("published", "")), reverse=True)
        if not entries:
            continue
        rows = "".join(f'<li><p class="meta">{e(item.get("visit_date", ""))} · {e(item.get("center", ""))}</p><h2><a href="{local(f"writing/{item["slug"]}/")}">{e(item.get("activity", item["title"]))}</a></h2><p>{e(item.get("summary", ""))}</p></li>' for item in entries)
        series_body = f'<div class="page-heading"><a class="back" href="{local("writing/")}">← Writing</a><p class="kicker">Series</p><h1>{e(series["title"])}</h1><p>{e(series["description"])}</p></div><ol class="series-list">{rows}</ol>'
        write(f'writing/{series["slug"]}', page(series["title"], series["description"], f'writing/{series["slug"]}/', series_body))
    for item in WRITING:
        body = markdown.markdown(item["body"], extensions=["extra", "sane_lists"])
        if item.get("interactive_url"):
            if body.count("<!-- interactive-work -->") != 1:
                raise ValueError(f"Place one interactive-work marker in: {item['slug']}")
            body = body.replace("<!-- interactive-work -->", interactive_work(item["interactive_url"], item["title"]))
        gallery_items = item.get("gallery_images", [])
        if gallery_items:
            gallery = "".join(f'<figure><img src="{image_url(photo["src"])}" alt="{e(photo["alt"])}" loading="lazy"><figcaption>{e(photo["caption"])}</figcaption></figure>' for photo in gallery_items)
            gallery_html = f'<section class="article-gallery" aria-label="制作物の写真">{gallery}</section>'
            if body.count("<!-- image-gallery -->") != 1:
                raise ValueError(f"Place one image-gallery marker in: {item['slug']}")
            body = body.replace("<!-- image-gallery -->", gallery_html)
        tags = "".join(f'<li>{e(t)}</li>' for t in item.get("tags", []))
        updated = f' · 更新 {e(item["updated"])}' if item.get("updated") else ""
        related_works = related(item.get("work_ids", []), work_by_id, "works")
        related_articles = related(item.get("article_ids", []), article_by_id, "writing")
        hero = f'<figure class="article-hero"><img src="{image_url(item["hero_image"])}" alt="{e(item.get("hero_image_alt", ""))}"><figcaption>{e(item.get("hero_caption", ""))}</figcaption></figure>' if item.get("hero_image") else ""
        related_html = f'<aside class="related"><h2>関連する記事・作品</h2>{related_articles}{related_works}</aside>' if related_articles or related_works else ""
        series = series_by_id.get(item.get("series_id"))
        back_path = f'writing/{series["slug"]}/' if series else 'writing/'
        back_label = series["title"] if series else 'Writing'
        visit_facts = f'<dl class="work-facts visit-facts"><div><dt>訪問日</dt><dd>{e(item["visit_date"])}</dd></div><div><dt>場所</dt><dd>{e(item["center"])}</dd></div><div><dt>活動</dt><dd>{e(item["activity"])}</dd></div></dl>' if series and all(item.get(x) for x in ("visit_date", "center", "activity")) else ""
        detail = f'<div class="detail-heading"><a class="back" href="{local(back_path)}">← {e(back_label)}</a><p class="meta">{e(item.get("published", ""))}{updated} · {e(item.get("category", ""))} · {e(item.get("period", ""))}</p><h1>{e(item["title"])}</h1><p class="lead">{e(item.get("summary", ""))}</p><ul class="chips">{tags}</ul></div>{hero}{visit_facts}<article class="prose">{body}</article>{related_html}'
        write(f'writing/{item["slug"]}', page(item.get("seo_title", item["title"]), item.get("meta_description", item.get("summary", "")), f'writing/{item["slug"]}/', detail))

    # Books stays off the navigation until a real, approved item is added.
    if BOOKS:
        cards = "".join(f'<article class="book"><h2>{e(x["title"])}</h2><p>{e(x.get("summary", ""))}</p>{external("販売ページ", x["url"])}</article>' for x in BOOKS)
        write("books", page("Books", "澤本優哉の書籍と販売作品。", "books/", f'<div class="page-heading"><p class="kicker">Books</p><h1>書籍・販売</h1></div>{cards}'))

    # Use pages actually written to dist, so the sitemap cannot list missing pages.
    paths = []
    for file in sorted(OUT.rglob("index.html")):
        folder = file.relative_to(OUT).parent.as_posix()
        paths.append("" if folder == "." else f"{folder}/")
    urls = "".join(f'<url><loc>{xml_escape(ORIGIN + local(x))}</loc></url>' for x in paths)
    (OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>', encoding="utf-8")
    (OUT / "robots.txt").write_text(f'User-agent: *\nAllow: /\nSitemap: {ORIGIN + local("sitemap.xml")}\n', encoding="utf-8")


if __name__ == "__main__":
    build()
    print(f"Built {len(list(OUT.rglob('index.html')))} pages in {OUT}")
