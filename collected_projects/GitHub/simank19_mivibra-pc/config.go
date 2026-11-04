package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// Override: ajustes del usuario sobre un programa (nombre, categoría, parámetros, oculto).
type Override struct {
	ID       string `json:"id"`
	Name     string `json:"name,omitempty"`
	Category string `json:"category,omitempty"`
	Args     string `json:"args,omitempty"`
	Mode     string `json:"mode,omitempty"` // silent | normal
	Match    string `json:"match,omitempty"`
	Hidden   bool   `json:"hidden,omitempty"`
	Desc     string `json:"desc,omitempty"`
}

type MetaCache struct {
	Size    int64  `json:"size"`
	Mod     int64  `json:"mod"`
	Product string `json:"product"`
	Desc    string `json:"desc"`
	Company string `json:"company"`
	Version string `json:"version"`
	Icon    string `json:"icon"`
	Type    string `json:"type"`
}

type Config struct {
	Items    map[string]Override  `json:"items"`
	Profiles map[string][]string  `json:"profiles"`
	ProfRev  int                  `json:"profRev,omitempty"`
	Custom   []CatalogItem        `json:"custom"`
	Meta     map[string]MetaCache `json:"meta"`
	NoUpdate bool                 `json:"noAutoUpdate,omitempty"`
}

var (
	cfgMu   sync.Mutex
	cfg     Config
	baseDir string // carpeta del .exe (portable)
	libDir  string // biblioteca de instaladores
	cfgPath string
	workDir string // archivos de la cola de instalación
)

func initPaths() {
	exe, _ := os.Executable()
	baseDir = filepath.Dir(exe)
	if os.Getenv("MIVIBRA_DIR") != "" {
		baseDir = os.Getenv("MIVIBRA_DIR")
	}
	libDir = filepath.Join(baseDir, "Instaladores")
	cfgPath = filepath.Join(baseDir, "programas.json")
	// si la carpeta del .exe no admite escritura (p. ej. Archivos de programa), usar AppData
	if f, err := os.CreateTemp(baseDir, ".mv-*"); err == nil {
		name := f.Name()
		f.Close()
		os.Remove(name)
	} else {
		alt := filepath.Join(os.Getenv("APPDATA"), "MiVibraInstalador")
		_ = os.MkdirAll(alt, 0o755)
		cfgPath = filepath.Join(alt, "programas.json")
	}
	_ = os.MkdirAll(libDir, 0o755)
	workDir = filepath.Join(os.TempDir(), "MiVibraInstalador")
	_ = os.MkdirAll(workDir, 0o755)
	loadConfig()
}

func loadConfig() {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	cfg = Config{}
	if b, err := os.ReadFile(cfgPath); err == nil {
		_ = json.Unmarshal(b, &cfg)
	}
	if cfg.Items == nil {
		cfg.Items = map[string]Override{}
	}
	if cfg.Meta == nil {
		cfg.Meta = map[string]MetaCache{}
	}
	if cfg.Profiles == nil {
		cfg.Profiles = defaultProfiles()
	}
	if cfg.ProfRev < 2 { // perfiles nuevos de esta versión, sin tocar los del usuario
		for k, v := range defaultProfiles() {
			if _, ok := cfg.Profiles[k]; !ok {
				cfg.Profiles[k] = v
			}
		}
		cfg.ProfRev = 2
	}
}

// saveConfig: llamar con cfgMu tomado.
func saveConfig() error {
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	tmp := cfgPath + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, cfgPath)
}

func defaultProfiles() map[string][]string {
	return map[string][]string{
		"Básico":                   {"w:Google.Chrome", "w:7zip.7zip", "w:VideoLAN.VLC", "w:Adobe.Acrobat.Reader.64-bit", "w:AnyDesk.AnyDesk", "w:Microsoft.VCRedist.2015+.x64"},
		"Oficina":                  {"w:Google.Chrome", "w:7zip.7zip", "w:TheDocumentFoundation.LibreOffice", "w:Adobe.Acrobat.Reader.64-bit", "w:Zoom.Zoom", "w:AnyDesk.AnyDesk", "w:Google.GoogleDrive"},
		"Técnico":                  {"w:7zip.7zip", "w:AnyDesk.AnyDesk", "w:CPUID.CPU-Z", "w:CPUID.HWMonitor", "w:CrystalDewWorld.CrystalDiskInfo", "w:CrystalDewWorld.CrystalDiskMark", "w:REALiX.HWiNFO", "w:Rufus.Rufus", "w:Ventoy.Ventoy", "w:Google.PlatformTools", "w:Notepad++.Notepad++", "w:voidtools.Everything", "w:Malwarebytes.Malwarebytes"},
		"ArtCraft":                 {"g:storytold/craft-launcher", "g:storytold/photocraft", "g:storytold/pdfcraft"},
		"Taller celulares (libre)": {"g:Genymobile/scrcpy", "g:Universal-Debloater-Alliance/universal-android-debloater-next-generation", "g:localsend/localsend", "g:balena-io/etcher", "w:Google.PlatformTools"},
		"Técnico libre":            {"g:LibreHardwareMonitor/LibreHardwareMonitor", "g:Klocman/Bulk-Crap-Uninstaller", "g:lostindark/DriverStoreExplorer", "g:peazip/PeaZip", "g:flameshot-org/flameshot", "g:keepassxreboot/keepassxc", "g:henrypp/memreduct"},
		"Gamer":                    {"w:Google.Chrome", "w:Valve.Steam", "w:EpicGames.EpicGamesLauncher", "w:Discord.Discord", "w:OBSProject.OBSStudio", "w:Microsoft.VCRedist.2015+.x64", "w:Microsoft.VCRedist.2015+.x86", "w:Microsoft.DirectX"},
	}
}
