//go:build !windows

package main

import (
	"encoding/json"
	"os"
	"time"
)

// Simulación para probar la interfaz fuera de Windows.
var avMock = []map[string]any{
	{"id": "2147735505", "name": "Trojan:Win32/Wacatac.B!ml", "sev": 5, "active": true, "status": 1, "when": "2026-10-23T19:12:00", "ok": false, "proc": "", "res": []string{`C:\Users\Brandon\Downloads\crack-office-2024.exe`}},
	{"id": "2147814524", "name": "PUA:Win32/Presenoker", "sev": 2, "active": false, "status": 3, "when": "2026-10-20T10:02:00", "ok": true, "proc": "", "res": []string{`C:\Users\Brandon\AppData\Local\Temp\setup_free.exe`}},
	{"id": "2147729893", "name": "Trojan:Script/Wacatac.H!ml", "sev": 5, "active": false, "status": 4, "when": "2026-09-30T08:40:00", "ok": true, "proc": "", "res": []string{`E:\autorun.inf`, `E:\USB-Driver.vbs`}},
}

func avMockStatus() map[string]any {
	return map[string]any{
		"defender": map[string]any{"on": true, "svc": true, "rt": true, "mode": "Normal", "sig": time.Now().Add(-26 * time.Hour).Format("2006-01-02T15:04:05"), "sigVer": "1.419.512.0", "quick": "2026-10-21T09:00:00", "full": "2026-08-02T13:20:00", "tamper": true},
		"av":       []map[string]any{{"name": "Windows Defender", "on": true, "current": true}},
		"threats":  avMock,
	}
}

func avStatus() ([]byte, error) {
	time.Sleep(400 * time.Millisecond)
	return json.Marshal(avMockStatus())
}

func avLaunch(op, arg string, update bool) error {
	go func() {
		st := map[string]any{"state": "running", "op": op, "arg": arg, "start": time.Now().Format(time.RFC3339), "step": "Preparando…", "found": 0}
		w := func() { b, _ := json.Marshal(st); _ = os.WriteFile(avJobFile(), b, 0o644) }
		w()
		steps := 1
		if op == "quick" || op == "full" || op == "custom" {
			steps = 5
			if update {
				st["step"] = "Actualizando la base de virus…"
				w()
				time.Sleep(1500 * time.Millisecond)
			}
			st["step"], st["scanStart"] = "Escaneando…", time.Now().Format(time.RFC3339)
		}
		for i := 0; i < steps; i++ {
			if _, err := os.Stat(avCancelFile()); err == nil {
				st["state"] = "cancelled"
				break
			}
			if i == 3 && op != "list" {
				st["found"] = 1
			}
			w()
			time.Sleep(1200 * time.Millisecond)
		}
		switch op {
		case "remove":
			for _, t := range avMock {
				if t["active"] == true {
					t["active"], t["status"], t["ok"] = false, 4, true
				}
			}
		case "restore":
			for _, t := range avMock {
				if t["name"] == arg {
					t["status"] = 5
				}
			}
		}
		if st["state"] == "running" {
			st["state"] = "done"
		}
		st["end"] = time.Now().Format(time.RFC3339)
		st["status"] = avMockStatus()
		w()
	}()
	return nil
}
