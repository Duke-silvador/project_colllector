//go:build !windows

package main

import (
	"crypto/rand"
	mrand "math/rand"
	"os"
	"time"
)

func memInfo() (total, avail uint64) { return 16 << 30, 7 << 30 }

func diskSeqWrite(path string, total int64) (float64, error) {
	f, err := os.Create(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	buf := make([]byte, 4<<20)
	_, _ = rand.Read(buf)
	t0 := time.Now()
	for done := int64(0); done < total; done += int64(len(buf)) {
		if _, err := f.Write(buf); err != nil {
			return 0, err
		}
	}
	_ = f.Sync()
	return float64(total) / 1e6 / time.Since(t0).Seconds(), nil
}

func diskSeqRead(path string, total int64) (float64, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	buf := make([]byte, 4<<20)
	t0 := time.Now()
	var done int64
	for {
		n, err := f.Read(buf)
		done += int64(n)
		if err != nil || n == 0 {
			break
		}
	}
	return float64(done) / 1e6 / time.Since(t0).Seconds(), nil
}

func diskRand4K(path string, total int64, dur time.Duration) (float64, float64) {
	f, err := os.Open(path)
	if err != nil {
		return 0, 0
	}
	defer f.Close()
	buf := make([]byte, 4096)
	ops := 0
	t0 := time.Now()
	for time.Since(t0) < dur {
		if _, err := f.ReadAt(buf, mrand.Int63n(total/4096)*4096); err != nil {
			break
		}
		ops++
	}
	secs := time.Since(t0).Seconds()
	return float64(ops) / secs, secs * 1000 / float64(ops)
}
