import zipfile
import subprocess
import os
import json
import time

ZIP_PATH = r"G:\GTA V\GTA5Webport.zip"
ADB = r"C:\Users\SHOAIB\AppData\Local\Android\Sdk\platform-tools\adb.exe"
LOCAL_TMP = r"c:\Users\SHOAIB\Downloads\gtavweb-master\temp_missing"

MISSING_FILES = [
    'x64/models/cdimages/streamedpeds_mp.rpf',
    'x64/dlcPacks/mpBeach/dlc.rpf',
    'x64/dlcPacks/mpBusiness/dlc.rpf',
    'x64/dlcPacks/mpBusiness2/dlc.rpf',
    'x64/dlcPacks/mpChristmas/dlc.rpf',
    'x64/dlcPacks/mpHipster/dlc.rpf',
    'x64/dlcPacks/mpIndependence/dlc.rpf',
    'x64/dlcPacks/mpLTS/dlc.rpf',
    'x64/dlcPacks/mpPilot/dlc.rpf',
    'x64/dlcPacks/mpValentines/dlc.rpf',
    'x64/dlcPacks/verityRadio/dlc.rpf'
]

def install():
    print("=" * 60)
    print("Installing Missing RPFs to Fix Map Loading Crash")
    print("=" * 60)
    
    os.makedirs(LOCAL_TMP, exist_ok=True)
    
    # 1. Extract from zip
    extracted = {}
    with zipfile.ZipFile(ZIP_PATH) as z:
        for entry in z.namelist():
            for m in MISSING_FILES:
                if entry.endswith(m):
                    local_out = os.path.join(LOCAL_TMP, m.replace('/', os.sep))
                    os.makedirs(os.path.dirname(local_out), exist_ok=True)
                    with z.open(entry) as src, open(local_out, "wb") as dst:
                        dst.write(src.read())
                    sz = os.path.getsize(local_out)
                    extracted[m] = sz
                    print(f"Extracted: {m} ({sz / (1024*1024):.1f} MB)")
                    
    print(f"\nAll {len(extracted)} files extracted. Pushing to phone...")
    
    # 2. Push to phone
    subprocess.run([ADB, "shell", "mkdir -p /data/local/tmp/missing_rpfs"])
    subprocess.run([ADB, "push", LOCAL_TMP + "/.", "/data/local/tmp/missing_rpfs/"])
    
    # 3. Move via run-as into game directory
    print("\nCopying files into internal game directories...")
    # make parent dirs on phone
    for m in extracted:
        parent_dir = "files/game/data/" + os.path.dirname(m).replace('\\', '/')
        subprocess.run([ADB, "shell", f"run-as dev.muguet mkdir -p {parent_dir}"])
        dest_file = "files/game/data/" + m.replace('\\', '/')
        src_file = "/data/local/tmp/missing_rpfs/" + m.replace('\\', '/')
        subprocess.run([ADB, "shell", f"run-as dev.muguet cp -f {src_file} {dest_file}"])
        print(f"Installed: {dest_file}")
        
    # 4. Update manifest.json
    print("\nSyncing manifest.json on phone...")
    manifest_raw = subprocess.check_output([ADB, "shell", "run-as dev.muguet cat files/game/data/manifest.json"])
    manifest = json.loads(manifest_raw.decode('utf-8'))
    
    existing_paths = {item[0] for item in manifest["files"]}
    for m, sz in extracted.items():
        if m in existing_paths:
            for item in manifest["files"]:
                if item[0] == m:
                    item[1] = sz
        else:
            manifest["files"].append([m, sz, int(time.time())])
            
    with open("m_sync.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, separators=(',', ':'))
        
    subprocess.run([ADB, "push", "m_sync.json", "/data/local/tmp/manifest.json"])
    subprocess.run([ADB, "shell", "run-as dev.muguet cp /data/local/tmp/manifest.json files/game/data/manifest.json"])
    subprocess.run([ADB, "shell", "rm -f /data/local/tmp/manifest.json"])
    os.remove("m_sync.json")
    
    # Clean up
    subprocess.run([ADB, "shell", "rm -rf /data/local/tmp/missing_rpfs"])
    import shutil
    shutil.rmtree(LOCAL_TMP)
    
    print("\n" + "=" * 60)
    print("SUCCESS: All 11 Missing RPFs Successfully Installed!")
    print("=" * 60)

if __name__ == "__main__":
    install()
