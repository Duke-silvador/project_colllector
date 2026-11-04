// MiVibra PC 2 — diagnóstico de hardware y software + biblioteca de instaladores (estilo WPI).
// La carpeta "Instaladores" junto al .exe es la biblioteca; programas.json guarda ajustes y perfiles.
package main

import (
	"crypto/rand"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync/atomic"
	"time"
)

//go:embed ui
var uiFS embed.FS

// appVersion lo fija la compilación (-ldflags "-X main.appVersion=2.2.0") al publicar una versión.
var appVersion = "2.2.0"

var (
	token    string
	hostPort string
	lastPing atomic.Int64
	pinged   atomic.Bool
)

func main() {
	if len(os.Args) >= 3 && os.Args[1] == "--runner" {
		runRunner(os.Args[2]) // proceso elevado que ejecuta la cola
		return
	}
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	token = hex.EncodeToString(b)
	initPaths()
	if applyPendingUpdate() { // había una versión nueva descargada: ya se abrió la nueva
		return
	}

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		fatal("No se pudo iniciar MiVibra PC: " + err.Error())
		return
	}
	hostPort = ln.Addr().String()
	mux := http.NewServeMux()
	sub, _ := fs.Sub(uiFS, "ui")
	mux.Handle("/", noCache(http.FileServer(http.FS(sub))))
	routes(mux)
	diagRoutes(mux)
	avRoutes(mux)
	updateRoutes(mux)
	srv := &http.Server{Handler: guard(mux), ReadHeaderTimeout: 10 * time.Second}
	go func() { _ = srv.Serve(ln) }()

	url := "http://" + hostPort + "/#t=" + token
	lastPing.Store(time.Now().Unix())
	if os.Getenv("MIVIBRA_NO_WINDOW") == "" {
		openWindow(url)
		brandWindow("MiVibra PC")
	} else {
		fmt.Println(url)
	}
	go updateLoop()
	watchdog()
}

func watchdog() {
	start := time.Now()
	for {
		time.Sleep(4 * time.Second)
		if os.Getenv("MIVIBRA_NO_WINDOW") != "" || jobRunning() {
			continue // nunca cerrar mientras se instala algo
		}
		idle := time.Since(time.Unix(lastPing.Load(), 0))
		if pinged.Load() && idle > 25*time.Second {
			os.Exit(0)
		}
		if !pinged.Load() && time.Since(start) > 3*time.Minute {
			os.Exit(0)
		}
	}
}

func guard(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != hostPort {
			http.Error(w, "host", http.StatusForbidden)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/") && r.Header.Get("X-MV-Token") != token {
			http.Error(w, "token", http.StatusForbidden)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		h.ServeHTTP(w, r)
	})
}

func noCache(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		h.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func post(f func(w http.ResponseWriter, r *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "post", http.StatusMethodNotAllowed)
			return
		}
		f(w, r)
	}
}

func routes(mux *http.ServeMux) {
	mux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		lastPing.Store(time.Now().Unix())
		pinged.Store(true)
		writeJSON(w, map[string]any{"ok": true, "version": appVersion, "admin": isAdmin()})
	})
	mux.HandleFunc("/api/state", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, buildState(r.URL.Query().Get("rescan") != ""))
	})
	mux.HandleFunc("/api/installed", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]any{"names": installedNames(true)})
	})
	mux.HandleFunc("/api/item", post(func(w http.ResponseWriter, r *http.Request) {
		var o Override
		if err := readJSON(r, &o); err != nil || o.ID == "" {
			writeJSON(w, map[string]any{"ok": false})
			return
		}
		cfgMu.Lock()
		cfg.Items[o.ID] = o
		err := saveConfig()
		cfgMu.Unlock()
		writeJSON(w, map[string]any{"ok": err == nil})
	}))
	mux.HandleFunc("/api/profile", post(func(w http.ResponseWriter, r *http.Request) {
		var p struct {
			Name   string   `json:"name"`
			IDs    []string `json:"ids"`
			Delete bool     `json:"delete"`
		}
		if err := readJSON(r, &p); err != nil || strings.TrimSpace(p.Name) == "" {
			writeJSON(w, map[string]any{"ok": false})
			return
		}
		cfgMu.Lock()
		if p.Delete {
			delete(cfg.Profiles, p.Name)
		} else {
			cfg.Profiles[strings.TrimSpace(p.Name)] = p.IDs
		}
		err := saveConfig()
		cfgMu.Unlock()
		writeJSON(w, map[string]any{"ok": err == nil})
	}))
	mux.HandleFunc("/api/catalog/add", post(func(w http.ResponseWriter, r *http.Request) {
		var c CatalogItem
		if err := readJSON(r, &c); err != nil || c.WingetID == "" {
			writeJSON(w, map[string]any{"ok": false})
			return
		}
		if c.Category == "" {
			c.Category = "Agregados"
		}
		cfgMu.Lock()
		found := false
		for _, x := range cfg.Custom {
			if strings.EqualFold(x.WingetID, c.WingetID) {
				found = true
			}
		}
		if !found {
			cfg.Custom = append(cfg.Custom, c)
		}
		err := saveConfig()
		cfgMu.Unlock()
		writeJSON(w, map[string]any{"ok": err == nil})
	}))
	mux.HandleFunc("/api/search", func(w http.ResponseWriter, r *http.Request) {
		res, err := wingetSearch(r.URL.Query().Get("q"))
		if err != nil {
			writeJSON(w, map[string]any{"err": err.Error()})
			return
		}
		writeJSON(w, map[string]any{"results": res})
	})
	mux.HandleFunc("/api/install", post(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			IDs    []string `json:"ids"`
			Op     string   `json:"op"`
			Reboot bool     `json:"reboot"`
		}
		if err := readJSON(r, &req); err != nil || len(req.IDs) == 0 {
			writeJSON(w, map[string]any{"ok": false, "msg": "Nada seleccionado"})
			return
		}
		if req.Op == "" {
			req.Op = "install"
		}
		err := startJob(req.IDs, req.Op, req.Reboot)
		if err != nil {
			writeJSON(w, map[string]any{"ok": false, "msg": err.Error()})
			return
		}
		writeJSON(w, map[string]any{"ok": true})
	}))
	mux.HandleFunc("/api/ghinfo", func(w http.ResponseWriter, r *http.Request) {
		// solo los que se están viendo (GitHub permite 60 consultas por hora sin cuenta)
		var repos []string
		seen := map[string]bool{}
		for _, q := range strings.Split(r.URL.Query().Get("repos"), ",") {
			if g := ghItem(strings.TrimSpace(q)); g != nil && !seen[g.Repo] && len(repos) < 60 {
				seen[g.Repo] = true
				repos = append(repos, g.Repo)
			}
		}
		writeJSON(w, ghInfoAll(repos))
	})
	mux.HandleFunc("/api/ghstars", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, ghStars()) })
	mux.HandleFunc("/api/job", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, jobStatus()) })
	mux.HandleFunc("/api/cancel", post(func(w http.ResponseWriter, r *http.Request) {
		cancelJob()
		writeJSON(w, map[string]any{"ok": true})
	}))
	mux.HandleFunc("/api/open", post(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			What string `json:"what"`
		}
		_ = readJSON(r, &req)
		switch req.What {
		case "folder":
			_ = os.MkdirAll(libDir, 0o755)
			openPath(libDir)
		case "config":
			openPath(cfgPath)
		case "log":
			if _, err := os.Stat(logPath()); err != nil {
				_ = os.WriteFile(logPath(), []byte("Sin registros todavía\r\n"), 0o644)
			}
			_ = exec.Command("notepad.exe", logPath()).Start()
		case "admin":
			if relaunchAdmin() {
				go func() { time.Sleep(1200 * time.Millisecond); os.Exit(0) }()
				writeJSON(w, map[string]any{"ok": true})
				return
			}
			writeJSON(w, map[string]any{"ok": false, "msg": "Se canceló el permiso de administrador"})
			return
		}
		writeJSON(w, map[string]any{"ok": true})
	}))
}
