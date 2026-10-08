from pathlib import Path
import re, zipfile, shutil
root=Path('/mnt/data/work_final')
htmls=list(root.rglob('*.html'))
for p in htmls:
    s=p.read_text(encoding='utf-8')
    # Replace custom SVG Steam marks inside auth buttons with the supplied Steam logo image.
    rel='assets/steam-logo-full.png'
    if p.parent != root:
        # count path depth from root
        depth=len(p.parent.relative_to(root).parts)
        rel='../'*depth + 'assets/steam-logo-full.png'
    img=f'<img class="steam-icon-img" src="{rel}" alt="" aria-hidden="true">'
    s=re.sub(r'<svg class="steam-icon".*?</svg>', img, s, flags=re.S)
    # Remove any standalone Steam logo that was placed below the central login button.
    s=re.sub(r'<img class="steam-logo-under"[^>]*>', '', s)
    # Ensure the header/site logo itself has no box wrapper background semantics; keep wrapper for layout.
    # Add a shared CSS override before </style> of the page, if not already there.
    css='''\n<style id="steam-logo-hover-final">\n/* Steam button: supplied logo sits LEFT of the text, never below it. */\n.steam-btn,.steam{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;transition:background .14s ease,border-color .14s ease,box-shadow .14s ease,filter .14s ease!important;filter:none!important;outline:none!important;}\n.steam-icon-img{width:19px!important;height:19px!important;display:block!important;object-fit:contain!important;flex:0 0 19px!important;}\n.steam-btn:hover,.steam:hover{filter:none!important;background:linear-gradient(#2b5672,#1c4058)!important;border-color:#ed0a27!important;box-shadow:0 0 0 1px rgba(237,10,39,.18),0 5px 18px rgba(237,10,39,.10)!important;}\n.steam-btn:focus,.steam:focus,.steam-btn:active,.steam:active{filter:none!important;outline:none!important;background:linear-gradient(#244b66,#193a51)!important;border-color:#315a7c!important;box-shadow:none!important;}\n.steam-btn:focus-visible,.steam:focus-visible{outline:2px solid rgba(237,10,39,.55)!important;outline-offset:2px!important;}\n.logo-box{background:transparent!important;box-shadow:none!important;overflow:visible!important;}\n.logo-box .site-logo{display:block!important;width:28px!important;height:28px!important;object-fit:contain!important;background:transparent!important;}\n@media(max-width:600px){.logo-box .site-logo{width:24px!important;height:24px!important}.steam-icon-img{width:18px!important;height:18px!important;flex-basis:18px!important;}}\n</style>\n'''
    if 'id="steam-logo-hover-final"' not in s:
        s=s.replace('</head>', css+'</head>')
    # Ensure click never leaves pointer focus highlight behind.
    s=s.replace('</body>', '''<script>(function(){document.querySelectorAll('.steam-btn,.steam,[data-steam]').forEach(function(b){b.addEventListener('pointerup',function(){var self=this;setTimeout(function(){if(document.activeElement===self)self.blur();},0)});b.addEventListener('mouseleave',function(){if(document.activeElement===this)this.blur()});});})();</script></body>''')
    p.write_text(s,encoding='utf-8')

# Copy supplied user logo assets already present; verify they are there.
assert (root/'assets/ghoster-logo.png').exists()
assert (root/'assets/steam-logo-full.png').exists()

out=Path('/mnt/data/checksteam-FINAL-STEAM-ICON-HOVER-FIX.zip')
if out.exists(): out.unlink()
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    for f in root.rglob('*'):
        if f.is_file() and f.name != out.name and f.name != 'patch_final.py':
            z.write(f, f.relative_to(root).as_posix())
print(out)
