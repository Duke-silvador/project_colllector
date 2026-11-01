import io, json, zipfile, urllib.request
from pathlib import Path

def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":"hai-gin-rpg-installer"})
    return urllib.request.urlopen(req,timeout=90).read()

characters=["Knight","Mage","Rogue","Rogue_Hooded","Barbarian"]
source="https://codeload.github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/zip/refs/heads/main"
archive=zipfile.ZipFile(io.BytesIO(get(source)))
out=Path("assets/characters")
out.mkdir(parents=True,exist_ok=True)
for name in characters:
    found=[p for p in archive.namelist() if p.lower().endswith("/"+name.lower()+".glb")]
    if found:
        out.joinpath(name+".glb").write_bytes(archive.read(sorted(found,key=len)[0]))
        print("Character installed",name)
    else:
        print("Character unavailable",name)

town=["stall-green","stall-red","cart","tree-high-round","lantern","fountain-round","stall","tree-crooked"]
out=Path("assets/town")
out.mkdir(parents=True,exist_ok=True)
for name in town:
    try:
        url="https://raw.githubusercontent.com/shorepine/kenney/main/3d/fantasy-town/"+name+".glb"
        out.joinpath(name+".glb").write_bytes(get(url))
        print("Town installed",name)
    except Exception as e:
        print("Town unavailable",name,str(e))
Path("assets/models.json").write_text(json.dumps({"models":["assets/characters/"+n+".glb" for n in characters if Path("assets/characters/"+n+".glb").exists()]}),encoding="utf8")
Path("assets/town.json").write_text(json.dumps({"models":["assets/town/"+n+".glb" for n in town if Path("assets/town/"+n+".glb").exists()]}),encoding="utf8")

required=["Knight","Mage","Rogue","Rogue_Hooded","Barbarian"]
missing=[n for n in required if not Path("assets/characters/"+n+".glb").exists()]
if missing: raise RuntimeError("Required 3D models missing: "+", ".join(missing))
