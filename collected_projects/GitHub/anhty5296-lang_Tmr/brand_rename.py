from pathlib import Path
import re

root = Path(__file__).resolve().parent
old = root / 'configs' / 'shared' / 'fecredit-design-tokens.css'
new = root / 'configs' / 'shared' / 'mcredit-design-tokens.css'
if old.exists():
    old.rename(new)
    print('RENAMED design tokens css')
elif new.exists():
    print('ALREADY RENAMED design tokens css')
else:
    print('MISSING design tokens css')

patterns = [
    (re.compile(re.escape('fecredit-design-tokens.css')), 'mcredit-design-tokens.css'),
    (re.compile(re.escape('--fecredit-')), '--mcredit-'),
    (re.compile(re.escape('FE CREDIT')), 'M CREDIT'),
    (re.compile(re.escape('FE Credit')), 'M Credit'),
    (re.compile(re.escape('Fe Credit')), 'M Credit'),
    (re.compile(re.escape('fe credit')), 'm credit'),
    (re.compile(re.escape('fecredit-header')), 'mcredit-header'),
    (re.compile(re.escape('https://www-cdn.fecredit.com.vn')), 'https://www-cdn.mcredit.com.vn'),
    (re.compile(re.escape('https://www.fecredit.com.vn')), 'https://www.mcredit.com.vn'),
    (re.compile(re.escape('https://fecredit.com.vn')), 'https://mcredit.com.vn'),
    (re.compile(re.escape('https://feonline.fecredit.com.vn')), 'https://online.mcredit.com.vn'),
    (re.compile(re.escape('https://tuyendung.fecredit.com.vn')), 'https://tuyendung.mcredit.com.vn'),
    (re.compile(re.escape('https://marketing.fecredit.com.vn')), 'https://marketing.mcredit.com.vn'),
    (re.compile(re.escape('https://fecredit.github.io')), 'https://mcredit.github.io'),
    (re.compile(re.escape('zalo.me/FECREDIT')), 'zalo.me/MCREDIT'),
    (re.compile(re.escape('https://card.fecredit.com.vn')), 'https://card.mcredit.com.vn'),
    (re.compile(re.escape('http://fecredit.net')), 'https://www.mcredit.com.vn'),
    (re.compile(re.escape('https://www.fecredit.fun')), 'https://mcredit.github.io'),
    (re.compile(re.escape('fecredit-red')), 'mcredit-primary'),
    (re.compile(re.escape('FECREDIT')), 'MCREDIT'),
]

changed = []
for ext in ['*.html', '*.css', '*.js', '*.md']:
    for p in root.rglob(ext):
        text = p.read_text(encoding='utf-8', errors='replace')
        orig = text
        for pat, repl in patterns:
            text = pat.sub(repl, text)
        if text != orig:
            p.write_text(text, encoding='utf-8')
            changed.append(str(p.relative_to(root)))

print('MODIFIED', len(changed), 'files')
for p in changed[:20]:
    print(p)
if len(changed) > 20:
    print('... and', len(changed) - 20, 'more')
