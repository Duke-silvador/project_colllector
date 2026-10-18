import subprocess

ADB = r"C:\Users\SHOAIB\AppData\Local\Android\Sdk\platform-tools\adb.exe"

SETTINGS_XML = """<?xml version="1.0" encoding="UTF-8"?>

<Settings>
  <version value="27" />
  <configSource>SMC_AUTO</configSource>
  <graphics>
    <Tessellation value="0" />
    <LodScale value="0.600000" />
    <PedLodBias value="0.400000" />
    <VehicleLodBias value="0.400000" />
    <ShadowQuality value="0" />
    <ReflectionQuality value="1" />
    <ReflectionMSAA value="0" />
    <SSAO value="0" />
    <AnisotropicFiltering value="2" />
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
    <CityDensity value="0.300000" />
    <PedVarietyMultiplier value="0.200000" />
    <VehicleVarietyMultiplier value="0.200000" />
    <PostFX value="0" />
    <DoF value="false" />
    <HdStreamingInFlight value="false" />
    <MaxLodScale value="0.600000" />
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
    <ScreenWidth value="1600" />
    <ScreenHeight value="720" />
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

with open("temp_settings.xml", "w", encoding="utf-8") as f:
    f.write(SETTINGS_XML)

subprocess.run([ADB, "push", "temp_settings.xml", "/data/local/tmp/settings.xml"])
subprocess.run([ADB, "shell", 'run-as dev.muguet cp /data/local/tmp/settings.xml "files/saves/userdata/Documents/Rockstar Games/GTA V/settings.xml"'])
subprocess.run([ADB, "shell", "rm -f /data/local/tmp/settings.xml"])

import os
os.remove("temp_settings.xml")
print("High-Clarity settings.xml applied successfully!")
