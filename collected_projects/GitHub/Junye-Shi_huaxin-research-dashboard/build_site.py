#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
华鑫研究看板 —— 静态站点构建脚本

用途
----
把 `source/` 下从 WorkBuddy 资料库导出的原始页面产物，转换为可直接托管的
纯静态站点（仓库根目录 + topics/），并生成 MANIFEST.json 供复现校验。

处理内容
--------
1. 移除平台注入的 `<script src="/page/page_comm/inject.js">`（离线/托管环境下必然 404）
2. 移除平台注入的 `data-page-node-id` / `data-pnid-children` 标注属性（不属于正文内容）
3. 中文文件名 → ASCII 路径，避免托管平台 URL 出现百分号编码
4. 为专题页追加一个「← 返回目录」浮动入口（原始产物之间没有互相导航）
5. 生成 topics/index.html 专题目录页
6. 生成 MANIFEST.json（源文件与产物的大小、SHA-256）

不做的事
--------
- 不改动任何正文文字、数据、图表、样式
- 不引入任何外部依赖（字体、JS、CSS 全部内联或系统字体）

用法
----
    python build_site.py

构建是确定性的：同一份 source/ 每次构建产出逐字节相同的文件（目录页上的构建日期
取自 BUILD_DATE，不取系统时间）。要求 Python 3.8+，仅标准库。
"""

import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "source")
TMP = os.path.join(ROOT, "专题")

# ---------------------------------------------------------------- 文件映射
# (源文件相对 source/ 的路径, 产物相对仓库根的路径, 中文标题, 副标题, 日期)
PAGES = [
    {
        "src": "华鑫研究看板.html",
        "dst": "index.html",
        "title": "华鑫研究看板",
        "subtitle": "华鑫证券电子通信研究 · 板块跟踪与专题索引",
        "date": "2026-10-24",
    },
    {
        "src": "专题/ABF载板行业深度专题_20261022.html",
        "dst": "topics/abf-substrate-20261022.html",
        "title": "ABF 载板：被一张膜锁死的算力地基",
        "subtitle": "2026–2029，缺口从 10% 走向 42%；而全球只有一家公司能决定它有多宽",
        "date": "2026-10-22",
    },
    {
        "src": "专题/玻璃基板行业深度专题_20261021.html",
        "dst": "topics/glass-substrate-20261021.html",
        "title": "玻璃基板：从显示材料到先进封装平台的第二次定价",
        "subtitle": "四条成熟度相差五年以上的赛道，共用同一条原片供应链",
        "date": "2026-10-21",
    },
    {
        "src": "专题/MSAP-PCB行业深度专题_20261021.html",
        "dst": "topics/msap-pcb-20261021.html",
        "title": "MSAP-PCB：改良型半加成法的工艺跃迁与供给刚性",
        "subtitle": "工艺跃迁、供给刚性与价值重分配",
        "date": "2026-10-21",
    },
    {
        "src": "专题/MicroLED行业深度专题_20261021.html",
        "dst": "topics/microled-20261021.html",
        "title": "Micro LED：技术已通、商业未通，定价锚正在迁移",
        "subtitle": "定价锚正从「替代电视」迁向「AR 微显示 + 光互连」",
        "date": "2026-10-21",
    },
    {
        "src": "专题/散热行业深度专题_20261021.html",
        "dst": "topics/thermal-20261021.html",
        "title": "散热：功耗通胀下的热管理重构",
        "subtitle": "光模块散热与芯片散热双主线",
        "date": "2026-10-21",
    },
]

ENTRY = "index.html"
TOPICS_DIR = "topics"

# ---------------------------------------------------------------- 清理规则
RE_INJECT = re.compile(r"<script[^>]*inject\.js[^>]*>\s*</script>\s*", re.I)
RE_NID = re.compile(r'\s+data-page-node-id="[^"]*"')
RE_PNIDC = re.compile(r'\s+data-pnid-children="[^"]*"')

BACKLINK = """
<a href="../index.html" style="position:fixed;left:14px;bottom:14px;z-index:99999;
display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:999px;
background:rgba(20,17,32,.92);border:1px solid #3a3252;color:#d9b264;
font:500 13px/1 -apple-system,"Microsoft YaHei",sans-serif;text-decoration:none;
box-shadow:0 4px 14px rgba(0,0,0,.45);backdrop-filter:blur(6px)">← 返回目录</a>
"""


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def clean_html(raw):
    """剥离平台注入，保留全部正文。"""
    html = RE_INJECT.sub("", raw)
    html = RE_NID.sub("", html)
    html = RE_PNIDC.sub("", html)
    return html


def assert_no_broken_refs(name, html):
    """确认没有残留平台注入 / 指向不存在本地文件的引用。"""
    assert "inject.js" not in html, "%s: 残留 inject.js" % name
    assert "data-page-node-id" not in html, "%s: 残留 data-page-node-id" % name
    for ref in re.findall(r'(?:href|src)="(?!https?:|#|data:|mailto:|//)([^"]+)"', html):
        # JS 模板里拼接出来的属性（如 href="' + esc(i.url) + '"）不是真实引用，跳过
        if re.search(r"[\s'\"+()\[\]{}]", ref):
            continue
        if ref.startswith("..") or ref == ENTRY:
            continue
        target = os.path.normpath(os.path.join(os.path.dirname(os.path.join(ROOT, name)), ref.split("#")[0].split("?")[0]))
        if ref.split("#")[0] and not os.path.exists(target):
            raise AssertionError("%s: 引用不存在的本地文件 %s" % (name, ref))


TOPICS_INDEX = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>行业深度专题 · 华鑫证券电子通信研究</title>
<style>
:root{--bg:#0a0910;--card:#141120;--card2:#1a1628;--line:#241f36;--line2:#3a3252;
--ink:#efeaf9;--ink2:#b3aac9;--dim:#928aa9;--gold:#d9b264;--gold2:#f0cf8e;--purple:#a78bfa;
--ff:"Source Han Sans CN","思源黑体 CN","Microsoft YaHei",sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.7 var(--ff);
-webkit-font-smoothing:antialiased;padding:48px 20px 72px}
.wrap{max-width:960px;margin:0 auto}
.eyebrow{font-size:12px;letter-spacing:.18em;color:var(--gold);text-transform:uppercase;margin-bottom:14px}
h1{margin:0 0 10px;font-size:30px;line-height:1.3;font-weight:600;letter-spacing:.01em}
.lede{margin:0 0 8px;color:var(--ink2);font-size:15px}
.meta{color:var(--dim);font-size:12.5px;margin-bottom:34px}
.meta b{color:var(--gold2);font-weight:500}
.grid{display:grid;gap:13px}
.card{display:block;text-decoration:none;color:inherit;background:var(--card);
border:1px solid var(--line);border-radius:10px;padding:17px 19px;transition:.18s ease}
.card:hover{border-color:var(--line2);background:var(--card2);transform:translateY(-1px)}
.card .d{font:500 11.5px/1 var(--num,"Arial",monospace);color:var(--dim);letter-spacing:.06em}
.card h2{margin:7px 0 6px;font-size:16.5px;font-weight:600;line-height:1.45;color:var(--ink)}
.card:hover h2{color:var(--gold2)}
.card p{margin:0;color:var(--ink2);font-size:13px;line-height:1.6}
.back{display:inline-block;margin-top:30px;color:var(--gold);text-decoration:none;font-size:13.5px;
border-bottom:1px solid transparent}
.back:hover{border-bottom-color:var(--gold)}
footer{margin-top:40px;padding-top:18px;border-top:1px solid var(--line);color:var(--dim);font-size:12px;line-height:1.8}
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">华鑫证券 · 电子通信研究</div>
  <h1>行业深度专题</h1>
  <p class="lede">共 __COUNT__ 篇，均为独立完整页面，可直接打开阅读。</p>
  <p class="meta">构建时间 <b>__BUILD__</b> · 静态离线版</p>
  <div class="grid">
__CARDS__
  </div>
  <a class="back" href="../index.html">← 返回华鑫研究看板</a>
  <footer>
    本页为研究看板的静态归档版本，内容仅供研究参考，不构成投资建议。<br>
    数据与观点以原始发布时点为准，可能存在滞后。
  </footer>
</div>
</body>
</html>
"""

CARD = """    <a class="card" href="__HREF__">
      <div class="d">__DATE__</div>
      <h2>__TITLE__</h2>
      <p>__SUBTITLE__</p>
    </a>"""


def render_topics_index(build_date):
    cards = []
    for p in PAGES:
        if p["dst"] == ENTRY:
            continue
        cards.append(
            CARD.replace("__HREF__", os.path.basename(p["dst"]))
            .replace("__DATE__", p["date"])
            .replace("__TITLE__", p["title"])
            .replace("__SUBTITLE__", p["subtitle"])
        )
    return (
        TOPICS_INDEX.replace("__CARDS__", "\n".join(cards))
        .replace("__COUNT__", str(len(cards)))
        .replace("__BUILD__", build_date)
    )


def build():
    if not os.path.isdir(SRC):
        sys.exit("找不到 source/ 目录，请把资料库导出的原始 HTML 放进 source/")

    os.makedirs(os.path.join(ROOT, TOPICS_DIR), exist_ok=True)
    manifest = {"generated_by": "build_site.py", "source": [], "output": []}

    for p in PAGES:
        sp = os.path.join(SRC, p["src"].replace("/", os.sep))
        if not os.path.exists(sp):
            sys.exit("缺少源文件: %s" % p["src"])
        raw = open(sp, encoding="utf-8").read()
        html = clean_html(raw)
        if p["dst"] != ENTRY:
            html = html.replace("</body>", BACKLINK + "</body>", 1)

        dp = os.path.join(ROOT, p["dst"].replace("/", os.sep))
        os.makedirs(os.path.dirname(dp), exist_ok=True)
        with open(dp, "w", encoding="utf-8", newline="\n") as f:
            f.write(html)

        assert_no_broken_refs(p["dst"], html)
        manifest["source"].append(
            {"path": p["src"], "bytes": len(raw.encode("utf-8")), "sha256": sha256(sp)}
        )
        manifest["output"].append(
            {
                "path": p["dst"],
                "bytes": len(html.encode("utf-8")),
                "sha256": sha256(dp),
                "title": p["title"],
            }
        )
        print("  %-46s -> %-40s %7.1f KB" % (p["src"], p["dst"], len(html.encode("utf-8")) / 1024))

    build_date = open(os.path.join(ROOT, "BUILD_DATE"), encoding="utf-8").read().strip() \
        if os.path.exists(os.path.join(ROOT, "BUILD_DATE")) else "2026-10-24"
    tp = os.path.join(ROOT, TOPICS_DIR, "index.html")
    with open(tp, "w", encoding="utf-8", newline="\n") as f:
        f.write(render_topics_index(build_date))
    manifest["output"].append(
        {"path": "topics/index.html", "bytes": os.path.getsize(tp), "sha256": sha256(tp),
         "title": "行业深度专题（目录页）"}
    )
    print("  %-46s -> %-40s %7.1f KB" % ("(生成)", "topics/index.html", os.path.getsize(tp) / 1024))

    total = sum(o["bytes"] for o in manifest["output"])
    manifest["total_output_bytes"] = total
    with open(os.path.join(ROOT, "MANIFEST.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("\n产物合计 %.2f MB，清单已写入 MANIFEST.json" % (total / 1024 / 1024))


if __name__ == "__main__":
    build()
