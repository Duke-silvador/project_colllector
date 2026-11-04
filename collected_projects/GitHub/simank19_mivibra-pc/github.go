package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Programas publicados como "releases" de GitHub (p. ej. ArtCraft, software libre).
type GHAsset struct {
	Name string `json:"name"`
	URL  string `json:"browser_download_url"`
	Size int64  `json:"size"`
}

type GHRelease struct {
	Tag    string    `json:"tag_name"`
	Pre    bool      `json:"prerelease"`
	Draft  bool      `json:"draft"`
	Date   string    `json:"published_at"`
	Assets []GHAsset `json:"assets"`
}

type GHInfo struct {
	Repo    string `json:"repo"`
	Version string `json:"version"`
	File    string `json:"file"`
	Size    int64  `json:"size"`
	Date    string `json:"date"`
	Pre     bool   `json:"pre,omitempty"`
	Err     string `json:"err,omitempty"`
}

var ghClient = &http.Client{Timeout: 30 * time.Second}

func ghGet(u string) (*http.Response, error) {
	req, _ := http.NewRequest("GET", u, nil)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "MiVibra-Instalador/"+appVersion)
	return ghClient.Do(req)
}

var errGHLimit = errors.New("GitHub limitó las consultas; intenta en unos minutos")

// ghFetch se puede sustituir en pruebas.
var ghFetch = func(repo string) (*GHRelease, error) {
	r, err := ghFetchAPI(repo)
	if err == errGHLimit { // sin cupo en la API: leer la página pública de la última versión
		if r2, e2 := ghFetchHTML(repo); e2 == nil {
			return r2, nil
		}
	}
	return r, err
}

func ghFetchAPI(repo string) (*GHRelease, error) {
	resp, err := ghGet("https://api.github.com/repos/" + repo + "/releases?per_page=15")
	if err != nil {
		return nil, errors.New("sin conexión con GitHub")
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case 200:
	case 404:
		return nil, errors.New("el repositorio no existe o es privado")
	case 403, 429:
		return nil, errGHLimit
	default:
		return nil, fmt.Errorf("GitHub respondió %d", resp.StatusCode)
	}
	var rels []GHRelease
	if err := json.NewDecoder(resp.Body).Decode(&rels); err != nil {
		return nil, err
	}
	return chooseRelease(repo, rels)
}

// chooseRelease: la versión estable más reciente con archivo para Windows;
// si el proyecto solo publica pruebas (alfa/beta), la prueba más reciente.
func chooseRelease(repo string, rels []GHRelease) (*GHRelease, error) {
	for pass := 0; pass < 2; pass++ {
		for i := range rels {
			if rels[i].Draft || (pass == 0 && rels[i].Pre) {
				continue
			}
			if pickAsset(repo, &rels[i]) != nil {
				return &rels[i], nil
			}
		}
	}
	return nil, errors.New("todavía no tiene versión para Windows")
}

var reAssetHref = regexp.MustCompile(`href="(/[^"/]+/[^"/]+/releases/download/[^"]+/([^"/]+))"`)

func ghFetchHTML(repo string) (*GHRelease, error) {
	nc := &http.Client{Timeout: 20 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	req, _ := http.NewRequest("GET", "https://github.com/"+repo+"/releases/latest", nil)
	req.Header.Set("User-Agent", "MiVibra-Instalador/"+appVersion)
	resp, err := nc.Do(req)
	if err != nil {
		return nil, err
	}
	resp.Body.Close()
	loc := resp.Header.Get("Location")
	i := strings.Index(loc, "/releases/tag/")
	if i < 0 {
		return nil, errors.New("sin versión publicada")
	}
	tag := loc[i+len("/releases/tag/"):]
	resp, err = ghGet("https://github.com/" + repo + "/releases/expanded_assets/" + tag)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	tagName, _ := url.PathUnescape(tag)
	r := &GHRelease{Tag: tagName}
	seen := map[string]bool{}
	for _, m := range reAssetHref.FindAllStringSubmatch(string(body), -1) {
		if seen[m[1]] {
			continue
		}
		seen[m[1]] = true
		name, _ := url.PathUnescape(m[2])
		r.Assets = append(r.Assets, GHAsset{Name: name, URL: "https://github.com" + html.UnescapeString(m[1])})
	}
	if pickAsset(repo, r) == nil {
		return nil, errors.New("todavía no tiene versión para Windows")
	}
	return r, nil
}

// winArch: arquitectura real de Windows (el .exe es x64 y en ARM corre emulado).
func winArch() string {
	a := strings.ToUpper(os.Getenv("PROCESSOR_ARCHITEW6432"))
	if a == "" {
		a = strings.ToUpper(os.Getenv("PROCESSOR_ARCHITECTURE"))
	}
	switch a {
	case "ARM64":
		return "arm64"
	case "X86":
		return "x86"
	}
	return "x64"
}

var (
	reX64   = regexp.MustCompile(`x64|amd64|x86[-_]64|win64|64[-_]?bit`)
	reX86   = regexp.MustCompile(`x86|win32|i[36]86|32[-_]?bit|ia32`)
	reArm   = regexp.MustCompile(`arm64|aarch64|\barm\b|armv7`)
	reWin   = regexp.MustCompile(`win|windows`)
	reSetup = regexp.MustCompile(`setup|install`)
	reNotOS = regexp.MustCompile(`linux|macos|\bmac\b|darwin|osx|apple|\.dmg|appimage|android|freebsd|\.deb|\.rpm`)
	reJunk  = regexp.MustCompile(`\.(sig|asc|sha\d*|blockmap|pdb|sym|txt|json|yml|yaml)$|debug|symbols|dbgsym|-sdk|nupkg|delta`)
)

// scoreAsset puntúa qué tan probable es que el archivo sea el instalador de Windows correcto (-1 = descartar).
func scoreAsset(name string, portable bool) int {
	n := strings.ToLower(name)
	ext := strings.ToLower(filepath.Ext(n))
	if strings.HasSuffix(n, ".iso") || strings.HasSuffix(n, ".iso.zip") { // imágenes de arranque (solo con Pattern)
		if reArm.MatchString(n) || strings.Contains(n, "32bit") || strings.Contains(n, "i386") {
			return -1
		}
		if strings.Contains(n, "grub") {
			return 1
		}
		return 4
	}
	if reJunk.MatchString(n) || reNotOS.MatchString(n) {
		return -1
	}
	arch := winArch()
	s := 0
	switch ext {
	case ".msi":
		if portable {
			return -1
		}
		s += 4
	case ".exe":
		s += 1
	case ".zip":
		if !portable {
			return -1
		}
		s += 3
	default:
		return -1
	}
	if reArm.MatchString(n) {
		if arch != "arm64" {
			return -1
		}
		s += 3
	}
	rest := reX64.ReplaceAllString(n, "")
	if rest != n {
		s += 2
		if arch == "x86" {
			return -1
		}
	} else if reX86.MatchString(rest) {
		if arch == "x86" {
			s += 2
		} else {
			s -= 3
		}
	}
	if reWin.MatchString(n) {
		s += 2
	}
	if !portable && reSetup.MatchString(n) {
		s += 3
	}
	if !portable && strings.Contains(n, "portable") {
		s -= 4
	}
	if strings.Contains(n, "user") { // instalación por usuario: preferimos la de todo el equipo
		s -= 1
	}
	return s
}

func pickAsset(repo string, r *GHRelease) *GHAsset {
	g := ghItem(repo)
	portable := g != nil && g.Portable != ""
	if g != nil && g.Pattern != "" {
		re := regexp.MustCompile(g.Pattern)
		var best *GHAsset
		bs := -100
		for i := range r.Assets {
			if re.MatchString(r.Assets[i].Name) {
				if sc := scoreAsset(r.Assets[i].Name, portable); sc >= 0 && (best == nil || sc > bs) {
					best, bs = &r.Assets[i], sc
				}
			}
		}
		return best
	}
	var best *GHAsset
	bs := 1 // mínimo 2 puntos para aceptar
	for i := range r.Assets {
		if sc := scoreAsset(r.Assets[i].Name, portable); sc > bs {
			best, bs = &r.Assets[i], sc
		}
	}
	return best
}

/* ---------- caché (memoria + disco, para no gastar el cupo de 60 consultas/hora de GitHub) ---------- */

type ghDisk struct {
	Info    map[string]GHInfo `json:"info"`
	InfoAt  map[string]int64  `json:"infoAt"`
	Stars   map[string]int    `json:"stars"`
	StarsAt int64             `json:"starsAt"`
}

var (
	ghMu     sync.Mutex
	ghCache  = ghDisk{Info: map[string]GHInfo{}, InfoAt: map[string]int64{}, Stars: map[string]int{}}
	ghLoaded bool
)

func ghCacheFile() string { return filepath.Join(workDir, "github-cache.json") }

func ghLoad() { // con ghMu tomado
	if ghLoaded {
		return
	}
	ghLoaded = true
	if b, err := os.ReadFile(ghCacheFile()); err == nil {
		var d ghDisk
		if json.Unmarshal(b, &d) == nil {
			if d.Info != nil {
				ghCache.Info, ghCache.InfoAt = d.Info, d.InfoAt
			}
			if d.Stars != nil {
				ghCache.Stars, ghCache.StarsAt = d.Stars, d.StarsAt
			}
			if ghCache.InfoAt == nil {
				ghCache.InfoAt = map[string]int64{}
			}
		}
	}
}

func ghSave() { // con ghMu tomado
	if b, err := json.Marshal(ghCache); err == nil {
		_ = os.WriteFile(ghCacheFile(), b, 0o644)
	}
}

func ghCachedVersion(repo string) string {
	ghMu.Lock()
	defer ghMu.Unlock()
	ghLoad()
	return ghCache.Info[repo].Version
}

func ghInfo(repo string) GHInfo {
	ghMu.Lock()
	ghLoad()
	c, ok := ghCache.Info[repo]
	age := time.Since(time.Unix(ghCache.InfoAt[repo], 0))
	ghMu.Unlock()
	if ok && ((c.Err == "" && age < 6*time.Hour) || (c.Err != "" && age < 20*time.Minute)) {
		return c
	}
	info := GHInfo{Repo: repo}
	r, err := ghFetch(repo)
	if err != nil {
		info.Err = err.Error()
		if ok && c.Err == "" && err == errGHLimit {
			return c // mejor mostrar lo último conocido
		}
	} else if a := pickAsset(repo, r); a != nil {
		info.Version = strings.TrimPrefix(r.Tag, "v")
		info.File, info.Size, info.Date = a.Name, a.Size, r.Date
		info.Pre = r.Pre
	}
	ghMu.Lock()
	ghCache.Info[repo], ghCache.InfoAt[repo] = info, time.Now().Unix()
	ghSave()
	ghMu.Unlock()
	return info
}

func ghInfoAll(repos []string) map[string]GHInfo {
	out := map[string]GHInfo{}
	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 4)
	for _, r := range repos {
		wg.Add(1)
		go func(r string) {
			defer wg.Done()
			sem <- struct{}{}
			i := ghInfo(r)
			<-sem
			mu.Lock()
			out[r] = i
			mu.Unlock()
		}(r)
	}
	wg.Wait()
	return out
}

// ghStarsFetch se puede sustituir en pruebas: estrellas actuales de varios repositorios.
var ghStarsFetch = func(repos []string) (map[string]int, error) {
	out := map[string]int{}
	for i := 0; i < len(repos); i += 12 { // la búsqueda permite varias condiciones repo: por consulta
		end := i + 12
		if end > len(repos) {
			end = len(repos)
		}
		q := ""
		for _, r := range repos[i:end] {
			q += " repo:" + r
		}
		resp, err := ghGet("https://api.github.com/search/repositories?per_page=100&q=" + url.QueryEscape(strings.TrimSpace(q)))
		if err != nil {
			return out, err
		}
		var res struct {
			Items []struct {
				Full  string `json:"full_name"`
				Stars int    `json:"stargazers_count"`
			} `json:"items"`
		}
		ok := resp.StatusCode == 200 && json.NewDecoder(resp.Body).Decode(&res) == nil
		resp.Body.Close()
		if !ok {
			return out, errGHLimit
		}
		for _, it := range res.Items {
			out[strings.ToLower(it.Full)] = it.Stars
		}
	}
	return out, nil
}

// ghStars devuelve las estrellas por repositorio (en vivo, guardadas 24 h; si no hay conexión, las aproximadas del catálogo).
func ghStars() map[string]int {
	ghMu.Lock()
	ghLoad()
	fresh := time.Since(time.Unix(ghCache.StarsAt, 0)) < 24*time.Hour
	ghMu.Unlock()
	if !fresh {
		var repos []string
		for _, g := range ghCatalog {
			repos = append(repos, g.Repo)
		}
		if live, err := ghStarsFetch(repos); len(live) > 0 {
			ghMu.Lock()
			for k, v := range live {
				ghCache.Stars[k] = v
			}
			if err == nil {
				ghCache.StarsAt = time.Now().Unix()
			}
			ghSave()
			ghMu.Unlock()
		}
	}
	out := map[string]int{}
	ghMu.Lock()
	for _, g := range ghCatalog {
		s := g.Stars
		if v, ok := ghCache.Stars[strings.ToLower(g.Repo)]; ok && v > 0 {
			s = v
		}
		out[g.Repo] = s
	}
	ghMu.Unlock()
	return out
}

// ghDownloadFn se puede sustituir en pruebas.
var ghDownloadFn = ghDownload

// ghDownload descarga el instalador de la última versión y verifica su SHA-256 si el proyecto lo publica.
func ghDownload(repo, dir string, cancelled func() bool) (path, version string, err error) {
	r, err := ghFetch(repo)
	if err != nil {
		return "", "", err
	}
	a := pickAsset(repo, r)
	if a == nil {
		return "", "", errors.New("todavía no tiene versión para Windows")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", "", err
	}
	dest := filepath.Join(dir, a.Name)
	version = strings.TrimPrefix(r.Tag, "v")
	if fi, e := os.Stat(dest); e == nil && fi.Size() == a.Size && a.Size > 0 && (!strings.EqualFold(filepath.Ext(dest), ".exe") || isPE(dest)) {
		logLine("GitHub " + repo + " | reutiliza " + dest)
		return dest, version, nil // ya estaba descargado
	}
	logLine(fmt.Sprintf("GitHub %s | descargando %s (%d bytes)", repo, a.URL, a.Size))
	client := &http.Client{Timeout: 60 * time.Minute}
	req, _ := http.NewRequest("GET", a.URL, nil)
	req.Header.Set("User-Agent", "MiVibra-Instalador/"+appVersion)
	resp, err := client.Do(req)
	if err != nil {
		return "", "", errors.New("no se pudo descargar " + a.Name)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", "", fmt.Errorf("descarga falló (HTTP %d)", resp.StatusCode)
	}
	tmp := dest + ".parcial"
	f, err := os.Create(tmp)
	if err != nil {
		return "", "", err
	}
	h := sha256.New()
	buf := make([]byte, 256*1024)
	for {
		if cancelled() {
			f.Close()
			os.Remove(tmp)
			return "", "", errors.New("Cancelado")
		}
		n, e := resp.Body.Read(buf)
		if n > 0 {
			_, _ = f.Write(buf[:n])
			_, _ = h.Write(buf[:n])
		}
		if e == io.EOF {
			break
		}
		if e != nil {
			f.Close()
			os.Remove(tmp)
			return "", "", errors.New("la descarga se interrumpió")
		}
	}
	f.Close()
	sum := hex.EncodeToString(h.Sum(nil))
	if want := ghChecksum(r, a.Name); want != "" && !strings.EqualFold(want, sum) {
		os.Remove(tmp)
		return "", "", errors.New("el archivo descargado no coincide con su huella SHA-256; se descartó")
	}
	_ = os.Remove(dest)
	if err := os.Rename(tmp, dest); err != nil {
		return "", "", err
	}
	return dest, version, nil
}

func ghChecksum(r *GHRelease, file string) string {
	for _, a := range r.Assets {
		n := strings.ToLower(a.Name)
		if !(strings.Contains(n, "sha256") && (strings.HasSuffix(n, ".txt") || strings.HasSuffix(n, "sums"))) {
			continue
		}
		resp, err := ghClient.Get(a.URL)
		if err != nil {
			return ""
		}
		defer resp.Body.Close()
		sc := bufio.NewScanner(io.LimitReader(resp.Body, 1<<20))
		for sc.Scan() {
			f := strings.Fields(sc.Text())
			if len(f) >= 2 && strings.TrimPrefix(f[len(f)-1], "*") == file && len(f[0]) == 64 {
				return f[0]
			}
		}
	}
	return ""
}
