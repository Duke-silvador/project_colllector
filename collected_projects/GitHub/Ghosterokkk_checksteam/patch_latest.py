from pathlib import Path
from PIL import Image
import re, shutil, zipfile
root=Path('/mnt/data/work_final')
# Make a tightly cropped transparent version of the exact supplied Ghoster logo.
src=Path('/mnt/data/ghoster_logo_white_transparent.png')
out=root/'assets'/'ghoster-logo.png'
im=Image.open(src).convert('RGBA')
alpha=im.getchannel('A')
bbox=alpha.getbbox()
if bbox:
    im=im.crop(bbox)
im.save(out, 'PNG', optimize=True)

css='''\n<style id="absolute-final-button-logo-fix">\n/* FINAL: resting Steam button is blue; red is ONLY a real mouse hover. */\n.page-main .steam-btn,\n.page-main a.steam-btn,\n.steam-btn,\n.steam {\n  border:1px solid #315a7c !important;\n  background:linear-gradient(180deg,#253f52 0%,#1d3445 100%) !important;\n  box-shadow:0 0 0 1px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.05) !important;\n  outline:none !important;\n  filter:none !important;\n  transform:none !important;\n}\n.page-main .steam-btn:hover,\n.page-main a.steam-btn:hover,\n.steam-btn:hover,\n.steam:hover {\n  border-color:#ed102d !important;\n  background:linear-gradient(180deg,#2b485d 0%,#203b4d 100%) !important;\n  box-shadow:0 0 0 1px rgba(237,16,45,.18),0 5px 18px rgba(237,16,45,.10),inset 0 1px 0 rgba(255,255,255,.06) !important;\n  transform:translateY(-1px) !important;\n}\n/* A click/focus must never leave the red hover appearance behind. */\n.page-main .steam-btn:focus,\n.page-main .steam-btn:active,\n.steam-btn:focus,\n.steam-btn:active,\n.steam:focus,\n.steam:active {\n  border-color:#315a7c !important;\n  background:linear-gradient(180deg,#253f52 0%,#1d3445 100%) !important;\n  box-shadow:0 0 0 1px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.05) !important;\n  outline:none !important;\n  transform:none !important;\n}\n@media (hover:none), (pointer:coarse) {\n  .page-main .steam-btn:hover, .steam-btn:hover, .steam:hover {\n    border-color:#315a7c !important;\n    background:linear-gradient(180deg,#253f52 0%,#1d3445 100%) !important;\n    box-shadow:0 0 0 1px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.05) !important;\n    transform:none !important;\n  }\n}\n/* The supplied Ghoster mark is transparent: no square, no background, no shadow. */\n.logo-box, .logo-box *, .site-logo, .logo-block .site-logo {\n  background:transparent !important;\n  box-shadow:none !important;\n  border:0 !important;\n}\n.logo-box { overflow:visible !important; }\n.site-logo { object-fit:contain !important; display:block !important; }\n/* Footer navigation is deliberately compact on every page. */\n.footer { font-size:10px !important; }\n.footer a { font-size:9px !important; font-weight:700 !important; padding:0 2px !important; }\n.page-main .footer a { font-size:9px !important; padding:0 2px !important; }\n</style>\n'''

htmls=list(root.rglob('*.html'))
for p in htmls:
    s=p.read_text(encoding='utf-8')
    # Remove any legacy inserted Steam logo that might be present as an actual element.
    s=re.sub(r'<img[^>]*class=["\']steam-logo-under["\'][^>]*>','',s,flags=re.I)
    # Ensure final CSS is inserted once before </head>.
    s=re.sub(r'\n<style id="absolute-final-button-logo-fix">.*?</style>\n','\n',s,flags=re.S)
    if '</head>' in s:
        s=s.replace('</head>', css+'\n</head>',1)
    p.write_text(s,encoding='utf-8')

# Package
zip_path=Path('/mnt/data/checksteam-FINAL-HOVER-LOGO-FOOTER-FIX.zip')
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for p in root.rglob('*'):
        if p.is_file() and p != zip_path and '__pycache__' not in p.parts:
            z.write(p, p.relative_to(root))
print(zip_path)
print('logo size', Image.open(out).size, 'alpha bbox', Image.open(out).getchannel('A').getbbox())
print('html count', len(htmls))
