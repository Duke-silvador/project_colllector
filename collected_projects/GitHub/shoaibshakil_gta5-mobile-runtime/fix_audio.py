import zipfile
import subprocess
import os
import json
import time

ZIP_PATH = r"G:\GTA V\GTA5Webport.zip"
ADB = r"C:\Users\SHOAIB\AppData\Local\Android\Sdk\platform-tools\adb.exe"
LOCAL_TMP = r"c:\Users\SHOAIB\Downloads\gtavweb-master\temp_audio"

def fix():
    os.makedirs(LOCAL_TMP, exist_ok=True)
    
    with zipfile.ZipFile(ZIP_PATH) as z:
        sfx_entries = [f for f in z.namelist() if "data/x64/audio/sfx/" in f and f.endswith(".rpf")]
        print(f"Extracting {len(sfx_entries)} audio packfiles...")
        
        extracted_files = []
        for entry in sfx_entries:
            fname = os.path.basename(entry)
            out_file = os.path.join(LOCAL_TMP, fname)
            with z.open(entry) as src, open(out_file, "wb") as dst:
                dst.write(src.read())
            extracted_files.append((fname, os.path.getsize(out_file)))
            
    print("Pushing audio files to phone...")
    subprocess.run([ADB, "shell", "mkdir -p /data/local/tmp/sfx_new"])
    subprocess.run([ADB, "push", LOCAL_TMP + "/.", "/data/local/tmp/sfx_new/"])
    
    # Check that files arrived in /data/local/tmp/sfx_new/
    count = subprocess.check_output([ADB, "shell", "ls -1 /data/local/tmp/sfx_new | wc -l"]).decode().strip()
    print(f"Files on phone in tmp: {count}")
    
    # Copy using run-as into game directory
    print("Copying into files/game/data/x64/audio/sfx/...")
    subprocess.run([ADB, "shell", "run-as dev.muguet cp -f /data/local/tmp/sfx_new/* files/game/data/x64/audio/sfx/"])
    
    # Verify ANIMALS.rpf size in game directory
    size_out = subprocess.check_output([ADB, "shell", "run-as dev.muguet ls -l files/game/data/x64/audio/sfx/ANIMALS.rpf"]).decode().strip()
    print("Verified ANIMALS.rpf in game:", size_out)
    
    # Clean up
    subprocess.run([ADB, "shell", "rm -rf /data/local/tmp/sfx_new"])
    for f in os.listdir(LOCAL_TMP):
        os.remove(os.path.join(LOCAL_TMP, f))
    os.rmdir(LOCAL_TMP)
    print("DONE! All authentic audio installed.")

if __name__ == "__main__":
    fix()
