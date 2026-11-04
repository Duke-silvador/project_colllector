//go:build !windows

package main

// Implementación de desarrollo: simula Windows para probar la interfaz.

import (
	"archive/zip"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

func hideWindow(cmd *exec.Cmd)         {}
func fatal(msg string)                 { fmt.Println(msg) }
func isAdmin() bool                    { return false }
func relaunchAdmin() bool              { return false }
func openPath(p string)                { fmt.Println("abrir", p) }
func openWindow(url string)            { fmt.Println("Abrir:", url) }
func scheduleReboot()                  { fmt.Println("reinicio programado") }
func invalidateInstalled()             {}
func unblock(p string)                 {}
func ventoyDrive() string              { return os.Getenv("MIVIBRA_VENTOY") }
func makeShortcut(name, target string) { fmt.Println("acceso directo", name, target) }
func runElevated(jobFile string) error { go runRunner(jobFile); return nil }
func installedNames(refresh bool) []string {
	return []string{"Google Chrome", "7-Zip 24.08 (x64)", "AnyDesk", "VLC media player"}
}

func runTool(timeout time.Duration, name string, args ...string) (string, error) {
	if name == "winget" && len(args) > 0 && args[0] == "--version" {
		return "v1.9.25200\n", nil
	}
	if name == "winget" && len(args) > 0 && args[0] == "search" {
		return "   - \r   \\ \r                                                                                                                        \r" +
			"Nombre                         Id.                              Versión     Coincidencia      Origen\n" +
			"-------------------------------------------------------------------------------------------------------\n" +
			"Samsung Smart Switch           Samsung.SmartSwitch              4.3.24062.1                   winget\n" +
			"Samsung Magician               Samsung.SamsungMagician          8.2.0.880   Tag: samsung      winget\n" +
			"Samsung DeX                    Samsung.DeX                      2.4.1.13    Tag: samsung      winget\n", nil
	}
	return "", fmt.Errorf("no disponible")
}

func runCancelable(timeout time.Duration, cancelled func() bool, hide bool, name string, args ...string) (int, string) {
	for i := 0; i < 3; i++ {
		time.Sleep(500 * time.Millisecond)
		if cancelled() {
			return -2, ""
		}
	}
	if len(args) > 2 && strings.Contains(args[2], "DirectX") {
		return -1978335212, "No se encontró ningún paquete"
	}
	if len(args) > 0 && args[0] == "download" {
		for i, a := range args {
			if a == "-d" && i+1 < len(args) {
				_ = os.MkdirAll(args[i+1], 0o755)
				_ = os.WriteFile(filepath.Join(args[i+1], args[2]+"-setup.exe"), []byte("Inno Setup fake"), 0o644)
			}
		}
	}
	return 0, "Instalado correctamente"
}

func runRaw(timeout time.Duration, cancelled func() bool, hide bool, prog, cmdline string) (int, string) {
	time.Sleep(1200 * time.Millisecond)
	if strings.Contains(cmdline, "Driver") {
		return 3010, ""
	}
	return 0, ""
}

func readMeta(paths []string) map[string]MetaCache {
	m := map[string]MetaCache{}
	for _, p := range paths {
		m[p] = MetaCache{Product: strings.TrimSuffix(filepath.Base(p), filepath.Ext(p))}
	}
	return m
}

// Nombres reales de archivos publicados por cada proyecto (para probar la elección del instalador).
var ghSamples = map[string][]string{
	"zhongyang219/TrafficMonitor":               {"TrafficMonitor_V1.85.1_x64.zip", "TrafficMonitor_V1.85.1_x86.zip", "TrafficMonitor_V1.85.1_x64_Lite.zip", "TrafficMonitor_V1.85.1_arm64ec.zip"},
	"sandboxie-plus/Sandboxie":                  {"Sandboxie-Plus-x64-v1.16.3.exe", "Sandboxie-Plus-ARM64-v1.16.3.exe", "Sandboxie-Classic-x64-v5.71.3.exe", "Sandboxie-Plus-x64-v1.16.3.exe.sig"},
	"winsiderss/systeminformer":                 {"systeminformer-3.2.25078-release-setup.exe", "systeminformer-3.2.25078-release-bin.zip", "systeminformer-3.2.25078-release-setup.exe.sig"},
	"namazso/OpenHashTab":                       {"OpenHashTab_Machine.msi", "OpenHashTab_User.msi", "OpenHashTab_setup.exe"},
	"barry-ran/QtScrcpy":                        {"QtScrcpy-win-x64-v3.3.1.zip", "QtScrcpy-win-x86-v3.3.1.zip", "QtScrcpy-mac-arm64-v3.3.1.dmg", "QtScrcpy-ubuntu-22.04-x64-v3.3.1.zip"},
	"viarotel-org/escrcpy":                      {"Escrcpy-1.30.2-win-x64.exe", "Escrcpy-1.30.2-win-arm64.exe", "Escrcpy-1.30.2-win-x64.zip", "Escrcpy-1.30.2-mac-arm64.dmg", "Escrcpy-1.30.2-linux-x86_64.AppImage"},
	"memtest86plus/memtest86plus":               {"mt86plus_7.20_64.iso.zip", "mt86plus_7.20_64.grub.iso.zip", "mt86plus_7.20_32.iso.zip", "mt86plus_7.20_64.binaries.zip", "mt86plus_7.20_la64.iso.zip"},
	"rescuezilla/rescuezilla":                   {"rescuezilla-2.6.1-64bit.oracular.iso", "rescuezilla-2.6.1-64bit.noble.iso", "rescuezilla-2.6.1-32bit.bionic.iso", "SHA256SUM"},
	"ONLYOFFICE/DesktopEditors":                 {"DesktopEditors_x64.exe", "DesktopEditors_x64.msi", "DesktopEditors_x86.exe", "DesktopEditors_x86.msi", "DesktopEditors_arm64.exe", "ONLYOFFICE-x86_64.AppImage", "ONLYOFFICE-arm.dmg"},
	"ferdium/ferdium-app":                       {"Ferdium-Setup-7.1.0.exe", "Ferdium-Setup-7.1.0-arm64.exe", "Ferdium-win-portable-7.1.0.exe", "Ferdium-7.1.0.dmg", "Ferdium-7.1.0.AppImage", "latest.yml"},
	"QL-Win/QuickLook":                          {"QuickLook-4.0.2.msi", "QuickLook-4.0.2.zip"},
	"Flow-Launcher/Flow.Launcher":               {"Flow-Launcher-Setup.exe", "Flow-Launcher-Portable.zip", "FlowLauncher-1.20.2-full.nupkg", "RELEASES"},
	"espanso/espanso":                           {"Espanso-Win-Installer-x86_64.exe", "Espanso-Win-Portable-x86_64.zip", "Espanso-Mac-Universal.zip", "espanso-debian-x11-amd64.deb"},
	"d2phap/ImageGlass":                         {"ImageGlass_9.3.2.520_x64.msi", "ImageGlass_9.3.2.520_x64.zip", "ImageGlass_9.3.2.520_arm64.msi"},
	"koodo-reader/koodo-reader":                 {"Koodo-Reader-2.0.9.exe", "Koodo-Reader-2.0.9-x64-Portable.exe", "Koodo-Reader-2.0.9-arm64.exe", "Koodo-Reader-2.0.9.dmg", "Koodo-Reader-2.0.9-x86_64.AppImage"},
	"edrlab/thorium-reader":                     {"Thorium.Setup.3.2.1.exe", "Thorium.Setup.3.2.1.arm64.exe", "Thorium-3.2.1.dmg", "Thorium-3.2.1.AppImage"},
	"musescore/MuseScore":                       {"MuseScore-Studio-4.5.2.251141401-x86_64.msi", "MuseScore-Studio-4.5.2.251141401.dmg", "MuseScore-Studio-4.5.2.251141401-x86_64.AppImage"},
	"LMMS/lmms":                                 {"lmms-1.2.2-win64.exe", "lmms-1.2.2-win32.exe", "lmms-1.2.2-mac10.13.dmg", "lmms-1.2.2-linux-x86_64.AppImage"},
	"PintaProject/Pinta":                        {"Pinta.exe", "Pinta.dmg", "pinta-3.0.3.tar.gz"},
	"jellyfin/jellyfin-media-player":            {"JellyfinMediaPlayer-1.12.0-windows-x64.exe", "JellyfinMediaPlayer-1.12.0-windows-x64-legacy.exe", "JellyfinMediaPlayer-1.12.0-macos.dmg"},
	"nomic-ai/gpt4all":                          {"gpt4all-installer-win64-v3.10.0.exe", "gpt4all-installer-win64-arm-v3.10.0.exe", "gpt4all-installer-darwin-v3.10.0.dmg", "gpt4all-installer-linux-v3.10.0.run"},
	"CherryHQ/cherry-studio":                    {"Cherry-Studio-1.5.3-x64-setup.exe", "Cherry-Studio-1.5.3-x64-portable.exe", "Cherry-Studio-1.5.3-arm64-setup.exe", "Cherry-Studio-1.5.3-arm64.dmg", "latest.yml"},
	"chidiwilliams/buzz":                        {"Buzz-1.2.0-windows.exe", "Buzz-1.2.0-windows-1.bin", "Buzz-1.2.0-mac.dmg"},
	"Comfy-Org/desktop":                         {"ComfyUI.Setup.0.4.60.-.x64.exe", "ComfyUI-0.4.60-arm64.dmg"},
	"LykosAI/StabilityMatrix":                   {"StabilityMatrix-win-x64.zip", "StabilityMatrix-linux-x64.zip", "StabilityMatrix-macos-arm64.dmg"},
	"coreybutler/nvm-windows":                   {"nvm-setup.exe", "nvm-setup.zip", "nvm-noinstall.zip", "nvm-update.zip", "checksums.txt"},
	"DevToys-app/DevToys":                       {"devtoys_win_x64.exe", "devtoys_win_x64_portable.zip", "devtoys_win_arm64.exe", "devtoys_osx_arm64.zip", "devtoys_linux_x64.deb"},
	"Kong/insomnia":                             {"Insomnia.Core-11.4.0.exe", "Insomnia.Core-11.4.0.dmg", "Insomnia.Core-11.4.0.AppImage", "Insomnia.Core-11.4.0.deb"},
	"beekeeper-studio/beekeeper-studio":         {"Beekeeper-Studio-Setup-5.3.4.exe", "Beekeeper-Studio-5.3.4-portable.exe", "Beekeeper-Studio-5.3.4.dmg", "Beekeeper-Studio-5.3.4.AppImage"},
	"podman-desktop/podman-desktop":             {"podman-desktop-1.21.0-setup-x64.exe", "podman-desktop-1.21.0-x64.exe", "podman-desktop-1.21.0-setup-arm64.exe", "podman-desktop-1.21.0-universal.dmg"},
	"zed-industries/zed":                        {"Zed-x86_64.exe", "Zed-aarch64.exe", "Zed-aarch64.dmg", "zed-linux-x86_64.tar.gz"},
	"ramensoftware/windhawk":                    {"windhawk_setup.exe"},
	"rocksdanister/lively":                      {"lively_setup_x86_full_v2200.exe", "lively_setup_x86_full_v2200.exe.sha256"},
	"rainmeter/rainmeter":                       {"Rainmeter-4.5.22.exe"},
	"moudey/Shell":                              {"setup-1.9.18-x64.msi", "setup-1.9.18-arm64.msi", "nilesoft-shell-1.9.18.zip"},
	"Heroic-Games-Launcher/HeroicGamesLauncher": {"Heroic-2.18.0-Setup-x64.exe", "Heroic-2.18.0-Portable-x64.exe", "Heroic-2.18.0-macOS-arm64.dmg", "Heroic-2.18.0-linux-x86_64.AppImage"},
	"PrismLauncher/PrismLauncher":               {"PrismLauncher-Windows-MSVC-Setup-9.4.exe", "PrismLauncher-Windows-MSVC-Portable-9.4.zip", "PrismLauncher-Windows-MSVC-arm64-Setup-9.4.exe", "PrismLauncher-Windows-MinGW-w64-Setup-9.4.exe", "PrismLauncher-macOS-9.4.zip"},
	"storytold/craft-launcher":                  {"craft-launcher-0.2.1-windows-x64.msi", "craft-launcher-0.2.1-macos-arm64.dmg", "craft-launcher-0.2.1-linux-x64.AppImage"},
	"storytold/photocraft":                      {"photocraft-0.7.0-windows-x64.msi", "photocraft-0.7.0-windows-arm64.msi", "photocraft-0.7.0-macos.dmg"},
	"storytold/pdfcraft":                        {"pdfcraft-0.3.2-windows-x64.msi"},
	"Genymobile/scrcpy":                         {"scrcpy-win64-v3.3.1.zip", "scrcpy-win32-v3.3.1.zip", "scrcpy-linux-x86_64-v3.3.1.tar.gz", "scrcpy-macos-aarch64-v3.3.1.tar.gz", "scrcpy-server-v3.3.1", "SHA256SUMS.txt"},
	"Universal-Debloater-Alliance/universal-android-debloater-next-generation": {"uad-ng-linux", "uad-ng-macos", "uad-ng-windows.exe", "uad-ng-noselfupdate-windows.exe"},
	"balena-io/etcher":                          {"balenaEtcher-2.1.0.Setup.exe", "balenaEtcher-2.1.0-x64.AppImage", "balenaEtcher-2.1.0-arm64.dmg", "balena-etcher_2.1.0_amd64.deb", "balenaEtcher-win32-x64-2.1.0.zip"},
	"raspberrypi/rpi-imager":                    {"imager-1.9.4.exe", "imager-1.9.4.dmg", "imager-1.9.4_amd64.AppImage", "rpi-imager_1.9.4_amd64.deb"},
	"localsend/localsend":                       {"LocalSend-1.17.0-windows-x86-64.exe", "LocalSend-1.17.0-windows-x86-64.msix", "LocalSend-1.17.0-windows-x86-64.zip", "LocalSend-1.17.0-windows-arm64.exe", "LocalSend-1.17.0-linux-x86-64.AppImage", "LocalSend-1.17.0.dmg"},
	"LibreHardwareMonitor/LibreHardwareMonitor": {"LibreHardwareMonitor-net472.zip", "LibreHardwareMonitor-net8.0.zip"},
	"Klocman/Bulk-Crap-Uninstaller":             {"BCUninstaller_5.8.3_setup.exe", "BCUninstaller_5.8.3_portable.zip", "BCUninstaller_5.8.3_net4_portable.zip"},
	"lostindark/DriverStoreExplorer":            {"DriverStoreExplorer.v1.0.25.zip"},
	"Open-Shell/Open-Shell-Menu":                {"OpenShellSetup_4_4_196.exe", "OpenShellSymbols_4_4_196.7z"},
	"henrypp/memreduct":                         {"memreduct-3.5.2-setup.exe", "memreduct-3.5.2-setup.exe.sig", "memreduct-3.5.2-bin.zip"},
	"xanderfrangos/twinkle-tray":                {"Twinkle.Tray.v1.16.7.exe", "latest.yml", "Twinkle.Tray.v1.16.7.exe.blockmap"},
	"flameshot-org/flameshot":                   {"Flameshot-12.1.0-win64.msi", "Flameshot-12.1.0-win64.zip", "Flameshot-12.1.0.dmg", "flameshot-12.1.0-1.ubuntu-22.04.amd64.deb"},
	"NickeManarin/ScreenToGif":                  {"ScreenToGif.2.41.1.Setup.x64.msi", "ScreenToGif.2.41.1.Setup.arm64.msi", "ScreenToGif.2.41.1.Portable.x64.zip", "ScreenToGif.2.41.1.Package.x64.msix"},
	"peazip/PeaZip":                             {"peazip-10.5.0.WIN64.exe", "peazip-10.5.0.WINDOWS.exe", "peazip_portable-10.5.0.WIN64.zip", "peazip-10.5.0.LINUX.GTK2-1.x86_64.rpm", "peazip-10.5.0.DARWIN.aarch64.dmg"},
	"Tichau/FileConverter":                      {"FileConverter-2.1-x64-setup.msi", "FileConverter-2.1-x86-setup.msi"},
	"WinMerge/winmerge":                         {"WinMerge-2.16.48-x64-Setup.exe", "WinMerge-2.16.48-x64-PerUser-Setup.exe", "WinMerge-2.16.48-Setup.exe", "winmerge-2.16.48-x64-exe.zip", "WinMerge-2.16.48-ARM64-Setup.exe"},
	"agalwood/Motrix":                           {"Motrix-Setup-1.8.19.exe", "Motrix-1.8.19-win.zip", "Motrix-1.8.19-ia32-win.zip", "Motrix-1.8.19.dmg", "Motrix-1.8.19.AppImage"},
	"AutoHotkey/AutoHotkey":                     {"AutoHotkey_2.0.19_setup.exe"},
	"AppFlowy-IO/AppFlowy":                      {"AppFlowy-0.9.6-windows-x86_64.exe", "AppFlowy-0.9.6-windows-x86_64.zip", "AppFlowy-0.9.6-linux-x86_64.deb", "AppFlowy-0.9.6-macos-universal.dmg"},
	"laurent22/joplin":                          {"Joplin-Setup-3.3.13.exe", "Joplin-Portable.exe", "Joplin-3.3.13.AppImage", "Joplin-3.3.13-arm64.DMG", "latest.yml"},
	"siyuan-note/siyuan":                        {"siyuan-3.2.0-win.exe", "siyuan-3.2.0-win-arm64.exe", "siyuan-3.2.0-win.zip", "siyuan-3.2.0-mac.dmg", "siyuan-3.2.0-linux.AppImage"},
	"logseq/logseq":                             {"Logseq-win-x64-0.10.9.exe", "Logseq-win-x64-0.10.9.nupkg", "logseq-win-x64-0.10.9.msi", "Logseq-darwin-arm64-0.10.9.dmg", "Logseq-linux-x64-0.10.9.AppImage"},
	"marktext/marktext":                         {"marktext-setup.exe", "marktext-x64.zip", "marktext-x86_64.AppImage", "marktext-x64.dmg"},
	"keepassxreboot/keepassxc":                  {"KeePassXC-2.7.10-Win64.msi", "KeePassXC-2.7.10-Win64.msi.sig", "KeePassXC-2.7.10-Win64.msi.DIGEST", "KeePassXC-2.7.10-Win64-LegacyWindows.msi", "KeePassXC-2.7.10-Win64.zip", "KeePassXC-2.7.10-x86_64.AppImage"},
	"upscayl/upscayl":                           {"upscayl-2.15.0-win.exe", "upscayl-2.15.0-mac.dmg", "upscayl-2.15.0-linux.AppImage"},
	"HandBrake/HandBrake":                       {"HandBrake-1.9.2-x86_64-Win_GUI.exe", "HandBrake-1.9.2-x86_64-Win_GUI.exe.sig", "HandBrake-1.9.2-arm64-Win_GUI.exe", "HandBrake-1.9.2-x86_64-Win_GUI.zip", "HandBrakeCLI-1.9.2-win-x86_64.zip", "HandBrake-1.9.2.dmg"},
	"FreeCAD/FreeCAD":                           {"FreeCAD_1.0.1-conda-Windows-x86_64-installer-1.exe", "FreeCAD_1.0.1-conda-Windows-x86_64-py311.7z", "FreeCAD_1.0.1-conda-Linux-x86_64-py311.AppImage", "FreeCAD_1.0.1-conda-macOS-arm64-py311.dmg"},
	"clsid2/mpc-hc":                             {"MPC-HC.2.4.3.x64.exe", "MPC-HC.2.4.3.x86.exe", "MPC-HC.2.4.3.x64.zip", "MPC-HC.2.4.3.x64.pdb.zip"},
	"mltframework/shotcut":                      {"shotcut-win64-250530.exe", "shotcut-win64-250530.zip", "shotcut-macos-250530.dmg", "shotcut-linux-x86_64-250530.AppImage", "sha256sums.txt"},
	"darktable-org/darktable":                   {"darktable-5.2.0-win64.exe", "darktable-5.2.0-x86_64.AppImage", "darktable-5.2.0-arm64.dmg"},
	"LizardByte/Sunshine":                       {"sunshine-windows-installer.exe", "sunshine-windows-portable.zip", "sunshine-ubuntu-24.04-amd64.deb"},
	"moonlight-stream/moonlight-qt":             {"MoonlightSetup-6.1.0.exe", "MoonlightPortable-x64-6.1.0.zip", "Moonlight-6.1.0.dmg", "Moonlight-6.1.0-x86_64.AppImage"},
	"JosefNemec/Playnite":                       {"Playnite1041.exe", "Playnite1041.zip"},
	"zen-browser/desktop":                       {"zen.installer.exe", "zen.installer-arm64.exe", "zen.win-x86_64.zip", "zen.linux-x86_64.tar.xz", "zen.macos-universal.dmg"},
	"ollama/ollama":                             {"OllamaSetup.exe", "ollama-windows-amd64.zip", "ollama-windows-arm64.zip", "ollama-linux-amd64.tgz", "Ollama-darwin.zip"},
	"janhq/jan":                                 {"Jan_0.6.4_x64-setup.exe", "Jan_0.6.4_amd64.deb", "Jan_0.6.4_universal.dmg"},
	"neovim/neovim":                             {"nvim-win64.msi", "nvim-win64.zip", "nvim-win-arm64.msi", "nvim-linux-x86_64.tar.gz", "nvim-macos-arm64.tar.gz"},
	"Eugeny/tabby":                              {"tabby-1.0.223-setup-x64.exe", "tabby-1.0.223-setup-arm64.exe", "tabby-1.0.223-portable-x64.zip", "tabby-1.0.223-linux-x64.deb", "tabby-1.0.223-macos-arm64.dmg"},
	"alacritty/alacritty":                       {"Alacritty-v0.15.1-installer.msi", "Alacritty-v0.15.1-portable.exe", "Alacritty-v0.15.1.dmg"},
	"PowerShell/PowerShell":                     {"PowerShell-7.5.2-win-x64.msi", "PowerShell-7.5.2-win-x86.msi", "PowerShell-7.5.2-win-arm64.msi", "PowerShell-7.5.2-win-x64.zip", "powershell-7.5.2-linux-x64.tar.gz", "PowerShell-7.5.2-win.msixbundle"},
	"WerWolv/ImHex":                             {"imhex-1.37.4-Windows-x86_64.msi", "imhex-1.37.4-Windows-Portable-x86_64.zip", "imhex-1.37.4-Windows-Portable-NoGPU-x86_64.zip", "imhex-1.37.4-Windows-arm64.msi", "imhex-1.37.4-macOS-arm64.dmg"},
	"dbeaver/dbeaver":                           {"dbeaver-ce-25.1.2-x86_64-setup.exe", "dbeaver-ce-25.1.2-win32.win32.x86_64.zip", "dbeaver-ce-25.1.2-aarch64-setup.exe", "dbeaver-ce-25.1.2-macos-aarch64.dmg", "dbeaver-ce_25.1.2_amd64.deb"},
	"usebruno/bruno":                            {"bruno_2.7.0_x64_win.exe", "bruno_2.7.0_x64_win.zip", "bruno_2.7.0_arm64_mac.dmg", "bruno_2.7.0_amd64_linux.deb"},
	"VSCodium/vscodium":                         {"VSCodiumSetup-x64-1.101.24242.exe", "VSCodiumUserSetup-x64-1.101.24242.exe", "VSCodium-x64-1.101.24242.msi", "VSCodium-x64-updates-disabled-1.101.24242.msi", "VSCodium-win32-x64-1.101.24242.zip", "VSCodium-x64-1.101.24242.msi.sha256", "VSCodium-arm64-1.101.24242.msi"},
	"HeidiSQL/HeidiSQL":                         {"HeidiSQL_12.11.0.7065_Setup.exe", "HeidiSQL_12.11_64_Portable.zip", "HeidiSQL_12.11_32_Portable.zip"},
}

func init() {
	ghFetch = func(repo string) (*GHRelease, error) {
		time.Sleep(150 * time.Millisecond)
		names := ghSamples[repo]
		if names == nil {
			return nil, fmt.Errorf("todavía no tiene versión para Windows")
		}
		r := GHRelease{Tag: "v" + mockVerRe.FindString(strings.Join(names, " ")), Date: "2026-09-20T12:00:00Z"}
		if r.Tag == "v" {
			r.Tag = "v1.0.0"
		}
		for k, n := range names {
			r.Assets = append(r.Assets, GHAsset{Name: n, URL: "https://example/" + n, Size: int64(30+k*7) << 20})
		}
		return chooseRelease(repo, []GHRelease{r})
	}
	ghStarsFetch = func(repos []string) (map[string]int, error) {
		return map[string]int{"genymobile/scrcpy": 128450, "ollama/ollama": 152300, "localsend/localsend": 71200}, nil
	}
	ghDownloadFn = func(repo, dir string, cancelled func() bool) (string, string, error) {
		r, err := ghFetch(repo)
		if err != nil {
			return "", "", err
		}
		_ = os.MkdirAll(dir, 0o755)
		a := pickAsset(repo, r)
		p := filepath.Join(dir, a.Name)
		time.Sleep(800 * time.Millisecond)
		if strings.HasSuffix(strings.ToLower(a.Name), ".iso.zip") {
			f, _ := os.Create(p)
			zw := zip.NewWriter(f)
			w, _ := zw.Create(strings.TrimSuffix(a.Name, ".zip"))
			_, _ = w.Write([]byte("ISO"))
			zw.Close()
			f.Close()
		} else if g := ghItem(repo); g != nil && g.Portable != "" && strings.HasSuffix(strings.ToLower(a.Name), ".zip") {
			f, _ := os.Create(p)
			zw := zip.NewWriter(f)
			w, _ := zw.Create("paquete-v1/" + g.Portable)
			_, _ = w.Write([]byte("MZ"))
			zw.Close()
			f.Close()
		} else {
			_ = os.WriteFile(p, []byte("MZ"), 0o644)
		}
		return p, strings.TrimPrefix(r.Tag, "v"), nil
	}
}

var mockVerRe = regexp.MustCompile(`\d+\.\d+(\.\d+)?`)
