package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type JobItem struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	Op       string `json:"op"` // install | download
	Path     string `json:"path,omitempty"`
	Type     string `json:"type,omitempty"`
	Args     string `json:"args"`
	Mode     string `json:"mode"`
	WingetID string `json:"wingetId,omitempty"`
	Repo     string `json:"repo,omitempty"`
	Source   string `json:"source,omitempty"`
	DestDir  string `json:"destDir,omitempty"`
	Status   string `json:"status"` // pending | running | ok | error | cancelled
	Code     int    `json:"code"`
	Msg      string `json:"msg"`
	Start    int64  `json:"start,omitempty"`
	End      int64  `json:"end,omitempty"`
}

type Job struct {
	Items        []JobItem `json:"items"`
	Reboot       bool      `json:"reboot"`
	RebootNeeded bool      `json:"rebootNeeded"`
	Done         bool      `json:"done"`
	Beat         int64     `json:"beat"`
	Started      int64     `json:"started"`
	CancelFile   string    `json:"cancelFile"`
	Error        string    `json:"error,omitempty"`
}

var (
	jobMu   sync.Mutex
	jobPath string
)

func readJob(p string) (*Job, error) {
	b, err := os.ReadFile(p)
	if err != nil {
		return nil, err
	}
	var j Job
	if err := json.Unmarshal(b, &j); err != nil {
		return nil, err
	}
	return &j, nil
}

func writeJob(p string, j *Job) {
	j.Beat = time.Now().Unix()
	b, _ := json.Marshal(j)
	tmp := p + ".tmp"
	if os.WriteFile(tmp, b, 0o644) == nil {
		_ = os.Rename(tmp, p)
	}
}

func jobRunning() bool {
	jobMu.Lock()
	p := jobPath
	jobMu.Unlock()
	if p == "" {
		return false
	}
	j, err := readJob(p)
	if err != nil {
		return false
	}
	return !j.Done && time.Since(time.Unix(j.Beat, 0)) < 45*time.Second
}

func startJob(ids []string, op string, reboot bool) error {
	if jobRunning() {
		return errors.New("Ya hay una instalación en curso")
	}
	st := buildState(false)
	all := st["items"].([]Item)
	byID := map[string]Item{}
	for _, it := range all {
		byID[it.ID] = it
	}
	j := &Job{Reboot: reboot, Started: time.Now().Unix()}
	for _, id := range ids {
		it, ok := byID[id]
		if !ok {
			continue
		}
		ji := JobItem{ID: it.ID, Name: it.Name, Kind: it.Kind, Op: op, Type: it.Type, Args: it.Args, Mode: it.Mode, WingetID: it.WingetID, Repo: it.Repo, Source: it.Source, Status: "pending"}
		if it.Kind == "local" {
			if op == "download" {
				continue
			}
			ji.Path = filepath.Join(libDir, filepath.FromSlash(it.File))
		}
		if op == "download" {
			ji.DestDir = filepath.Join(libDir, safeName(it.Category))
		}
		j.Items = append(j.Items, ji)
	}
	if len(j.Items) == 0 {
		return errors.New("No hay programas válidos para " + map[string]string{"install": "instalar", "download": "descargar"}[op])
	}
	name := fmt.Sprintf("cola-%d", time.Now().UnixNano())
	p := filepath.Join(workDir, name+".json")
	j.CancelFile = filepath.Join(workDir, name+".cancel")
	writeJob(p, j)
	jobMu.Lock()
	jobPath = p
	jobMu.Unlock()
	// Las descargas no necesitan administrador; las instalaciones sí (un solo permiso para toda la cola).
	if op == "download" || isAdmin() {
		go runRunner(p)
		return nil
	}
	if err := runElevated(p); err != nil {
		j.Done = true
		j.Error = "Se necesita permiso de administrador para instalar"
		for i := range j.Items {
			j.Items[i].Status = "cancelled"
		}
		writeJob(p, j)
		return errors.New(j.Error)
	}
	return nil
}

func jobStatus() map[string]any {
	jobMu.Lock()
	p := jobPath
	jobMu.Unlock()
	if p == "" {
		return map[string]any{"none": true}
	}
	j, err := readJob(p)
	if err != nil {
		return map[string]any{"none": true}
	}
	stale := !j.Done && time.Since(time.Unix(j.Beat, 0)) > 45*time.Second
	if j.Done {
		scanMu.Lock()
		scanAt = time.Time{} // forzar nuevo escaneo (descargas nuevas)
		scanMu.Unlock()
		invalidateInstalled()
	}
	return map[string]any{"job": j, "stale": stale}
}

func cancelJob() {
	jobMu.Lock()
	p := jobPath
	jobMu.Unlock()
	if j, err := readJob(p); err == nil {
		_ = os.WriteFile(j.CancelFile, []byte("1"), 0o644)
	}
}

func safeName(s string) string {
	s = strings.Map(func(r rune) rune {
		if strings.ContainsRune(`<>:"/\|?*`, r) || r < 32 {
			return '-'
		}
		return r
	}, s)
	if strings.TrimSpace(s) == "" {
		return "Descargas"
	}
	return strings.TrimSpace(s)
}

// runRunner procesa la cola; se ejecuta como proceso elevado (--runner) o dentro de la app.
func runRunner(p string) {
	j, err := readJob(p)
	if err != nil {
		return
	}
	stop := make(chan struct{})
	go func() { // latido para que la ventana sepa que seguimos trabajando
		for {
			select {
			case <-stop:
				return
			case <-time.After(3 * time.Second):
				jobMu.Lock()
				if cur, err := readJob(p); err == nil && !cur.Done {
					writeJob(p, cur)
				}
				jobMu.Unlock()
			}
		}
	}()
	cancelled := func() bool { _, err := os.Stat(j.CancelFile); return err == nil }
	anyOK := false
	for i := range j.Items {
		if cancelled() {
			for k := i; k < len(j.Items); k++ {
				j.Items[k].Status = "cancelled"
			}
			break
		}
		it := &j.Items[i]
		it.Status, it.Start = "running", time.Now().Unix()
		jobMu.Lock()
		writeJob(p, j)
		jobMu.Unlock()
		code, msg, reboot, err := execItem(it, cancelled)
		it.Code, it.Msg, it.End = code, msg, time.Now().Unix()
		if err != nil {
			it.Status = "error"
			if it.Msg == "" {
				it.Msg = err.Error()
			}
		} else {
			it.Status = "ok"
			anyOK = true
		}
		if reboot {
			j.RebootNeeded = true
		}
		if cancelled() && it.Status == "error" {
			it.Status, it.Msg = "cancelled", "Cancelado"
		}
		jobMu.Lock()
		writeJob(p, j)
		jobMu.Unlock()
	}
	close(stop)
	j.Done = true
	jobMu.Lock()
	writeJob(p, j)
	jobMu.Unlock()
	if j.Reboot && anyOK {
		scheduleReboot()
	}
}

const (
	wgAlreadyInstalled = -1978335189 // 0x8A15002B
	wgNoApp            = -1978335212 // 0x8A150014
	wgNoUpgrade        = -1978335135 // 0x8A150061 (paquete ya instalado)
)

func execItem(it *JobItem, cancelled func() bool) (code int, msg string, reboot bool, err error) {
	silent := it.Mode != "normal"
	if it.Kind == "winget" {
		if wingetVersion() == "" {
			return -1, "winget no está disponible en este equipo", false, errors.New("winget")
		}
		args := []string{}
		if it.Op == "download" {
			if it.Source == "msstore" {
				return -1, "Las apps de Microsoft Store no se pueden descargar como instalador", false, errors.New("msstore")
			}
			_ = os.MkdirAll(it.DestDir, 0o755)
			args = []string{"download", "--id", it.WingetID, "--exact", "-d", it.DestDir}
		} else {
			args = []string{"install", "--id", it.WingetID, "--exact"}
			if silent {
				args = append(args, "--silent")
			} else {
				args = append(args, "--interactive")
			}
		}
		args = append(args, "--accept-package-agreements", "--accept-source-agreements", "--disable-interactivity")
		if it.Source != "" {
			args = append(args, "--source", it.Source)
		}
		code, out := runCancelable(90*time.Minute, cancelled, true, "winget", args...)
		last := lastLine(out)
		switch code {
		case 0:
			if it.Op == "download" {
				return 0, "Instalador guardado en " + filepath.Base(it.DestDir), false, nil
			}
			return 0, "Instalado", false, nil
		case wgAlreadyInstalled, wgNoUpgrade:
			return code, "Ya estaba instalado y actualizado", false, nil
		case wgNoApp:
			return code, "No se encontró en winget (" + it.WingetID + ")", false, errors.New("no encontrado")
		case 3010, 1641:
			return code, "Instalado · requiere reiniciar", true, nil
		}
		if last == "" {
			last = fmt.Sprintf("winget terminó con código %d (0x%08X)", code, uint32(code))
		}
		return code, last, false, errors.New("winget")
	}
	if it.Kind == "github" {
		dir := it.DestDir
		g := ghItem(it.Repo)
		if g != nil && g.ISO {
			dir = filepath.Join(libDir, "USB de rescate")
		} else if it.Op != "download" {
			dir = filepath.Join(workDir, "descargas")
		}
		p, ver, e := ghDownloadFn(it.Repo, dir, cancelled)
		if e != nil {
			logLine(it.Name + " | descarga | " + e.Error())
			return -1, e.Error(), false, e
		}
		if g != nil && g.ISO {
			return isoToUSB(p, ver, it.Op == "download", cancelled)
		}
		if it.Op == "download" {
			return 0, "Versión " + ver + " guardada en " + filepath.Base(it.DestDir), false, nil
		}
		if g != nil && g.Portable != "" {
			exe, e := installPortable(it.Repo, p)
			if e != nil {
				return -1, e.Error(), false, e
			}
			_ = exe
			return 0, "Versión " + ver + " lista en " + portableDir(it.Repo) + " · acceso en el menú Inicio", false, nil
		}
		if !isPE(p) {
			_ = os.Remove(p)
			return -1, "La descarga no es un instalador válido (se borró); inténtalo de nuevo", false, errors.New("no PE")
		}
		unblock(p)
		if fi, e := os.Stat(p); e == nil {
			logLine(fmt.Sprintf("%s | descargado %s (%d bytes) v%s", it.Name, p, fi.Size(), ver))
		}
		it.Path = p
		it.Type = detectType(p)
		it.Args = silentArgs[it.Type]
		if it.Type == "unknown" {
			it.Mode = "normal"
		}
	}
	// instaladores locales (y los descargados de GitHub)
	if _, e := os.Stat(it.Path); e != nil {
		return -1, "El archivo ya no existe", false, e
	}
	var cmdline, prog string
	switch it.Type {
	case "msi":
		prog = "msiexec.exe"
		cmdline = `msiexec.exe /i "` + it.Path + `"`
		if silent {
			cmdline += " " + strings.TrimSpace(it.Args)
		}
	case "msix":
		prog = "powershell.exe"
		cmdline = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Add-AppxPackage -Path '` + strings.ReplaceAll(it.Path, "'", "''") + `'"`
	default:
		prog = it.Path
		cmdline = `"` + it.Path + `"`
		if silent && strings.TrimSpace(it.Args) != "" {
			cmdline += " " + strings.TrimSpace(it.Args)
		}
	}
	code, why := runRaw(90*time.Minute, cancelled, silent, prog, cmdline)
	logLine(it.Name + " | " + cmdline + fmt.Sprintf(" | código %d (0x%08X) %s", code, uint32(code), why))
	if why != "" {
		if _, e := os.Stat(it.Path); e != nil && prog == it.Path {
			logLine(it.Name + " | el archivo desapareció al ejecutarlo (probable antivirus): " + it.Path)
			return code, "El antivirus de Windows borró el instalador al abrirlo. Abre Seguridad de Windows › Protección contra virus › Historial de protección, restáuralo o permítelo, y reintenta", false, errors.New("av")
		}
		return code, "Windows no pudo abrir el instalador: " + why, false, errors.New(why)
	}
	switch code {
	case 0:
		return 0, "Instalado", false, nil
	case 3010, 1641:
		return code, "Instalado · requiere reiniciar", true, nil
	case 1602, 1223:
		return code, "El usuario canceló la instalación", false, errors.New("cancelado")
	case 1618:
		return code, "Otra instalación de Windows está en curso; inténtalo de nuevo al terminar", false, errors.New("ocupado")
	case 1603:
		return code, "Error fatal del instalador (1603)", false, errors.New("1603")
	case -2:
		return code, "Cancelado", false, errors.New("cancelado")
	case -3:
		return code, "Tiempo de espera agotado", false, errors.New("timeout")
	}
	if silent && it.Kind == "github" {
		return code, fmt.Sprintf("El instalador terminó con código %d · prueba en modo Normal (botón ··· del programa)", code), false, errors.New("código")
	}
	return code, fmt.Sprintf("El instalador terminó con código %d", code), false, errors.New("código")
}

func isPE(p string) bool {
	if strings.EqualFold(filepath.Ext(p), ".msi") {
		return true
	}
	f, err := os.Open(p)
	if err != nil {
		return false
	}
	defer f.Close()
	b := make([]byte, 2)
	_, _ = f.Read(b)
	return string(b) == "MZ"
}

// registro.txt: detalle técnico de cada instalación, para diagnosticar fallas.
func logPath() string { return filepath.Join(workDir, "registro.txt") }

func logLine(s string) {
	f, err := os.OpenFile(logPath(), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = f.WriteString(time.Now().Format("2006-01-02 15:04:05") + "  " + s + "\r\n")
}
