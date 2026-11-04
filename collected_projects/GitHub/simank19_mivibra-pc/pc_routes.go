package main

// Rutas del módulo de diagnóstico (antes MiVibra PC 1.0).

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"
)

func writeRaw(w http.ResponseWriter, b []byte, err error) {
	if err != nil && len(b) == 0 {
		writeJSON(w, map[string]any{"err": err.Error()})
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if len(strings.TrimSpace(string(b))) == 0 {
		b = []byte("{}")
	}
	_, _ = w.Write(b)
}

// caché simple para consultas lentas
type cached struct {
	mu   sync.Mutex
	data []byte
	at   time.Time
}

func (c *cached) get(maxAge time.Duration, refresh bool, f func() ([]byte, error)) ([]byte, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !refresh && c.data != nil && time.Since(c.at) < maxAge {
		return c.data, nil
	}
	b, err := f()
	if err == nil && len(b) > 0 {
		c.data, c.at = b, time.Now()
	}
	return b, err
}

var infoCache, softCache cached

func diagRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/info", func(w http.ResponseWriter, r *http.Request) {
		b, err := infoCache.get(10*time.Minute, r.URL.Query().Get("refresh") != "", hardwareInfo)
		writeRaw(w, b, err)
	})
	mux.HandleFunc("/api/software", func(w http.ResponseWriter, r *http.Request) {
		b, err := softCache.get(10*time.Minute, r.URL.Query().Get("refresh") != "", softwareInfo)
		writeRaw(w, b, err)
	})
	mux.HandleFunc("/api/live", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, liveStats()) })
	mux.HandleFunc("/api/usb", func(w http.ResponseWriter, r *http.Request) {
		b, err := usbDevices()
		writeRaw(w, b, err)
	})
	mux.HandleFunc("/api/bench/cpu", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, benchCPU()) })
	mux.HandleFunc("/api/bench/ram", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, benchRAM()) })
	mux.HandleFunc("/api/bench/disk", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, benchDisk()) })
	mux.HandleFunc("/api/bench/net", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, benchNet()) })
	mux.HandleFunc("/api/clean/scan", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, cleanScan()) })
	mux.HandleFunc("/api/clean/run", post(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Cats []string `json:"cats"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		writeJSON(w, cleanRun(req.Cats))
	}))
	mux.HandleFunc("/api/action", post(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Name string `json:"name"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		writeJSON(w, runAction(req.Name))
	}))
}
