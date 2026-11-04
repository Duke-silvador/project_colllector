package main

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
)

type Item struct {
	ID        string `json:"id"`
	Kind      string `json:"kind"` // local | winget
	Name      string `json:"name"`
	Version   string `json:"version,omitempty"`
	Publisher string `json:"publisher,omitempty"`
	Category  string `json:"category"`
	Desc      string `json:"desc,omitempty"`
	Icon      string `json:"icon,omitempty"`
	File      string `json:"file,omitempty"`
	Size      int64  `json:"size,omitempty"`
	Type      string `json:"type,omitempty"`
	Args      string `json:"args"`
	Mode      string `json:"mode"`
	WingetID  string `json:"wingetId,omitempty"`
	Source    string `json:"source,omitempty"`
	Match     string `json:"match"`
	Installed bool   `json:"installed"`
	Hidden    bool   `json:"hidden,omitempty"`
	Custom    bool   `json:"custom,omitempty"`
	Repo      string `json:"repo,omitempty"`
	Stars     int    `json:"stars,omitempty"`
	Portable  bool   `json:"portable,omitempty"`
	ISO       bool   `json:"iso,omitempty"`
}

var exts = map[string]bool{".exe": true, ".msi": true, ".msix": true, ".msixbundle": true, ".appx": true, ".appxbundle": true}

// Parámetros silenciosos según la tecnología del instalador.
var silentArgs = map[string]string{
	"msi":           "/qn /norestart",
	"inno":          "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-",
	"nsis":          "/S",
	"installshield": `/s /v"/qn /norestart"`,
	"burn":          "/quiet /norestart",
	"squirrel":      "--silent",
	"advinst":       "/exenoui /qn /norestart",
	"msix":          "",
	"unknown":       "",
}

var typeNames = map[string]string{"msi": "MSI", "inno": "Inno Setup", "nsis": "NSIS", "installshield": "InstallShield", "burn": "WiX Burn", "squirrel": "Squirrel", "advinst": "Advanced Installer", "msix": "MSIX / AppX", "unknown": "Desconocido"}

// detectType busca firmas conocidas dentro del ejecutable.
func detectType(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".msi":
		return "msi"
	case ".msix", ".msixbundle", ".appx", ".appxbundle":
		return "msix"
	}
	f, err := os.Open(path)
	if err != nil {
		return "unknown"
	}
	defer f.Close()
	head := make([]byte, 6<<20)
	n, _ := io.ReadFull(f, head)
	head = head[:n]
	var tail []byte
	if fi, err := f.Stat(); err == nil && fi.Size() > int64(len(head)) {
		size := int64(1 << 20)
		if fi.Size()-int64(len(head)) < size {
			size = fi.Size() - int64(len(head))
		}
		tail = make([]byte, size)
		_, _ = f.ReadAt(tail, fi.Size()-size)
	}
	has := func(s string) bool {
		return bytes.Contains(head, []byte(s)) || bytes.Contains(tail, []byte(s)) || bytes.Contains(head, utf16(s))
	}
	switch {
	case has("Inno Setup"):
		return "inno"
	case has("Nullsoft Install System") || has("NullsoftInst") || has("NSIS Error"):
		return "nsis"
	case has("WixBundleManifest") || has(".wixburn") || has("WixBurn"):
		return "burn"
	case has("InstallShield"):
		return "installshield"
	case has("Advanced Installer"):
		return "advinst"
	case has("Squirrel") && has("Update.exe"):
		return "squirrel"
	}
	return "unknown"
}

func utf16(s string) []byte {
	b := make([]byte, 0, len(s)*2)
	for _, r := range s {
		b = append(b, byte(r), 0)
	}
	return b
}

var (
	scanMu    sync.Mutex
	scanItems []Item
	scanAt    time.Time
)

var junkWords = regexp.MustCompile(`(?i)\b(setup|installer|instalador|install|x64|x86|64-?bit|32-?bit|win(dows)?\s?(10|11|64|32)?|offline|online|full|portable|stub)\b`)
var verRe = regexp.MustCompile(`[_\-\s\.]*v?\d+([._]\d+)+[a-z0-9._-]*`)

func niceName(s string) string {
	s = strings.ReplaceAll(s, "_", " ")
	s = verRe.ReplaceAllString(s, " ")
	s = junkWords.ReplaceAllString(s, " ")
	s = strings.Join(strings.Fields(strings.Trim(s, " -.")), " ")
	return s
}

func scanLocal(force bool) []Item {
	scanMu.Lock()
	defer scanMu.Unlock()
	if !force && scanItems != nil && time.Since(scanAt) < 30*time.Second {
		return scanItems
	}
	var files []string
	_ = filepath.WalkDir(libDir, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if rel, _ := filepath.Rel(libDir, p); strings.Count(rel, string(os.PathSeparator)) >= 3 {
				return filepath.SkipDir
			}
			return nil
		}
		if exts[strings.ToLower(filepath.Ext(p))] {
			files = append(files, p)
		}
		return nil
	})
	// metadatos nuevos o cambiados
	var need []string
	cfgMu.Lock()
	for _, p := range files {
		fi, err := os.Stat(p)
		if err != nil {
			continue
		}
		m, ok := cfg.Meta[p]
		if !ok || m.Size != fi.Size() || m.Mod != fi.ModTime().Unix() {
			need = append(need, p)
		}
	}
	cfgMu.Unlock()
	if len(need) > 0 {
		meta := readMeta(need)
		cfgMu.Lock()
		for _, p := range need {
			fi, err := os.Stat(p)
			if err != nil {
				continue
			}
			m := meta[p]
			m.Size, m.Mod = fi.Size(), fi.ModTime().Unix()
			m.Type = detectType(p)
			cfg.Meta[p] = m
		}
		_ = saveConfig()
		cfgMu.Unlock()
	}
	var items []Item
	cfgMu.Lock()
	for _, p := range files {
		m := cfg.Meta[p]
		rel, _ := filepath.Rel(libDir, p)
		rel = filepath.ToSlash(rel)
		cat := "Mis instaladores"
		if i := strings.Index(rel, "/"); i > 0 {
			cat = rel[:i]
		}
		name := niceName(m.Product)
		if name == "" {
			name = niceName(m.Desc)
		}
		if name == "" {
			name = niceName(strings.TrimSuffix(filepath.Base(p), filepath.Ext(p)))
		}
		if name == "" {
			name = filepath.Base(p)
		}
		it := Item{ID: "l:" + rel, Kind: "local", Name: name, Version: strings.TrimSpace(m.Version), Publisher: strings.TrimSpace(m.Company),
			Category: cat, Desc: localDesc(name, filepath.Base(p), m.Product, cat), Icon: m.Icon, File: rel, Size: m.Size, Type: m.Type,
			Args: silentArgs[m.Type], Mode: "silent", Match: name}
		if m.Type == "unknown" {
			it.Mode = "normal"
		}
		items = append(items, it)
	}
	cfgMu.Unlock()
	scanItems, scanAt = items, time.Now()
	return items
}

func buildState(rescan bool) map[string]any {
	items := append([]Item{}, scanLocal(rescan)...)
	cfgMu.Lock()
	cat := append(append([]CatalogItem{}, catalog...), cfg.Custom...)
	customIDs := map[string]bool{}
	for _, c := range cfg.Custom {
		customIDs[c.WingetID] = true
	}
	cfgMu.Unlock()
	for _, c := range cat {
		m := c.Match
		if m == "" {
			m = c.Name
		}
		items = append(items, Item{ID: "w:" + c.WingetID, Kind: "winget", Name: c.Name, Category: c.Category, Desc: c.Desc,
			WingetID: c.WingetID, Source: c.Source, Mode: "silent", Match: m, Custom: customIDs[c.WingetID]})
	}
	for _, g := range ghCatalog {
		m := g.Match
		if m == "" {
			m = g.Name
		}
		it := Item{ID: "g:" + g.Repo, Kind: "github", Name: g.Name, Category: g.Category, Desc: g.Desc, Repo: g.Repo,
			Source: "github", Mode: "silent", Match: m, Type: "auto", Stars: g.Stars, Portable: g.Portable != "",
			Version: ghCachedVersion(g.Repo)}
		if it.Portable {
			it.Type = "portable"
		}
		if g.ISO {
			it.Type, it.ISO = "iso", true
		}
		items = append(items, it)
	}
	names := installedNames(rescan)
	cfgMu.Lock()
	for i := range items {
		if o, ok := cfg.Items[items[i].ID]; ok {
			if o.Name != "" {
				items[i].Name = o.Name
			}
			if o.Category != "" {
				items[i].Category = o.Category
			}
			if o.Mode != "" {
				items[i].Mode = o.Mode
				items[i].Args = o.Args
			}
			if o.Match != "" {
				items[i].Match = o.Match
			}
			if o.Desc != "" {
				items[i].Desc = o.Desc
			}
			items[i].Hidden = o.Hidden
		}
		if g := ghItem(items[i].Repo); items[i].Kind == "github" && g != nil && g.ISO {
			items[i].Installed = isoInKit(items[i].Repo)
		} else if items[i].Portable {
			items[i].Installed = portableInstalled(items[i].Repo)
		} else {
			items[i].Installed = isInstalled(items[i].Match, names)
		}
	}
	profiles := cfg.Profiles
	cfgMu.Unlock()
	sort.SliceStable(items, func(a, b int) bool {
		if items[a].Kind != items[b].Kind {
			return items[a].Kind == "local"
		}
		return false
	})
	return map[string]any{"items": items, "profiles": profiles, "folder": libDir, "config": cfgPath,
		"winget": wingetVersion(), "admin": isAdmin(), "types": typeNames, "silent": silentArgs}
}

var normRe = regexp.MustCompile(`[^a-z0-9+]+`)

func norm(s string) string {
	return " " + strings.TrimSpace(normRe.ReplaceAllString(strings.ToLower(s), " ")) + " "
}

func isInstalled(match string, names []string) bool {
	m := norm(match)
	if strings.TrimSpace(m) == "" {
		return false
	}
	for _, n := range names {
		if strings.Contains(norm(n), m) {
			return true
		}
	}
	return false
}
