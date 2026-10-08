from pathlib import Path
import shutil
root=Path('/mnt/data/sitefix')

# Make reliable route mirrors for both /terms/ and /download/, including links reached from /index/.
# Copy the existing route pages into /index/terms/ and /index/download/ with corrected relative links.
for src, dst in [(root/'terms'/'index.html', root/'index'/'terms'/'index.html'),
                 (root/'download'/'index.html', root/'index'/'download'/'index.html')]:
    dst.parent.mkdir(parents=True, exist_ok=True)
    text=src.read_text(encoding='utf-8')
    if 'terms' in str(src):
        text=text.replace('href="../"', 'href="../../"', 1)
    else:
        text=text.replace('href="../index/"', 'href="../../"', 1)
        text=text.replace('src="../assets/', 'src="../../assets/')
        text=text.replace('href="../terms/"', 'href="../../terms/"')
    # Background fallback for nested route.
    text=text.replace("this.src='/checksteam/assets/GHfire1.gif'", "this.src='../../assets/GHfire1.gif'")
    # Relative favicon.
    text=text.replace('href="../favicon.svg"', 'href="../../favicon.svg"')
    dst.write_text(text, encoding='utf-8')

# Ensure root /terms/ and /download/ are valid and their own navigation is stable.
# Patch all index-page footers to support both custom domain and GitHub project deployments.
for p in [root/'index.html', root/'index'/'index.html', root/'checker.html', root/'checker'/'index.html']:
    text=p.read_text(encoding='utf-8')
    # Keep the href relative so it works on both custom domain and /checksteam GitHub Pages.
    # From /index/ directory this intentionally points to /index/terms/ and /index/download/;
    # those mirrors are created above.
    # Remove any lingering methodical/guide footer link if present.
    text=text.replace(' <span class="sep">|</span><a href="./terms/">СОГЛАШЕНИЕ</a>', ' <span class="sep">|</span><a href="./terms/">СОГЛАШЕНИЕ</a>')
    text=text.replace(' <span class="sep">|</span><a href="./download/">⬇ СКАЧАТЬ GMOD SCAN</a>', ' <span class="sep">|</span><a href="./download/">⬇ СКАЧАТЬ GMOD SCAN</a>')
    # Remove Method/guide if still present.
    import re
    text=re.sub(r'<span class="sep">\|</span>\s*<a[^>]*>(?:📖\s*)?(?:МЕТОДИЧКА|МЕТОДИКА|GUIDE|METHOD)[^<]*</a>', '', text, flags=re.I)
    p.write_text(text, encoding='utf-8')

# Main page: restore the reference desktop geometry seen on checksteam.ru/index.
# The original reference is a ~970px content rail, not the previously over-narrow 750px rail.
main_css='''\n<style id="main-reference-geometry">\n/* Main page geometry matched to the supplied checksteam.ru/index reference. */\n.container{width:970px!important;max-width:calc(100% - 30px)!important;margin-left:auto!important;margin-right:auto!important;}\n.header{height:76px!important;}\n.logo{font-size:17px!important;letter-spacing:2px!important;}\n.logo-box{width:29px!important;height:29px!important;}\n.steam-btn{padding:11px 17px!important;font-size:12px!important;border-radius:6px!important;}\n.hero{height:280px!important;}\n.hero h1{font-size:24px!important;letter-spacing:1.3px!important;margin:0 0 12px!important;}\n.hero p{font-size:11px!important;margin:0 0 24px!important;}\n.footer{font-size:10px!important;padding:0 0 30px!important;}\n.footer a{font-size:9px!important;padding:0 2px!important;}\n@media(max-width:1000px){.container{max-width:calc(100% - 30px)!important;width:auto!important;}}\n</style>\n'''
for p in [root/'index.html', root/'index'/'index.html']:
    text=p.read_text(encoding='utf-8')
    text=text.replace('</head>', main_css+'</head>', 1)
    p.write_text(text, encoding='utf-8')

# Fix fallback path in all HTML files so it is relative to each page, not hard-coded to a repo name.
for p in root.rglob('*.html'):
    text=p.read_text(encoding='utf-8')
    depth=len(p.parent.relative_to(root).parts)
    rel_assets='../'*depth+'assets/GHfire1.gif'
    text=text.replace("this.src='/checksteam/assets/GHfire1.gif'", f"this.src='{rel_assets}'")
    p.write_text(text, encoding='utf-8')

# Clean method/guide files and routes if any were present.
for name in ['method.html','guide.html']:
    f=root/name
    if f.exists(): f.unlink()
    d=root/name.replace('.html','')
    if d.exists() and d.is_dir(): shutil.rmtree(d)

print('patched')
