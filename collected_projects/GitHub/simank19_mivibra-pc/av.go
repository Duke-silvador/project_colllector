package main

// Antivirus: escaneo y eliminación de amenazas con el motor de Microsoft Defender (incluido en Windows).

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

var (
	avMu     sync.Mutex
	avCache  []byte
	avAt     time.Time
	avLastOp string
)

func avJobFile() string    { return filepath.Join(workDir, "antivirus.json") }
func avCancelFile() string { return filepath.Join(workDir, "antivirus.cancel") }

func readAVJob() map[string]any {
	b, err := os.ReadFile(avJobFile())
	if err != nil {
		return nil
	}
	b = bytes.TrimPrefix(b, []byte{0xEF, 0xBB, 0xBF})
	var m map[string]any
	if json.Unmarshal(b, &m) != nil {
		return nil
	}
	if m["state"] == "running" {
		if fi, e := os.Stat(avJobFile()); e == nil && time.Since(fi.ModTime()) > 45*time.Second {
			m["stale"] = true
		}
	}
	return m
}

func avRunning() bool {
	j := readAVJob()
	return j != nil && j["state"] == "running" && j["stale"] == nil
}

// avStatusJSON: estado de protección + historial de amenazas (con caché corta).
func avStatusJSON(refresh bool) []byte {
	avMu.Lock()
	defer avMu.Unlock()
	if !refresh && avCache != nil && time.Since(avAt) < 20*time.Second {
		return avCache
	}
	b, err := avStatus()
	if err != nil || len(bytes.TrimSpace(b)) == 0 {
		b = []byte(`{"err":"No se pudo leer el estado de Microsoft Defender"}`)
	}
	// sin permisos de administrador Windows no entrega el historial: usar el del último escaneo
	var m map[string]any
	if json.Unmarshal(bytes.TrimPrefix(b, []byte{0xEF, 0xBB, 0xBF}), &m) == nil {
		if m["needAdmin"] == true {
			if j := readAVJob(); j != nil {
				if st, ok := j["status"].(map[string]any); ok && st["threats"] != nil {
					m["threats"], m["threatsAt"] = st["threats"], j["end"]
				}
			}
		}
		m["admin"] = isAdmin()
		m["home"] = os.Getenv("USERPROFILE")
		b, _ = json.Marshal(m)
	}
	avCache, avAt = b, time.Now()
	return b
}

var avOps = map[string]bool{"quick": true, "full": true, "custom": true, "remove": true, "restore": true, "update": true, "offline": true, "list": true}

func avStart(op, arg string, update bool) (bool, string) {
	if !avOps[op] {
		return false, "Operación no válida"
	}
	if avRunning() {
		return false, "Ya hay un escaneo en curso"
	}
	if op == "custom" {
		arg = strings.TrimSpace(arg)
		if fi, err := os.Stat(arg); err != nil || (!fi.IsDir() && !fi.Mode().IsRegular()) {
			return false, "La carpeta no existe: " + arg
		}
	}
	_ = os.Remove(avCancelFile())
	_ = os.Remove(avJobFile())
	avMu.Lock()
	avCache, avLastOp = nil, op
	avMu.Unlock()
	if err := avLaunch(op, arg, update); err != nil {
		return false, err.Error()
	}
	return true, ""
}

func avRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/av/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write(avStatusJSON(r.URL.Query().Get("refresh") != ""))
	})
	mux.HandleFunc("/api/av/job", func(w http.ResponseWriter, r *http.Request) {
		j := readAVJob()
		if j == nil {
			writeJSON(w, map[string]any{"none": true})
			return
		}
		if j["state"] != "running" {
			avMu.Lock()
			avCache = nil
			avMu.Unlock()
		}
		writeJSON(w, j)
	})
	mux.HandleFunc("/api/av/run", post(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Op     string `json:"op"`
			Arg    string `json:"arg"`
			Update bool   `json:"update"`
		}
		_ = readJSON(r, &req)
		ok, msg := avStart(req.Op, req.Arg, req.Update)
		writeJSON(w, map[string]any{"ok": ok, "msg": msg})
	}))
	mux.HandleFunc("/api/av/cancel", post(func(w http.ResponseWriter, r *http.Request) {
		_ = os.WriteFile(avCancelFile(), []byte("1"), 0o644)
		writeJSON(w, map[string]any{"ok": true})
	}))
}
