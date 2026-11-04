package main

import (
	"errors"
	"regexp"
	"strings"
	"sync"
	"time"
)

var (
	wgOnce sync.Once
	wgVer  string
)

func wingetVersion() string {
	wgOnce.Do(func() {
		out, err := runTool(20*time.Second, "winget", "--version")
		if err == nil {
			v := strings.TrimSpace(lastLine(out))
			if strings.HasPrefix(v, "v") {
				wgVer = v
			}
		}
	})
	return wgVer
}

type SearchResult struct {
	Name    string `json:"name"`
	ID      string `json:"id"`
	Version string `json:"version"`
	Source  string `json:"source"`
}

var dashRe = regexp.MustCompile(`^-{8,}\s*$`)

// cleanOut quita las animaciones de progreso que winget escribe con \r y \b.
func cleanOut(s string) []string {
	var lines []string
	for _, l := range strings.Split(strings.ReplaceAll(s, "\r\n", "\n"), "\n") {
		if i := strings.LastIndex(l, "\r"); i >= 0 {
			l = l[i+1:]
		}
		l = strings.Map(func(r rune) rune {
			if r == '\b' {
				return -1
			}
			return r
		}, l)
		lines = append(lines, strings.TrimRight(l, " "))
	}
	return lines
}

func wingetSearch(q string) ([]SearchResult, error) {
	q = strings.TrimSpace(q)
	if len(q) < 2 {
		return nil, errors.New("Escribe al menos 2 letras")
	}
	if wingetVersion() == "" {
		return nil, errors.New("winget no está disponible en este equipo. Instala o actualiza «Instalador de aplicación» desde Microsoft Store.")
	}
	out, err := runTool(60*time.Second, "winget", "search", q, "--accept-source-agreements", "--disable-interactivity")
	lines := cleanOut(out)
	sep := -1
	for i, l := range lines {
		if dashRe.MatchString(l) {
			sep = i
			break
		}
	}
	if sep < 1 {
		if err != nil {
			return []SearchResult{}, nil
		}
		return []SearchResult{}, nil
	}
	header := []rune(lines[sep-1])
	var cols []int
	for i := range header {
		if header[i] != ' ' && (i == 0 || header[i-1] == ' ') {
			cols = append(cols, i)
		}
	}
	if len(cols) < 3 {
		return nil, errors.New("No se pudo leer la respuesta de winget")
	}
	field := func(r []rune, k int) string {
		if k >= len(cols) || cols[k] >= len(r) {
			return ""
		}
		end := len(r)
		if k+1 < len(cols) && cols[k+1] < end {
			end = cols[k+1]
		}
		return strings.TrimSpace(string(r[cols[k]:end]))
	}
	var res []SearchResult
	for _, l := range lines[sep+1:] {
		r := []rune(l)
		if strings.TrimSpace(l) == "" {
			continue
		}
		it := SearchResult{Name: field(r, 0), ID: field(r, 1), Version: field(r, 2)}
		if len(cols) >= 4 {
			it.Source = field(r, len(cols)-1)
		}
		if it.ID == "" || strings.Contains(it.ID, " ") {
			continue
		}
		res = append(res, it)
		if len(res) >= 40 {
			break
		}
	}
	return res, nil
}

func lastLine(s string) string {
	ls := cleanOut(s)
	for i := len(ls) - 1; i >= 0; i-- {
		t := strings.TrimSpace(ls[i])
		if strings.Trim(t, "-\\|/█▒ ") != "" {
			return t
		}
	}
	return ""
}
