import subprocess
import json
import os

ADB = r"C:\Users\SHOAIB\AppData\Local\Android\Sdk\platform-tools\adb.exe"

SETTINGS_XML = """<?xml version="1.0" encoding="UTF-8"?>

<Settings>
  <version value="27" />
  <configSource>SMC_AUTO</configSource>
  <graphics>
    <Tessellation value="0" />
    <LodScale value="0.000000" />
    <PedLodBias value="0.000000" />
    <VehicleLodBias value="0.000000" />
    <ShadowQuality value="0" />
    <ReflectionQuality value="0" />
    <ReflectionMSAA value="0" />
    <SSAO value="0" />
    <AnisotropicFiltering value="0" />
    <MSAA value="0" />
    <MSAAFragments value="0" />
    <MSAAQuality value="0" />
    <SamplingMode value="0" />
    <TextureQuality value="0" />
    <ParticleQuality value="0" />
    <WaterQuality value="0" />
    <GrassQuality value="0" />
    <ShaderQuality value="0" />
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
    <FXAA_Enabled value="false" />
    <TXAA_Enabled value="false" />
    <Lighting_FogVolumes value="false" />
    <Shader_SSA value="false" />
    <DX_Version value="2" />
    <CityDensity value="0.000000" />
    <PedVarietyMultiplier value="0.000000" />
    <VehicleVarietyMultiplier value="0.000000" />
    <PostFX value="0" />
    <DoF value="false" />
    <HdStreamingInFlight value="false" />
    <MaxLodScale value="0.000000" />
    <MotionBlurStrength value="0.000000" />
  </graphics>
  <system>
    <numBytesPerReplayBlock value="9000000" />
    <numReplayBlocks value="36" />
    <maxSizeOfStreamingReplay value="1024" />
    <maxFileStoreSize value="65536" />
  </system>
  <audio>
    <Audio3d value="false" />
  </audio>
  <video>
    <AdapterIndex value="0" />
    <OutputIndex value="0" />
    <ScreenWidth value="640" />
    <ScreenHeight value="480" />
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

CONFIG_JSON = {
  "scale": 0.40,
  "fps": 30,
  "fps_limit": 30,
  "heap": 3,
  "android_heap_gb": 3,
  "mode": "wasmtime",
  "mute": False,
  "sensitivity": 1.2,
  "touch_sensitivity": 1.2,
  "name": "Player",
  "server": "",
  "start_mode": 2,
  "texture_quality": 0,
  "fullscreen": True,
  "multiplayer": False,
  "host": False,
  "player_name": "",
  "phone_lod": True,
  "phone_graphics": True,
  "extra_args": "-nodisplaycalibration -noSocialClub -nonetwork -disableGrass -noInGameDOF -FrameQueueLimit 0 -reflectionBlur 0 -reflection_MipBlur 0"
}

def apply():
    print("=" * 60)
    print("Applying High-Performance Optimizations to GTA WEB MALI")
    print("=" * 60)
    
    # 1. Write optimized settings.xml
    with open("settings_opt.xml", "w", encoding="utf-8") as f:
        f.write(SETTINGS_XML)
    subprocess.run([ADB, "push", "settings_opt.xml", "/data/local/tmp/settings.xml"])
    subprocess.run([ADB, "shell", "run-as dev.muguet cp /data/local/tmp/settings.xml \"files/saves/userdata/Documents/Rockstar Games/GTA V/settings.xml\""])
    subprocess.run([ADB, "shell", "rm /data/local/tmp/settings.xml"])
    os.remove("settings_opt.xml")
    print("[1/2] settings.xml updated: Shadows OFF, Grass OFF, Reflections OFF, VSync OFF, PostFX OFF.")
    
    # 2. Write optimized config.json
    with open("config_opt.json", "w", encoding="utf-8") as f:
        json.dump(CONFIG_JSON, f, indent=2)
    subprocess.run([ADB, "push", "config_opt.json", "/data/local/tmp/config.json"])
    subprocess.run([ADB, "shell", "run-as dev.muguet cp /data/local/tmp/config.json files/config.json"])
    subprocess.run([ADB, "shell", "rm /data/local/tmp/config.json"])
    os.remove("config_opt.json")
    print("[2/2] config.json updated: Render scale set to 0.40 (smooth fillrate), Mobile LOD active, Extra perf args enabled.")
    
    print("\nAll optimizations successfully applied to phone!")

if __name__ == "__main__":
    apply()
