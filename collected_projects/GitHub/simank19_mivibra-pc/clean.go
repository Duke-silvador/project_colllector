package main

import (
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"
)

type cleanCat struct {
	ID, Label, Desc string
	Globs           []string // carpetas (o archivos con comodines) a limpiar
	Files           bool     // los globs son archivos, no carpetas
	Admin           bool
	OlderThan       time.Duration
}

func cleanCats() []cleanCat {
	local := os.Getenv("LOCALAPPDATA")
	roaming := os.Getenv("APPDATA")
	win := os.Getenv("SystemRoot")
	pdata := os.Getenv("ProgramData")
	j := filepath.Join
	if runtime.GOOS != "windows" {
		return []cleanCat{{ID: "temp", Label: "Archivos temporales", Desc: "Carpeta temporal", Globs: []string{os.TempDir()}, OlderThan: 24 * time.Hour}}
	}
	return []cleanCat{
		{ID: "temp", Label: "Archivos temporales del usuario", Desc: "Restos de instalaciones y programas (%TEMP%)", Globs: []string{os.TempDir()}, OlderThan: 24 * time.Hour},
		{ID: "wintemp", Label: "Temporales de Windows", Desc: "Carpeta Windows\\Temp", Globs: []string{j(win, "Temp")}, Admin: true, OlderThan: 24 * time.Hour},
		{ID: "wu", Label: "Caché de Windows Update", Desc: "Instaladores de actualizaciones ya aplicadas", Globs: []string{
			j(win, "SoftwareDistribution", "Download"),
			j(win, "ServiceProfiles", "NetworkService", "AppData", "Local", "Microsoft", "Windows", "DeliveryOptimization", "Cache")}, Admin: true},
		{ID: "browsers", Label: "Caché de navegadores", Desc: "Chrome, Edge, Brave, Opera y Firefox (ciérralos antes)", Globs: []string{
			j(local, "Google", "Chrome", "User Data", "*", "Cache"), j(local, "Google", "Chrome", "User Data", "*", "Code Cache"), j(local, "Google", "Chrome", "User Data", "*", "GPUCache"),
			j(local, "Microsoft", "Edge", "User Data", "*", "Cache"), j(local, "Microsoft", "Edge", "User Data", "*", "Code Cache"), j(local, "Microsoft", "Edge", "User Data", "*", "GPUCache"),
			j(local, "BraveSoftware", "Brave-Browser", "User Data", "*", "Cache"), j(local, "BraveSoftware", "Brave-Browser", "User Data", "*", "Code Cache"),
			j(local, "Opera Software", "Opera Stable", "Cache"), j(roaming, "Opera Software", "Opera Stable", "Cache"),
			j(local, "Mozilla", "Firefox", "Profiles", "*", "cache2")}},
		{ID: "crash", Label: "Reportes de errores y volcados", Desc: "Informes de fallos ya enviados o descartados", Globs: []string{
			j(local, "CrashDumps"), j(local, "Microsoft", "Windows", "WER", "ReportArchive"), j(local, "Microsoft", "Windows", "WER", "ReportQueue"),
			j(pdata, "Microsoft", "Windows", "WER", "ReportArchive"), j(pdata, "Microsoft", "Windows", "WER", "ReportQueue"), j(win, "Minidump"), j(win, "LiveKernelReports")}},
		{ID: "thumbs", Label: "Caché de miniaturas", Desc: "Vistas previas del Explorador; Windows las vuelve a crear", Files: true, Globs: []string{
			j(local, "Microsoft", "Windows", "Explorer", "thumbcache_*.db")}},
	}
}

func expand(globs []string) []string {
	var out []string
	for _, g := range globs {
		if strings.ContainsAny(g, "*?[") {
			m, _ := filepath.Glob(g)
			out = append(out, m...)
		} else {
			out = append(out, g)
		}
	}
	return out
}

func walkCat(c cleanCat, del bool) (bytes int64, files int) {
	cut := time.Now().Add(-c.OlderThan)
	for _, root := range expand(c.Globs) {
		if c.Files {
			if fi, err := os.Stat(root); err == nil && !fi.IsDir() {
				if del {
					if os.Remove(root) == nil {
						bytes += fi.Size()
						files++
					}
				} else {
					bytes += fi.Size()
					files++
				}
			}
			continue
		}
		var dirs []string
		_ = filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				return nil
			}
			if d.IsDir() {
				if p != root {
					dirs = append(dirs, p)
				}
				return nil
			}
			if d.Type()&fs.ModeSymlink != 0 {
				return nil
			}
			fi, err := d.Info()
			if err != nil {
				return nil
			}
			if c.OlderThan > 0 && fi.ModTime().After(cut) {
				return nil
			}
			if del {
				if os.Remove(p) == nil {
					bytes += fi.Size()
					files++
				}
			} else {
				bytes += fi.Size()
				files++
			}
			return nil
		})
		if del { // carpetas vacías, de la más profunda a la más externa (nunca la raíz)
			sort.Slice(dirs, func(a, b int) bool { return len(dirs[a]) > len(dirs[b]) })
			for _, d := range dirs {
				_ = os.Remove(d)
			}
		}
	}
	return
}

func cleanScan() map[string]any {
	admin := isAdmin()
	var list []map[string]any
	for _, c := range cleanCats() {
		b, n := walkCat(c, false)
		list = append(list, map[string]any{"id": c.ID, "label": c.Label, "desc": c.Desc, "bytes": b, "files": n, "admin": c.Admin, "locked": c.Admin && !admin})
	}
	rb, rn := recycleBin()
	list = append(list, map[string]any{"id": "recycle", "label": "Papelera de reciclaje", "desc": "Archivos que ya borraste", "bytes": rb, "files": rn})
	return map[string]any{"cats": list, "admin": admin}
}

func cleanRun(ids []string) map[string]any {
	want := map[string]bool{}
	for _, id := range ids {
		want[id] = true
	}
	var total int64
	var files int
	done := map[string]int64{}
	admin := isAdmin()
	for _, c := range cleanCats() {
		if !want[c.ID] || (c.Admin && !admin) {
			continue
		}
		b, n := walkCat(c, true)
		done[c.ID] = b
		total += b
		files += n
	}
	if want["recycle"] {
		b, n := recycleBin()
		if emptyRecycleBin() == nil {
			done["recycle"] = b
			total += b
			files += n
		}
	}
	return map[string]any{"bytes": total, "files": files, "byCat": done}
}
