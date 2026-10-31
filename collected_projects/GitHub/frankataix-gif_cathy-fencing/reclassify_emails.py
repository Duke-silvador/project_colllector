#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""根据 cathy_data/email_rules.json 重新分类历史邮件。

用法：
    python reclassify_emails.py

规则文件格式（JSON）：
{
  "version": "2026-09-11",
  "rules": {
    "击剑": ["@usafencing", "usafencing.org"],
    "学校": ["meadowridge.bc.ca", "meadowridge"]
  }
}
"""
import json
import re
from pathlib import Path


def load_rules(repo):
    path = repo / 'cathy_data' / 'email_rules.json'
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        return data.get('rules', {})
    except Exception:
        return {}


def keyword_classify(text, rules):
    combined = text.lower()
    for category, keywords in rules.items():
        if not isinstance(keywords, list):
            continue
        for k in keywords:
            if str(k).lower() in combined:
                return category
    return None


def reclassify_emails(path, rules):
    text = Path(path).read_text(encoding='utf-8')
    # 按单独成行的 ## 分割
    parts = re.split(r'\n(?=## )', text)
    if len(parts) < 2:
        return 0
    header = parts[0]
    entries = parts[1:]
    changed = 0
    new_entries = []
    for entry in entries:
        lines = entry.splitlines()
        if not lines:
            new_entries.append(entry)
            continue
        # 去掉标题行的 ## 前缀
        title_line = lines[0].lstrip('#').strip()
        if not title_line.startswith('['):
            new_entries.append(entry)
            continue
        m = re.match(r'^\[([^\]]+)\]\s*(.*)', title_line)
        if not m:
            new_entries.append(entry)
            continue
        old_category = m.group(1)
        subject = m.group(2)
        # 收集用于判断的文本
        meta_text = [subject]
        body_start = 0
        for i, line in enumerate(lines):
            if line.startswith('**发件人:**'):
                meta_text.append(line.replace('**发件人:**', '').strip())
            elif line.startswith('**摘要:**'):
                meta_text.append(line.replace('**摘要:**', '').strip())
            elif line.startswith('**待办:**'):
                meta_text.append(line.replace('**待办:**', '').strip())
            elif body_start == 0 and not line.startswith('**'):
                body_start = i
        meta_text.append('\n'.join(lines[body_start:body_start+20]))
        combined_text = ' '.join(meta_text)
        new_category = keyword_classify(combined_text, rules)
        if new_category and new_category != old_category:
            lines[0] = f'## [{new_category}] {subject}'
            changed += 1
        else:
            lines[0] = f'## [{old_category}] {subject}'
        new_entries.append('\n'.join(lines))
    new_text = header + ''.join(['\n' + e for e in new_entries])
    Path(path).write_text(new_text, encoding='utf-8')
    return changed


if __name__ == '__main__':
    repo = Path(__file__).parent
    rules = load_rules(repo)
    if not rules:
        print('未找到 cathy_data/email_rules.json 或规则为空，跳过。')
    else:
        path = repo / 'cathy_data' / 'emails.md'
        changed = reclassify_emails(path, rules)
        print(f'已重新分类 {changed} 封邮件：{path}')
