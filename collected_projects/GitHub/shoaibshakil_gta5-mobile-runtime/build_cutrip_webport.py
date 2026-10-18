import os
import json
import zipfile
import re
import sys
import time

SOURCE_WEBPORT = r"G:\GTA V\playgta5-offline\mirror\playgta5.com"
SOURCE_CUTRIP = r"c:\Users\SHOAIB\Downloads\gtavweb-master\GTA V CUTRIP V2 optijuegos.net\gta_data"
OUTPUT_ZIP = r"D:\game-import.zip"

def should_exclude(rel_path):
    p = rel_path.replace('\\', '/')
    # Exclude extra map
    if 'env_test' in p:
        return True
    # Exclude PC Nvidia stereo 3D vision shaders
    if 'win32_nvstereo' in p:
        return True
    # Exclude multiplayer DLCs (not used in singleplayer Story Mode)
    if p.startswith('x64/dlcPacks/mp') and not p.startswith('x64/dlcPacks/sp'):
        return True
    # Exclude multiplayer ped models
    if p == 'x64/models/cdimages/streamedpeds_mp.rpf':
        return True
    return False

def build():
    print("=" * 60)
    print("Starting GTA V CUTRIP WebPort Packager (Target: < 10 GB)")
    print("=" * 60)
    
    # 1. Load original manifest
    orig_manifest_path = os.path.join(SOURCE_WEBPORT, "data", "manifest.json")
    with open(orig_manifest_path, 'r', encoding='utf-8') as f:
        orig_manifest = json.load(f)
    
    # Map CUTRIP dummy audio replacements
    cutrip_audio_dir = os.path.join(SOURCE_CUTRIP, "x64", "audio", "sfx")
    cutrip_replacements = {}
    if os.path.isdir(cutrip_audio_dir):
        for f in os.listdir(cutrip_audio_dir):
            if f.lower().endswith('.rpf'):
                fp = os.path.join(cutrip_audio_dir, f)
                # If CUTRIP made it tiny (dummy/empty RPF)
                if os.path.getsize(fp) < 1024 * 1024: # less than 1MB
                    cutrip_replacements[f"x64/audio/sfx/{f}"] = fp

    print(f"Loaded {len(cutrip_replacements)} lightweight audio replacements from CUTRIP.")

    # 2. Filter files for new manifest
    new_files_list = []
    total_uncompressed = 0

    for item in orig_manifest["files"]:
        p, sz, ts = item[0], item[1], item[2]
        if should_exclude(p):
            continue
        
        # Check if replaced by CUTRIP dummy
        if p in cutrip_replacements:
            actual_sz = os.path.getsize(cutrip_replacements[p])
            new_files_list.append([p, actual_sz, ts])
            total_uncompressed += actual_sz
        else:
            new_files_list.append([p, sz, ts])
            total_uncompressed += sz

    print(f"Total files kept: {len(new_files_list)} (Excluded: {len(orig_manifest['files']) - len(new_files_list)})")
    print(f"Estimated uncompressed data size: {total_uncompressed / (1024**3):.2f} GB")

    new_manifest = {
        "mount": orig_manifest.get("mount", "/game/"),
        "version": orig_manifest.get("version", "cutrip-1.0"),
        "files": new_files_list
    }

    # 3. Create ZIP Archive on D:
    print(f"\nCreating ZIP archive at {OUTPUT_ZIP}...")
    start_time = time.time()
    
    # Check free disk space on D:
    import shutil
    _, _, free_d = shutil.disk_usage("D:")
    print(f"Free space on D: {free_d / (1024**3):.2f} GB")
    if free_d < 7 * 1024 * 1024 * 1024:
        print("ERROR: Less than 7GB free on D:. Cannot proceed safely.")
        return

    count = 0
    with zipfile.ZipFile(OUTPUT_ZIP, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zout:
        # A. Write b/<build>/ (Engine & Shaders)
        build_dir = os.path.join(SOURCE_WEBPORT, "b", "8b0b5899ed")
        for root, dirs, files in os.walk(build_dir):
            for f in files:
                full_p = os.path.join(root, f)
                rel = os.path.relpath(full_p, SOURCE_WEBPORT)
                zip_path = rel.replace('\\', '/')
                zout.write(full_p, zip_path)
                count += 1

        print(f"Added engine & shaders ({count} files).")

        # B. Write data/manifest.json
        manifest_str = json.dumps(new_manifest, separators=(',', ':'))
        zout.writestr("data/manifest.json", manifest_str)
        print("Written custom data/manifest.json.")

        # C. Write data/bootset.json and bootset_low.json if they exist
        for bset in ["bootset.json", "bootset_low.json"]:
            bset_path = os.path.join(SOURCE_WEBPORT, "data", bset)
            if os.path.isfile(bset_path):
                zout.write(bset_path, f"data/{bset}")

        # D. Write data game files
        data_root = os.path.join(SOURCE_WEBPORT, "data")
        file_count = len(new_files_list)
        last_pct = 0

        for idx, (p, sz, ts) in enumerate(new_files_list):
            zip_entry = f"data/{p}"
            if p in cutrip_replacements:
                src_path = cutrip_replacements[p]
            else:
                src_path = os.path.join(data_root, p.replace('/', os.sep))

            if os.path.isfile(src_path):
                zout.write(src_path, zip_entry)
            else:
                print(f"Warning: file not found on disk: {src_path}")

            pct = int((idx / file_count) * 100)
            if pct != last_pct and pct % 5 == 0:
                last_pct = pct
                print(f"Packing progress: {pct}% ({idx}/{file_count} files)...")

    elapsed = time.time() - start_time
    final_zip_size = os.path.getsize(OUTPUT_ZIP)
    print("\n" + "=" * 60)
    print("SUCCESS: GTA V CUTRIP WebPort ZIP Created!")
    print(f"Location: {OUTPUT_ZIP}")
    print(f"Final ZIP Size: {final_zip_size / (1024**3):.2f} GB ({final_zip_size / (1024*1024):.1f} MB)")
    print(f"Time taken: {elapsed:.1f} seconds")
    print("=" * 60)

if __name__ == "__main__":
    build()
