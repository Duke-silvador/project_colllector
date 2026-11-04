package main

// Actualización automática desde las versiones publicadas en GitHub (Releases).
// 1. Revisa al abrir y cada 6 horas si hay una versión más nueva.
// 2. La descarga en segundo plano junto al .exe (MiVibra-PC.exe.nuevo) y verifica su SHA-256.
// 3. Se aplica sola la próxima vez que se abre la app, o al pulsar «Reiniciar ahora».

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Repositorio donde se publican las versiones (pestaña Releases).
const updateRepo = "simank19/mivibra-pc"

type updState struct {
	Current  string `json:"current"`
	Latest   string `json:"latest,omitempty"`
	State    string `json:"state"` // idle | checking | uptodate | downloading | ready | error | off
	Progress int    `json:"progress,omitempty"`
	Notes    string `json:"notes,omitempty"`
	Date     string `json:"date,omitempty"`
	Msg      string `json:"msg,omitempty"`
	Checked  int64  `json:"checked,omitempty"`
	Auto     bool   `json:"auto"`
	Updated  string `json:"updated,omitempty"` // versión anterior, si se acaba de actualizar
}

var (
	updMu sync.Mutex
	upd   = updState{State: "idle"}
)

func exePaths() (exe, nuevo, meta, viejo string) {
	exe, _ = os.Executable()
	exe, _ = filepath.EvalSymlinks(exe)
	return exe, exe + ".nuevo", exe + ".nuevo.json", exe + ".viejo"
}

// semver simple: "v2.10.0" > "2.9.3"
func newer(a, b string) bool {
	pa, pb := verParts(a), verParts(b)
	for i := 0; i < 3; i++ {
		if pa[i] != pb[i] {
			return pa[i] > pb[i]
		}
	}
	return false
}

func verParts(v string) [3]int {
	var r [3]int
	v = strings.TrimPrefix(strings.TrimSpace(v), "v")
	if i := strings.IndexAny(v, "-+ "); i >= 0 {
		v = v[:i]
	}
	for i, p := range strings.SplitN(v, ".", 3) {
		r[i], _ = strconv.Atoi(p)
	}
	return r
}

func autoUpdateOn() bool {
	cfgMu.Lock()
	defer cfgMu.Unlock()
	return !cfg.NoUpdate && os.Getenv("MIVIBRA_NO_UPDATE") == ""
}

func setUpd(f func(*updState)) {
	updMu.Lock()
	f(&upd)
	updMu.Unlock()
}

// applyPendingUpdate se llama al arrancar: si hay una versión nueva ya descargada y verificada,
// reemplaza el .exe y la abre. Devuelve true si esta instancia debe cerrarse.
func applyPendingUpdate() bool {
	exe, nuevo, meta, viejo := exePaths()
	_ = os.Remove(viejo) // restos de la actualización anterior
	for _, a := range os.Args[1:] {
		if strings.HasPrefix(a, "--actualizado=") {
			upd.Updated = strings.TrimPrefix(a, "--actualizado=")
		}
	}
	var m struct{ Version, Sha string }
	b, err := os.ReadFile(meta)
	if err != nil || json.Unmarshal(b, &m) != nil || !newer(m.Version, appVersion) {
		_ = os.Remove(nuevo)
		_ = os.Remove(meta)
		return false
	}
	if sum, err := fileSHA(nuevo); err != nil || !strings.EqualFold(sum, m.Sha) || !validExe(nuevo) {
		_ = os.Remove(nuevo)
		_ = os.Remove(meta)
		return false
	}
	if err := swapExe(exe, nuevo, viejo); err != nil {
		return false
	}
	_ = os.Remove(meta)
	cmd := exec.Command(exe, "--actualizado="+appVersion)
	cmd.Dir = filepath.Dir(exe)
	if cmd.Start() != nil { // si no abre, volver a la versión que funcionaba
		_ = os.Rename(exe, nuevo)
		_ = os.Rename(viejo, exe)
		return false
	}
	return true
}

// swapExe: Windows permite renombrar un .exe en uso, no sobrescribirlo.
func swapExe(exe, nuevo, viejo string) error {
	_ = os.Remove(viejo)
	if err := os.Rename(exe, viejo); err != nil {
		return err
	}
	if err := os.Rename(nuevo, exe); err != nil {
		_ = os.Rename(viejo, exe)
		return err
	}
	return nil
}

func fileSHA(p string) (string, error) {
	f, err := os.Open(p)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func updateLoop() {
	setUpd(func(u *updState) { u.Current = appVersion; u.Auto = autoUpdateOn() })
	time.Sleep(8 * time.Second)
	for {
		if autoUpdateOn() {
			checkUpdate(true)
		} else {
			setUpd(func(u *updState) {
				u.Auto = false
				if u.State == "idle" {
					u.State = "off"
				}
			})
		}
		time.Sleep(6 * time.Hour)
	}
}

var updBusy sync.Mutex

// checkUpdate busca la última versión publicada y, si download, la descarga y verifica.
func checkUpdate(download bool) {
	if !updBusy.TryLock() {
		return
	}
	defer updBusy.Unlock()
	setUpd(func(u *updState) { u.State, u.Msg, u.Progress = "checking", "", 0 })
	rel, asset, sumURL, err := latestRelease()
	now := time.Now().Unix()
	if err != nil {
		setUpd(func(u *updState) { u.State, u.Msg, u.Checked = "error", err.Error(), now })
		return
	}
	ver := strings.TrimPrefix(rel.Tag, "v")
	setUpd(func(u *updState) { u.Latest, u.Notes, u.Date, u.Checked = ver, rel.Body, rel.Date, now })
	if !newer(ver, appVersion) {
		setUpd(func(u *updState) { u.State = "uptodate" })
		return
	}
	_, nuevo, meta, _ := exePaths()
	var m struct{ Version, Sha string }
	if b, e := os.ReadFile(meta); e == nil && json.Unmarshal(b, &m) == nil && m.Version == ver {
		if s, e := fileSHA(nuevo); e == nil && strings.EqualFold(s, m.Sha) {
			setUpd(func(u *updState) { u.State = "ready" })
			return
		}
	}
	if !download {
		setUpd(func(u *updState) { u.State = "available" })
		return
	}
	if err := downloadUpdate(ver, asset, sumURL, nuevo, meta); err != nil {
		_ = os.Remove(nuevo)
		setUpd(func(u *updState) { u.State, u.Msg = "error", err.Error() })
		return
	}
	setUpd(func(u *updState) { u.State, u.Progress = "ready", 100 })
}

type relInfo struct {
	Tag    string    `json:"tag_name"`
	Body   string    `json:"body"`
	Date   string    `json:"published_at"`
	Draft  bool      `json:"draft"`
	Pre    bool      `json:"prerelease"`
	Assets []GHAsset `json:"assets"`
}

func latestRelease() (*relInfo, *GHAsset, string, error) {
	u := "https://api.github.com/repos/" + updateRepo + "/releases/latest"
	if t := os.Getenv("MIVIBRA_UPDATE_URL"); t != "" { // solo para pruebas
		u = t
	}
	resp, err := ghGet(u)
	if err != nil {
		return nil, nil, "", errors.New("sin conexión a internet")
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case 200:
	case 404:
		return nil, nil, "", errors.New("todavía no hay versiones publicadas")
	case 403, 429:
		return nil, nil, "", errors.New("GitHub está ocupado; se reintentará más tarde")
	default:
		return nil, nil, "", fmt.Errorf("GitHub respondió %d", resp.StatusCode)
	}
	var r relInfo
	if err := json.NewDecoder(io.LimitReader(resp.Body, 4<<20)).Decode(&r); err != nil {
		return nil, nil, "", err
	}
	var exe *GHAsset
	sum := ""
	for i := range r.Assets {
		n := strings.ToLower(r.Assets[i].Name)
		switch {
		case n == "mivibra-pc.exe":
			exe = &r.Assets[i]
		case n == "mivibra-pc.exe.sha256" || n == "sha256sums.txt":
			sum = r.Assets[i].URL
		}
	}
	if exe == nil || sum == "" {
		return &r, nil, "", errors.New("la versión publicada no trae MiVibra-PC.exe con su huella SHA-256")
	}
	return &r, exe, sum, nil
}

func downloadUpdate(ver string, a *GHAsset, sumURL, nuevo, meta string) error {
	// huella publicada
	resp, err := ghClient.Get(sumURL)
	if err != nil {
		return errors.New("no se pudo descargar la huella SHA-256")
	}
	sb, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	resp.Body.Close()
	want := ""
	for _, ln := range strings.Split(string(sb), "\n") {
		f := strings.Fields(ln)
		if len(f) >= 1 && len(f[0]) == 64 && (len(f) == 1 || strings.EqualFold(strings.TrimPrefix(f[len(f)-1], "*"), "MiVibra-PC.exe")) {
			want = strings.ToLower(f[0])
			break
		}
	}
	if want == "" {
		return errors.New("la huella SHA-256 publicada no es válida")
	}
	setUpd(func(u *updState) { u.State, u.Progress = "downloading", 0 })
	c := &http.Client{Timeout: 30 * time.Minute}
	req, _ := http.NewRequest("GET", a.URL, nil)
	req.Header.Set("User-Agent", "MiVibra-PC/"+appVersion)
	resp, err = c.Do(req)
	if err != nil {
		return errors.New("no se pudo descargar la actualización")
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("descarga falló (HTTP %d)", resp.StatusCode)
	}
	f, err := os.OpenFile(nuevo, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o755)
	if err != nil {
		return errors.New("no se puede escribir en la carpeta del programa; muévela a una carpeta tuya (Escritorio, Documentos o USB)")
	}
	h := sha256.New()
	buf := make([]byte, 256<<10)
	var got int64
	for {
		n, e := resp.Body.Read(buf)
		if n > 0 {
			if _, we := f.Write(buf[:n]); we != nil {
				f.Close()
				return errors.New("no hay espacio para descargar la actualización")
			}
			h.Write(buf[:n])
			got += int64(n)
			if a.Size > 0 {
				p := int(got * 100 / a.Size)
				setUpd(func(u *updState) { u.Progress = p })
			}
		}
		if e == io.EOF {
			break
		}
		if e != nil {
			f.Close()
			return errors.New("la descarga se interrumpió")
		}
	}
	f.Close()
	if hex.EncodeToString(h.Sum(nil)) != want {
		return errors.New("la descarga no coincide con la huella publicada; se descartó por seguridad")
	}
	if !validExe(nuevo) {
		return errors.New("el archivo descargado no es un programa válido")
	}
	b, _ := json.Marshal(map[string]string{"Version": ver, "Sha": want})
	return os.WriteFile(meta, b, 0o644)
}

// restartNow aplica la actualización descargada sin esperar al próximo inicio.
func restartNow() error {
	if jobRunning() || avRunning() {
		return errors.New("Espera a que termine la instalación o el escaneo en curso")
	}
	updMu.Lock()
	ready := upd.State == "ready"
	updMu.Unlock()
	if !ready {
		return errors.New("La actualización todavía no está lista")
	}
	exe, _, _, _ := exePaths()
	cmd := exec.Command(exe, "--aplicar-actualizacion")
	cmd.Dir = filepath.Dir(exe)
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() { time.Sleep(1500 * time.Millisecond); os.Exit(0) }()
	return nil
}

func updateRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/update", func(w http.ResponseWriter, r *http.Request) {
		updMu.Lock()
		u := upd
		updMu.Unlock()
		u.Current, u.Auto = appVersion, autoUpdateOn()
		writeJSON(w, u)
	})
	mux.HandleFunc("/api/update/check", post(func(w http.ResponseWriter, r *http.Request) {
		go checkUpdate(true)
		writeJSON(w, map[string]any{"ok": true})
	}))
	mux.HandleFunc("/api/update/restart", post(func(w http.ResponseWriter, r *http.Request) {
		if err := restartNow(); err != nil {
			writeJSON(w, map[string]any{"ok": false, "msg": err.Error()})
			return
		}
		writeJSON(w, map[string]any{"ok": true})
	}))
	mux.HandleFunc("/api/update/auto", post(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			On bool `json:"on"`
		}
		_ = readJSON(r, &req)
		cfgMu.Lock()
		cfg.NoUpdate = !req.On
		_ = saveConfig()
		cfgMu.Unlock()
		if req.On {
			go checkUpdate(true)
		}
		writeJSON(w, map[string]any{"ok": true})
	}))
}

// validExe: en Windows debe ser un ejecutable PE ("MZ").
func validExe(p string) bool { return runtime.GOOS != "windows" || isPE(p) }
