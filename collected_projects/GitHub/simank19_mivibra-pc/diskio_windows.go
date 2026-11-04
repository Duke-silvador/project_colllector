//go:build windows

package main

import (
	"crypto/rand"
	mrand "math/rand"
	"syscall"
	"time"
	"unsafe"
)

const (
	fileFlagNoBuffering  = 0x20000000
	fileFlagWriteThrough = 0x80000000
)

// alignedBuf: con FILE_FLAG_NO_BUFFERING el búfer debe estar alineado al sector (4096).
func alignedBuf(size int) []byte {
	b := make([]byte, size+4096)
	off := int(4096-uintptr(unsafe.Pointer(&b[0]))&4095) % 4096
	return b[off : off+size]
}

func openDirect(path string, write bool) (syscall.Handle, error) {
	p, _ := syscall.UTF16PtrFromString(path)
	access, disp := uint32(syscall.GENERIC_READ), uint32(syscall.OPEN_EXISTING)
	if write {
		access, disp = syscall.GENERIC_WRITE, syscall.CREATE_ALWAYS
	}
	return syscall.CreateFile(p, access, syscall.FILE_SHARE_READ, nil, disp, syscall.FILE_ATTRIBUTE_NORMAL|fileFlagNoBuffering|fileFlagWriteThrough, 0)
}

// Lecturas y escrituras sin la caché de Windows: miden el disco real, no la memoria RAM.
func diskSeqWrite(path string, total int64) (float64, error) {
	h, err := openDirect(path, true)
	if err != nil {
		return 0, err
	}
	defer syscall.CloseHandle(h)
	buf := alignedBuf(4 << 20)
	_, _ = rand.Read(buf)
	t0 := time.Now()
	for done := int64(0); done < total; {
		n, err := syscall.Write(h, buf)
		if err != nil {
			return 0, err
		}
		done += int64(n)
	}
	return float64(total) / 1e6 / time.Since(t0).Seconds(), nil
}

func diskSeqRead(path string, total int64) (float64, error) {
	h, err := openDirect(path, false)
	if err != nil {
		return 0, err
	}
	defer syscall.CloseHandle(h)
	buf := alignedBuf(4 << 20)
	t0 := time.Now()
	var done int64
	for done < total {
		n, err := syscall.Read(h, buf)
		if err != nil || n == 0 {
			break
		}
		done += int64(n)
	}
	return float64(done) / 1e6 / time.Since(t0).Seconds(), nil
}

func diskRand4K(path string, total int64, dur time.Duration) (float64, float64) {
	h, err := openDirect(path, false)
	if err != nil {
		return 0, 0
	}
	defer syscall.CloseHandle(h)
	buf := alignedBuf(4096)
	blocks := total / 4096
	ops := 0
	t0 := time.Now()
	for time.Since(t0) < dur {
		off := mrand.Int63n(blocks) * 4096
		if _, err := syscall.Seek(h, off, 0); err != nil {
			break
		}
		if _, err := syscall.Read(h, buf); err != nil {
			break
		}
		ops++
	}
	secs := time.Since(t0).Seconds()
	if ops == 0 {
		return 0, 0
	}
	return float64(ops) / secs, secs * 1000 / float64(ops)
}
