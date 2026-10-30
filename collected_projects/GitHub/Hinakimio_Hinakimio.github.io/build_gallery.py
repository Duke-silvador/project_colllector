#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
雛希みおの喫茶店 · 画廊生成器

用法：
  1. 把图片丢进 works/ 文件夹
  2. 双击本目录的「更新画廊.bat」
  3. 刷新浏览器

命名约定（推荐，不遵守也能用）：
  分类_标题.png         例：插画_哥特洛丽塔回眸.png
  分类是：插画 / 角色设定图 / 其他
  没写分类的图会归到「其他」，标题用文件名
"""
import os, json, re, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
WORKS = os.path.join(HERE, 'works')
THUMBS = os.path.join(HERE, 'thumbs')
DATA = os.path.join(HERE, 'data')
EXTS = ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp')

for d in (WORKS, THUMBS, DATA):
    os.makedirs(d, exist_ok=True)

KNOWN_CATS = ['插画', '角色设定图', '其他']

def sort_key(f):
    """按文件名里的数字排序，没有数字就排后面"""
    m = re.search(r'(\d+)', f)
    return (0, int(m.group(1)), f) if m else (1, 0, f)

files = sorted([f for f in os.listdir(WORKS) if f.lower().endswith(EXTS)], key=sort_key)
print('发现 %d 张作品' % len(files))

items = []
for f in files:
    stem = os.path.splitext(f)[0]
    # 解析「分类_标题」
    if '_' in stem:
        head, tail = stem.split('_', 1)
        cat = head if head in KNOWN_CATS else '其他'
        title = tail if head in KNOWN_CATS else stem
    else:
        cat, title = '其他', stem

    src = os.path.join(WORKS, f)
    thumb = os.path.join(THUMBS, stem + '.jpg')
    try:
        with Image.open(src) as im:
            w, h = im.size
            im = im.convert('RGB')
            im.thumbnail((640, 640), Image.LANCZOS)
            im.save(thumb, 'JPEG', quality=86)
    except Exception as e:
        print('  跳过（无法读取）: %s  %s' % (f, e))
        continue

    items.append({
        'id': stem, 'cat': cat, 'title': title, 'sub': '',
        'file': 'works/' + f, 'thumb': 'thumbs/' + stem + '.jpg',
        'w': w, 'h': h,
        'date': time.strftime('%Y-%m-%d', time.localtime(os.path.getmtime(src))),
    })
    print('  ✓ [%s] %s' % (cat, title))

json.dump(items, open(os.path.join(DATA, 'items.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)

# 把数据灌进 index.html
idx = os.path.join(HERE, 'index.html')
html = open(idx, encoding='utf-8').read()
new = re.sub(r'const DATA = \[.*?\];\n', 'const DATA = %s;\n' % json.dumps(items, ensure_ascii=False),
             html, count=1, flags=re.S)
open(idx, 'w', encoding='utf-8').write(new)

# 清掉孤儿缩略图
keep = {i['id'] + '.jpg' for i in items}
for f in os.listdir(THUMBS):
    if f not in keep:
        try:
            os.remove(os.path.join(THUMBS, f))
        except Exception:
            pass

print()
print('完成：%d 张作品已写入画廊' % len(items))
from collections import Counter
print('分类：%s' % dict(Counter(i['cat'] for i in items)))
print('刷新浏览器即可看到。')
