//go:build !windows

package main

import (
	"os"
	"testing"
)

func TestPickAllRepos(t *testing.T) {
	want := map[string]string{
		"zhongyang219/TrafficMonitor":               "TrafficMonitor_V1.85.1_x64.zip",
		"sandboxie-plus/Sandboxie":                  "Sandboxie-Plus-x64-v1.16.3.exe",
		"winsiderss/systeminformer":                 "systeminformer-3.2.25078-release-setup.exe",
		"namazso/OpenHashTab":                       "OpenHashTab_Machine.msi",
		"barry-ran/QtScrcpy":                        "QtScrcpy-win-x64-v3.3.1.zip",
		"viarotel-org/escrcpy":                      "Escrcpy-1.30.2-win-x64.exe",
		"memtest86plus/memtest86plus":               "mt86plus_7.20_64.iso.zip",
		"rescuezilla/rescuezilla":                   "rescuezilla-2.6.1-64bit.oracular.iso",
		"ONLYOFFICE/DesktopEditors":                 "DesktopEditors_x64.msi",
		"ferdium/ferdium-app":                       "Ferdium-Setup-7.1.0.exe",
		"QL-Win/QuickLook":                          "QuickLook-4.0.2.msi",
		"Flow-Launcher/Flow.Launcher":               "Flow-Launcher-Setup.exe",
		"espanso/espanso":                           "Espanso-Win-Installer-x86_64.exe",
		"d2phap/ImageGlass":                         "ImageGlass_9.3.2.520_x64.msi",
		"koodo-reader/koodo-reader":                 "Koodo-Reader-2.0.9.exe",
		"edrlab/thorium-reader":                     "Thorium.Setup.3.2.1.exe",
		"musescore/MuseScore":                       "MuseScore-Studio-4.5.2.251141401-x86_64.msi",
		"LMMS/lmms":                                 "lmms-1.2.2-win64.exe",
		"PintaProject/Pinta":                        "Pinta.exe",
		"jellyfin/jellyfin-media-player":            "JellyfinMediaPlayer-1.12.0-windows-x64.exe",
		"nomic-ai/gpt4all":                          "gpt4all-installer-win64-v3.10.0.exe",
		"CherryHQ/cherry-studio":                    "Cherry-Studio-1.5.3-x64-setup.exe",
		"chidiwilliams/buzz":                        "Buzz-1.2.0-windows.exe",
		"Comfy-Org/desktop":                         "ComfyUI.Setup.0.4.60.-.x64.exe",
		"LykosAI/StabilityMatrix":                   "StabilityMatrix-win-x64.zip",
		"coreybutler/nvm-windows":                   "nvm-setup.exe",
		"DevToys-app/DevToys":                       "devtoys_win_x64.exe",
		"Kong/insomnia":                             "Insomnia.Core-11.4.0.exe",
		"beekeeper-studio/beekeeper-studio":         "Beekeeper-Studio-Setup-5.3.4.exe",
		"podman-desktop/podman-desktop":             "podman-desktop-1.21.0-setup-x64.exe",
		"zed-industries/zed":                        "Zed-x86_64.exe",
		"ramensoftware/windhawk":                    "windhawk_setup.exe",
		"rocksdanister/lively":                      "lively_setup_x86_full_v2200.exe",
		"rainmeter/rainmeter":                       "Rainmeter-4.5.22.exe",
		"moudey/Shell":                              "setup-1.9.18-x64.msi",
		"Heroic-Games-Launcher/HeroicGamesLauncher": "Heroic-2.18.0-Setup-x64.exe",
		"PrismLauncher/PrismLauncher":               "PrismLauncher-Windows-MSVC-Setup-9.4.exe",
		"Genymobile/scrcpy":                         "scrcpy-win64-v3.3.1.zip",
		"Universal-Debloater-Alliance/universal-android-debloater-next-generation": "uad-ng-windows.exe",
		"balena-io/etcher":                          "balenaEtcher-2.1.0.Setup.exe",
		"raspberrypi/rpi-imager":                    "imager-1.9.4.exe",
		"localsend/localsend":                       "LocalSend-1.17.0-windows-x86-64.exe",
		"LibreHardwareMonitor/LibreHardwareMonitor": "LibreHardwareMonitor-net472.zip",
		"Klocman/Bulk-Crap-Uninstaller":             "BCUninstaller_5.8.3_setup.exe",
		"lostindark/DriverStoreExplorer":            "DriverStoreExplorer.v1.0.25.zip",
		"Open-Shell/Open-Shell-Menu":                "OpenShellSetup_4_4_196.exe",
		"henrypp/memreduct":                         "memreduct-3.5.2-setup.exe",
		"xanderfrangos/twinkle-tray":                "Twinkle.Tray.v1.16.7.exe",
		"flameshot-org/flameshot":                   "Flameshot-12.1.0-win64.msi",
		"NickeManarin/ScreenToGif":                  "ScreenToGif.2.41.1.Setup.x64.msi",
		"peazip/PeaZip":                             "peazip-10.5.0.WIN64.exe",
		"Tichau/FileConverter":                      "FileConverter-2.1-x64-setup.msi",
		"WinMerge/winmerge":                         "WinMerge-2.16.48-x64-Setup.exe",
		"agalwood/Motrix":                           "Motrix-Setup-1.8.19.exe",
		"AutoHotkey/AutoHotkey":                     "AutoHotkey_2.0.19_setup.exe",
		"AppFlowy-IO/AppFlowy":                      "AppFlowy-0.9.6-windows-x86_64.exe",
		"laurent22/joplin":                          "Joplin-Setup-3.3.13.exe",
		"siyuan-note/siyuan":                        "siyuan-3.2.0-win.exe",
		"logseq/logseq":                             "logseq-win-x64-0.10.9.msi",
		"marktext/marktext":                         "marktext-setup.exe",
		"keepassxreboot/keepassxc":                  "KeePassXC-2.7.10-Win64.msi",
		"upscayl/upscayl":                           "upscayl-2.15.0-win.exe",
		"HandBrake/HandBrake":                       "HandBrake-1.9.2-x86_64-Win_GUI.exe",
		"FreeCAD/FreeCAD":                           "FreeCAD_1.0.1-conda-Windows-x86_64-installer-1.exe",
		"clsid2/mpc-hc":                             "MPC-HC.2.4.3.x64.exe",
		"mltframework/shotcut":                      "shotcut-win64-250530.exe",
		"darktable-org/darktable":                   "darktable-5.2.0-win64.exe",
		"LizardByte/Sunshine":                       "sunshine-windows-installer.exe",
		"moonlight-stream/moonlight-qt":             "MoonlightSetup-6.1.0.exe",
		"JosefNemec/Playnite":                       "Playnite1041.exe",
		"zen-browser/desktop":                       "zen.installer.exe",
		"ollama/ollama":                             "OllamaSetup.exe",
		"janhq/jan":                                 "Jan_0.6.4_x64-setup.exe",
		"neovim/neovim":                             "nvim-win64.msi",
		"Eugeny/tabby":                              "tabby-1.0.223-setup-x64.exe",
		"alacritty/alacritty":                       "Alacritty-v0.15.1-installer.msi",
		"PowerShell/PowerShell":                     "PowerShell-7.5.2-win-x64.msi",
		"WerWolv/ImHex":                             "imhex-1.37.4-Windows-x86_64.msi",
		"dbeaver/dbeaver":                           "dbeaver-ce-25.1.2-x86_64-setup.exe",
		"usebruno/bruno":                            "bruno_2.7.0_x64_win.exe",
		"VSCodium/vscodium":                         "VSCodium-x64-1.101.24242.msi",
		"HeidiSQL/HeidiSQL":                         "HeidiSQL_12.11.0.7065_Setup.exe",
		"storytold/craft-launcher":                  "craft-launcher-0.2.1-windows-x64.msi",
	}
	os.Setenv("PROCESSOR_ARCHITECTURE", "AMD64")
	for _, g := range ghCatalog {
		r, err := ghFetch(g.Repo)
		if _, sample := ghSamples[g.Repo]; !sample {
			continue
		}
		if err != nil {
			t.Errorf("%s: %v", g.Repo, err)
			continue
		}
		a := pickAsset(g.Repo, r)
		if w, ok := want[g.Repo]; ok && a.Name != w {
			t.Errorf("%s: eligió %s, se esperaba %s", g.Repo, a.Name, w)
		}
	}
	for repo := range want {
		if ghItem(repo) == nil {
			t.Errorf("%s no está en el catálogo", repo)
		}
	}
	// ARM64: preferir la versión ARM cuando existe
	os.Setenv("PROCESSOR_ARCHITECTURE", "ARM64")
	arm := map[string]string{"neovim/neovim": "nvim-win-arm64.msi", "PowerShell/PowerShell": "PowerShell-7.5.2-win-arm64.msi", "flameshot-org/flameshot": "Flameshot-12.1.0-win64.msi", "Eugeny/tabby": "tabby-1.0.223-setup-arm64.exe"}
	for repo, w := range arm {
		r, _ := ghFetch(repo)
		if a := pickAsset(repo, r); a == nil || a.Name != w {
			t.Errorf("ARM %s: eligió %v, se esperaba %s", repo, a, w)
		}
	}
	os.Setenv("PROCESSOR_ARCHITECTURE", "AMD64")
}

func TestUnzipSlip(t *testing.T) {
	d := t.TempDir()
	if err := unzip("/nonexistent.zip", d); err == nil {
		t.Fatal("esperaba error")
	}
}
