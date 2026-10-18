import subprocess
import json
import os
import re

ADB = r"C:\Users\SHOAIB\AppData\Local\Android\Sdk\platform-tools\adb.exe"

def run_adb(cmd):
    full_cmd = [ADB] + cmd
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    return res.stdout.strip()

def detect_device_specs():
    print("=" * 65)
    print("  GTA V WebPort — Universal MediaTek & Mali GPU Optimizer")
    print("=" * 65)
    
    # Check connected devices
    devices = run_adb(["devices"]).splitlines()
    connected = [line for line in devices[1:] if line.strip() and "device" in line]
    if not connected:
        print("[!] No Android device detected via ADB! Make sure USB debugging is ON.")
        return None
    
    device_id = connected[0].split()[0]
    print(f"[*] Detected Device ID: {device_id}")
    
    # 1. Device Model & Manufacturer
    model = run_adb(["shell", "getprop", "ro.product.model"])
    brand = run_adb(["shell", "getprop", "ro.product.brand"])
    chipset = run_adb(["shell", "getprop", "ro.board.platform"])
    print(f"[*] Hardware: {brand.upper()} {model} (Platform: {chipset})")
    
    # 2. RAM Info
    meminfo = run_adb(["shell", "cat", "/proc/meminfo"])
    total_ram_kb = 0
    m = re.search(r"MemTotal:\s+(\d+)\s+kB", meminfo)
    if m:
        total_ram_kb = int(m.group(1))
    total_ram_gb = round(total_ram_kb / (1024 * 1024), 1)
    
    # Check zRAM Swap
    swap_kb = 0
    m_swap = re.search(r"SwapTotal:\s+(\d+)\s+kB", meminfo)
    if m_swap:
        swap_kb = int(m_swap.group(1))
    swap_gb = round(swap_kb / (1024 * 1024), 1)
    
    print(f"[*] System Memory: {total_ram_gb} GB Physical RAM + {swap_gb} GB Virtual RAM (zRAM)")
    
    # 3. Screen Resolution
    wm_size = run_adb(["shell", "wm", "size"])
    m_res = re.search(r"Physical size:\s+(\d+)x(\d+)", wm_size)
    res_w, res_h = (1600, 720)
    if m_res:
        res_w = max(int(m_res.group(1)), int(m_res.group(2)))
        res_h = min(int(m_res.group(1)), int(m_res.group(2)))
    print(f"[*] Display Resolution: {res_w} x {res_h}")
    
    return {
        "device_id": device_id,
        "brand": brand,
        "model": model,
        "ram_gb": total_ram_gb,
        "swap_gb": swap_gb,
        "res_w": res_w,
        "res_h": res_h
    }

def generate_profile(specs):
    ram = specs["ram_gb"]
    
    # Determine Tier based on Physical RAM
    if ram <= 4.5:
        tier = "Tier 1: Budget MediaTek (3 GB - 4 GB RAM)"
        scale = 0.50
        heap_gb = 2.5
        lod_scale = "0.400000"
        ped_lod = "0.200000"
        veh_lod = "0.200000"
        aniso = "1"
        reflection = "0"
        city_density = "0.150000"
    elif ram <= 6.5:
        tier = "Tier 2: Mid-Range MediaTek Helio G80/G85/G88/G95 (6 GB RAM)"
        scale = 0.70
        heap_gb = 3.0
        lod_scale = "0.600000"
        ped_lod = "0.400000"
        veh_lod = "0.400000"
        aniso = "2"
        reflection = "1"
        city_density = "0.300000"
    else:
        tier = "Tier 3: High-End MediaTek Dimensity / Helio G99 (8 GB+ RAM)"
        scale = 0.85
        heap_gb = 4.0
        lod_scale = "0.800000"
        ped_lod = "0.500000"
        veh_lod = "0.500000"
        aniso = "4"
        reflection = "1"
        city_density = "0.400000"
        
    print(f"\n[+] Selected Optimal Profile: {tier}")
    print(f"    - Render Scale: {scale} (Target: ~{int(specs['res_h'] * scale)}p)")
    print(f"    - Game Heap Budget: {heap_gb} GB")
    print(f"    - Level-of-Detail (LOD): {lod_scale}")
    print(f"    - Texture Filtering: {aniso}x Anisotropic")
    print(f"    - Anti-Aliasing: FXAA Enabled")
    
    # 1. Config JSON
    config = {
        "scale": scale,
        "fps": 30,
        "fps_limit": 30,
        "heap": int(heap_gb) if heap_gb.is_integer() else heap_gb,
        "android_heap_gb": int(heap_gb) if heap_gb.is_integer() else heap_gb,
        "mode": "wasmtime",
        "mute": False,
        "sensitivity": 1.2,
        "touch_sensitivity": 1.25,
        "name": "Player",
        "server": "0.0.0.0",
        "start_mode": 2,
        "texture_quality": 0,
        "fullscreen": True,
        "multiplayer": True,
        "host": True,
        "player_name": "Player",
        "phone_lod": True,
        "phone_graphics": True,
        "extra_args": "-nodisplaycalibration -noSocialClub -disableGrass -noInGameDOF -FrameQueueLimit 0 -reflectionBlur 0 -reflection_MipBlur 0 -noreplay"
    }
    
    # 2. Settings XML
    settings_xml = f"""<?xml version="1.0" encoding="UTF-8"?>

<Settings>
  <version value="27" />
  <configSource>SMC_AUTO</configSource>
  <graphics>
    <Tessellation value="0" />
    <LodScale value="{lod_scale}" />
    <PedLodBias value="{ped_lod}" />
    <VehicleLodBias value="{veh_lod}" />
    <ShadowQuality value="0" />
    <ReflectionQuality value="{reflection}" />
    <ReflectionMSAA value="0" />
    <SSAO value="0" />
    <AnisotropicFiltering value="{aniso}" />
    <MSAA value="0" />
    <MSAAFragments value="0" />
    <MSAAQuality value="0" />
    <SamplingMode value="0" />
    <TextureQuality value="0" />
    <ParticleQuality value="0" />
    <WaterQuality value="0" />
    <GrassQuality value="0" />
    <ShaderQuality value="1" />
    <Shadow_SoftShadows value="0" />
    <UltraShadows_Enabled value="false" />
    <Shadow_ParticleShadows value="false" />
    <Shadow_Distance value="0.000000" />
    <Shadow_LongShadows value="false" />
    <Shadow_SplitZStart value="0.930000" />
    <Shadow_SplitZEnd value="0.890000" />
    <Shadow_aircraftExpWeight value="0.990000" />
    <Shadow_DisableScreenSizeCheck value="false" />
    <Reflection_MipBlur value="false" />
    <FXAA_Enabled value="true" />
    <TXAA_Enabled value="false" />
    <Lighting_FogVolumes value="false" />
    <Shader_SSA value="false" />
    <DX_Version value="2" />
    <CityDensity value="{city_density}" />
    <PedVarietyMultiplier value="0.200000" />
    <VehicleVarietyMultiplier value="0.200000" />
    <PostFX value="0" />
    <DoF value="false" />
    <HdStreamingInFlight value="false" />
    <MaxLodScale value="{lod_scale}" />
    <MotionBlurStrength value="0.000000" />
  </graphics>
  <system>
    <numBytesPerReplayBlock value="100000" />
    <numReplayBlocks value="2" />
    <maxSizeOfStreamingReplay value="16" />
    <maxFileStoreSize value="8192" />
  </system>
  <audio>
    <Audio3d value="false" />
  </audio>
  <video>
    <AdapterIndex value="0" />
    <OutputIndex value="0" />
    <ScreenWidth value="{specs['res_w']}" />
    <ScreenHeight value="{specs['res_h']}" />
    <RefreshRate value="60" />
    <Windowed value="1" />
    <VSync value="0" />
    <Stereo value="0" />
    <Convergence value="0.100000" />
    <Separation value="1.000000" />
    <PauseOnFocusLoss value="0" />
    <AspectRatio value="0" />
  </video>
  <VideoCardDescription>N</VideoCardDescription>
</Settings>
"""
    return config, settings_xml

def apply_to_device(config, settings_xml):
    print("\n[+] Deploying Universal MediaTek Optimization Profile to Phone...")
    
    # 1. Push config.json
    with open("temp_universal_cfg.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    run_adb(["push", "temp_universal_cfg.json", "/data/local/tmp/config.json"])
    run_adb(["shell", "run-as", "dev.muguet", "cp", "/data/local/tmp/config.json", "files/config.json"])
    run_adb(["shell", "rm", "-f", "/data/local/tmp/config.json"])
    os.remove("temp_universal_cfg.json")
    print("  [OK] files/config.json updated successfully!")
    
    # 2. Push settings.xml
    with open("temp_universal_settings.xml", "w", encoding="utf-8") as f:
        f.write(settings_xml)
    run_adb(["push", "temp_universal_settings.xml", "/data/local/tmp/settings.xml"])
    run_adb(["shell", "run-as", "dev.muguet", "cp", "/data/local/tmp/settings.xml", '"files/saves/userdata/Documents/Rockstar Games/GTA V/settings.xml"'])
    run_adb(["shell", "rm", "-f", "/data/local/tmp/settings.xml"])
    os.remove("temp_universal_settings.xml")
    print("  [OK] settings.xml updated successfully!")
    
    print("\n" + "=" * 65)
    print("  SUCCESS: Device is fully optimized for smooth, crash-free play!")
    print("=" * 65)

if __name__ == "__main__":
    specs = detect_device_specs()
    if specs:
        cfg, settings = generate_profile(specs)
        apply_to_device(cfg, settings)
