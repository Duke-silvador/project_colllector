package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

// ---------------------------------------------------------------- CPU

func benchCPU() map[string]any {
	const block = 64 * 1024
	work := func(stop *atomic.Bool, counter *atomic.Int64) {
		buf := make([]byte, block)
		_, _ = rand.Read(buf)
		for !stop.Load() {
			s := sha256.Sum256(buf)
			buf[0] ^= s[0]
			counter.Add(1)
		}
	}
	// un núcleo
	var c1 atomic.Int64
	var st1 atomic.Bool
	go work(&st1, &c1)
	time.Sleep(3 * time.Second)
	st1.Store(true)
	single := float64(c1.Load()) * block / 3 / 1e6

	// todos los núcleos, midiendo cada medio segundo para detectar estrangulamiento térmico
	n := runtime.NumCPU()
	var c2 atomic.Int64
	var st2 atomic.Bool
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); work(&st2, &c2) }()
	}
	var samples []float64
	prev := int64(0)
	for i := 0; i < 16; i++ { // 8 s
		time.Sleep(500 * time.Millisecond)
		cur := c2.Load()
		samples = append(samples, float64(cur-prev)*block/0.5/1e6)
		prev = cur
	}
	st2.Store(true)
	wg.Wait()
	multi := float64(c2.Load()) * block / 8 / 1e6
	first, last := avg(samples[1:5]), avg(samples[len(samples)-4:])
	drop := 0.0
	if first > 0 {
		drop = (first - last) / first * 100
	}
	return map[string]any{"single": round1(single), "multi": round1(multi), "threads": n,
		"scaling": round1(multi / maxf(single, 1)), "drop": round1(drop), "samples": samples}
}

// ---------------------------------------------------------------- RAM

func benchRAM() map[string]any {
	_, avail := memInfo()
	size := uint64(float64(avail) * 0.3)
	if size > 2<<30 {
		size = 2 << 30
	}
	if size < 256<<20 {
		size = 256 << 20
	}
	n := int(size / 8)
	res := map[string]any{"mb": size >> 20}
	defer func() {
		if r := recover(); r != nil {
			res["err"] = "No hay memoria libre suficiente para la prueba"
		}
		debug.FreeOSMemory()
	}()
	p := make([]uint64, n)
	errs := 0
	var wTime, rTime time.Duration
	for pass, seed := range []uint64{0x9E3779B97F4A7C15, 0xFFFFFFFFFFFFFFFF ^ 0x9E3779B97F4A7C15} {
		t0 := time.Now()
		for i := range p {
			p[i] = uint64(i)*seed ^ seed>>uint(pass)
		}
		wTime += time.Since(t0)
		t1 := time.Now()
		for i := range p {
			if p[i] != uint64(i)*seed^seed>>uint(pass) {
				errs++
			}
		}
		rTime += time.Since(t1)
	}
	gb := float64(size) * 2 / 1e9
	res["write"] = round1(gb / wTime.Seconds())
	res["read"] = round1(gb / rTime.Seconds())
	res["errors"] = errs
	p = nil
	return res
}

// ---------------------------------------------------------------- disco

func benchDisk() map[string]any {
	dir := os.TempDir()
	path := filepath.Join(dir, "mivibra-prueba-disco.bin")
	defer os.Remove(path)
	const total = 512 << 20
	res := map[string]any{"dir": dir, "mb": total >> 20}
	w, err := diskSeqWrite(path, total)
	if err != nil {
		res["err"] = "No se pudo escribir en el disco: " + err.Error()
		return res
	}
	r, err := diskSeqRead(path, total)
	if err != nil {
		res["err"] = "No se pudo leer el archivo de prueba: " + err.Error()
		return res
	}
	iops, lat := diskRand4K(path, total, 3*time.Second)
	res["write"] = round1(w)
	res["read"] = round1(r)
	res["iops"] = int(iops)
	res["latMs"] = round2(lat)
	return res
}

// ---------------------------------------------------------------- red

func benchNet() map[string]any {
	res := map[string]any{}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	t0 := time.Now()
	_, err := net.DefaultResolver.LookupHost(ctx, "www.microsoft.com")
	cancel()
	res["dns"] = err == nil
	res["dnsMs"] = time.Since(t0).Milliseconds()

	var lats []float64
	for _, host := range []string{"1.1.1.1:443", "8.8.8.8:443"} {
		for i := 0; i < 4; i++ {
			t := time.Now()
			c, err := net.DialTimeout("tcp", host, 3*time.Second)
			if err == nil {
				lats = append(lats, float64(time.Since(t).Microseconds())/1000)
				c.Close()
			}
		}
	}
	res["internet"] = len(lats) > 0
	if len(lats) > 0 {
		sort.Float64s(lats)
		res["pingMs"] = round1(lats[len(lats)/2])
		res["jitterMs"] = round1(lats[len(lats)-1] - lats[0])
	}
	if len(lats) == 0 {
		return res
	}
	client := &http.Client{Timeout: 15 * time.Second}
	for _, u := range []string{"https://speed.cloudflare.com/__down?bytes=30000000", "https://proof.ovh.net/files/10Mb.dat"} {
		resp, err := client.Get(u)
		if err != nil {
			continue
		}
		t := time.Now()
		var got int64
		buf := make([]byte, 64*1024)
		for time.Since(t) < 8*time.Second {
			n, err := resp.Body.Read(buf)
			got += int64(n)
			if err == io.EOF || err != nil {
				break
			}
		}
		resp.Body.Close()
		secs := time.Since(t).Seconds()
		if got > 1<<20 && secs > 0 {
			res["downMbps"] = round1(float64(got) * 8 / secs / 1e6)
			break
		}
	}
	return res
}

// ---------------------------------------------------------------- utilidades

func avg(v []float64) float64 {
	if len(v) == 0 {
		return 0
	}
	s := 0.0
	for _, x := range v {
		s += x
	}
	return s / float64(len(v))
}
func round1(f float64) float64 { return float64(int64(f*10+0.5)) / 10 }
func round2(f float64) float64 { return float64(int64(f*100+0.5)) / 100 }
func maxf(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
