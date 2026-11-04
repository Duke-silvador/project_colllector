package main

import (
	"archive/zip"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// Programas portables de GitHub (sin instalador): se copian a "Archivos de programa\MiVibra Portables"
// y se crea un acceso directo en el menú Inicio.

func portableRoot() string {
	pf := os.Getenv("ProgramFiles")
	if pf == "" {
		return filepath.Join(workDir, "Portables")
	}
	return filepath.Join(pf, "MiVibra Portables")
}

func portableDir(repo string) string {
	g := ghItem(repo)
	name := repo
	if g != nil {
		name = g.Name
	}
	return filepath.Join(portableRoot(), safeName(name))
}

func portableInstalled(repo string) bool {
	g := ghItem(repo)
	if g == nil || g.Portable == "" {
		return false
	}
	return findFile(portableDir(repo), g.Portable) != ""
}

func findFile(root, name string) string {
	found := ""
	_ = filepath.Walk(root, func(p string, fi os.FileInfo, err error) error {
		if err != nil || found != "" {
			return nil
		}
		if !fi.IsDir() && strings.EqualFold(fi.Name(), name) {
			found = p
		}
		return nil
	})
	return found
}

// installPortable descomprime (o copia) el programa y devuelve la ruta del .exe principal.
func installPortable(repo, src string) (string, error) {
	g := ghItem(repo)
	if g == nil || g.Portable == "" {
		return "", errors.New("no es un programa portable")
	}
	dir := portableDir(repo)
	tmp := dir + ".nuevo"
	_ = os.RemoveAll(tmp)
	if err := os.MkdirAll(tmp, 0o755); err != nil {
		return "", errors.New("no se pudo crear " + dir)
	}
	if strings.EqualFold(filepath.Ext(src), ".zip") {
		if err := unzip(src, tmp); err != nil {
			_ = os.RemoveAll(tmp)
			return "", err
		}
	} else if err := copyFile(src, filepath.Join(tmp, g.Portable)); err != nil {
		_ = os.RemoveAll(tmp)
		return "", err
	}
	if findFile(tmp, g.Portable) == "" {
		_ = os.RemoveAll(tmp)
		return "", errors.New("el paquete no trae " + g.Portable)
	}
	_ = os.RemoveAll(dir) // reemplaza la versión anterior
	if err := os.Rename(tmp, dir); err != nil {
		_ = os.RemoveAll(tmp)
		return "", errors.New("cierra " + g.Name + " si está abierto e inténtalo de nuevo")
	}
	exe := findFile(dir, g.Portable)
	makeShortcut(g.Name, exe)
	return exe, nil
}

func unzip(src, dest string) error {
	zr, err := zip.OpenReader(src)
	if err != nil {
		return errors.New("el archivo .zip está dañado")
	}
	defer zr.Close()
	root := filepath.Clean(dest) + string(os.PathSeparator)
	for _, f := range zr.File {
		p := filepath.Join(dest, filepath.FromSlash(f.Name))
		if !strings.HasPrefix(filepath.Clean(p)+string(os.PathSeparator), root) && filepath.Clean(p) != filepath.Clean(dest) {
			return errors.New("el .zip contiene rutas no permitidas")
		}
		if f.FileInfo().IsDir() {
			_ = os.MkdirAll(p, 0o755)
			continue
		}
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		out, err := os.Create(p)
		if err != nil {
			rc.Close()
			return err
		}
		_, err = io.Copy(out, rc)
		rc.Close()
		out.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

/* ---------- kit USB de rescate ---------- */

// isoToUSB deja la imagen .iso en el kit (descomprime si viene en .zip) y, al instalar, la copia a la USB Ventoy.
func isoToUSB(p, ver string, onlyKit bool, cancelled func() bool) (int, string, bool, error) {
	iso := p
	if strings.HasSuffix(strings.ToLower(p), ".zip") {
		tmp := p + ".dir"
		_ = os.RemoveAll(tmp)
		if err := unzip(p, tmp); err != nil {
			return -1, err.Error(), false, err
		}
		found := ""
		_ = filepath.Walk(tmp, func(f string, fi os.FileInfo, err error) error {
			if err == nil && !fi.IsDir() && strings.EqualFold(filepath.Ext(f), ".iso") && found == "" {
				found = f
			}
			return nil
		})
		if found == "" {
			_ = os.RemoveAll(tmp)
			return -1, "el paquete no trae una imagen .iso", false, errors.New("sin iso")
		}
		iso = strings.TrimSuffix(p, filepath.Ext(p))
		if !strings.EqualFold(filepath.Ext(iso), ".iso") {
			iso += ".iso"
		}
		_ = os.Remove(iso)
		if err := os.Rename(found, iso); err != nil {
			_ = os.RemoveAll(tmp)
			return -1, err.Error(), false, err
		}
		_ = os.RemoveAll(tmp)
		_ = os.Remove(p)
	}
	msg := "Versión " + ver + " guardada en el kit (USB de rescate)"
	if onlyKit {
		return 0, msg, false, nil
	}
	usb := ventoyDrive()
	if usb == "" {
		return 0, msg + " · conecta una USB con Ventoy y vuelve a pulsar Instalar para copiarla", false, nil
	}
	dst := filepath.Join(usb, filepath.Base(iso))
	if fi, e := os.Stat(dst); e == nil {
		if src, e2 := os.Stat(iso); e2 == nil && src.Size() == fi.Size() {
			return 0, "Ya estaba en la USB Ventoy (" + usb + ")", false, nil
		}
	}
	if err := copyCancelable(iso, dst+".parcial", cancelled); err != nil {
		_ = os.Remove(dst + ".parcial")
		return -1, "no se pudo copiar a la USB: " + err.Error(), false, err
	}
	_ = os.Remove(dst)
	if err := os.Rename(dst+".parcial", dst); err != nil {
		return -1, err.Error(), false, err
	}
	return 0, "Copiada a la USB Ventoy (" + usb + ") · arranca el equipo desde la USB y elígela en el menú", false, nil
}

func copyCancelable(src, dst string, cancelled func() bool) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	buf := make([]byte, 4<<20)
	for {
		if cancelled() {
			out.Close()
			return errors.New("Cancelado")
		}
		n, e := in.Read(buf)
		if n > 0 {
			if _, we := out.Write(buf[:n]); we != nil {
				out.Close()
				return errors.New("la USB está llena o se desconectó")
			}
		}
		if e == io.EOF {
			break
		}
		if e != nil {
			out.Close()
			return e
		}
	}
	return out.Close()
}

// isoInKit: ya hay una imagen de ese proyecto en el kit (Match = prefijo del nombre del archivo).
func isoInKit(repo string) bool {
	g := ghItem(repo)
	if g == nil || !g.ISO || g.Match == "" {
		return false
	}
	ents, _ := os.ReadDir(filepath.Join(libDir, "USB de rescate"))
	for _, e := range ents {
		n := strings.ToLower(e.Name())
		if strings.HasSuffix(n, ".iso") && strings.Contains(n, strings.ToLower(g.Match)) {
			return true
		}
	}
	return false
}
