//go:build windows

package main

// Ícono e identidad propios en la barra de tareas.
// La ventana la dibuja Edge/Chrome (--app), así que Windows la agruparía con el navegador y
// mostraría su ícono. Aquí la buscamos y le asignamos el ícono de MiVibra-PC.exe y un
// AppUserModelID propio (botón separado en la barra; al anclarla abre MiVibra-PC.exe).

import (
	"os"
	"runtime"
	"syscall"
	"time"
	"unsafe"
)

var (
	modUser32        = syscall.NewLazyDLL("user32.dll")
	modShell32       = syscall.NewLazyDLL("shell32.dll")
	modOle32         = syscall.NewLazyDLL("ole32.dll")
	procEnumWindows  = modUser32.NewProc("EnumWindows")
	procGetWindowTxt = modUser32.NewProc("GetWindowTextW")
	procIsVisible    = modUser32.NewProc("IsWindowVisible")
	procSendMessage  = modUser32.NewProc("SendMessageW")
	procSetClassLong = modUser32.NewProc("SetClassLongPtrW")
	procExtractIcon  = modShell32.NewProc("ExtractIconExW")
	procGetPropStore = modShell32.NewProc("SHGetPropertyStoreForWindow")
	procCoInit       = modOle32.NewProc("CoInitializeEx")
)

type guid struct {
	d1     uint32
	d2, d3 uint16
	d4     [8]byte
}
type propKey struct {
	fmtid guid
	pid   uint32
}
type propVariant struct {
	vt         uint16
	r1, r2, r3 uint16
	val        uintptr
	pad        uintptr
}

var (
	iidPropertyStore = guid{0x886D8EEB, 0x8CF2, 0x4446, [8]byte{0x8D, 0x02, 0xCD, 0xBA, 0x1D, 0xBD, 0xCF, 0x99}}
	fmtAppUserModel  = guid{0x9F4C2855, 0x9F79, 0x4B39, [8]byte{0xA8, 0xD0, 0xE1, 0xD4, 0x2D, 0xE1, 0xD5, 0xF3}}
)

const appUserModelID = "MiVibra.PC"

func findAppWindows(title string) []uintptr {
	var out []uintptr
	cb := syscall.NewCallback(func(h uintptr, _ uintptr) uintptr {
		if v, _, _ := procIsVisible.Call(h); v == 0 {
			return 1
		}
		buf := make([]uint16, 256)
		n, _, _ := procGetWindowTxt.Call(h, uintptr(unsafe.Pointer(&buf[0])), 256)
		if n > 0 && syscall.UTF16ToString(buf[:n]) == title {
			out = append(out, h)
		}
		return 1
	})
	procEnumWindows.Call(cb, 0)
	return out
}

func setWindowProps(hwnd uintptr, exe string) {
	var store *struct{ vtbl *[8]uintptr }
	r, _, _ := procGetPropStore.Call(hwnd, uintptr(unsafe.Pointer(&iidPropertyStore)), uintptr(unsafe.Pointer(&store)))
	if r != 0 || store == nil {
		return
	}
	vtbl, this := store.vtbl, uintptr(unsafe.Pointer(store))
	set := func(pid uint32, val string) {
		s, _ := syscall.UTF16PtrFromString(val)
		k := propKey{fmtAppUserModel, pid}
		v := propVariant{vt: 31 /* VT_LPWSTR */, val: uintptr(unsafe.Pointer(s))}
		syscall.SyscallN(vtbl[6], this, uintptr(unsafe.Pointer(&k)), uintptr(unsafe.Pointer(&v)))
	}
	set(2, `"`+exe+`"`)  // RelaunchCommand: al anclar, abre MiVibra-PC.exe
	set(3, exe+",0")     // RelaunchIconResource
	set(4, "MiVibra PC") // RelaunchDisplayNameResource
	set(5, appUserModelID)
	syscall.SyscallN(vtbl[7], this) // Commit
	syscall.SyscallN(vtbl[2], this) // Release
}

// brandWindow vigila la ventana de la app y le pone el ícono y la identidad de MiVibra.
func brandWindow(title string) {
	go func() {
		runtime.LockOSThread()
		procCoInit.Call(0, 2) // COINIT_APARTMENTTHREADED
		exe, _ := os.Executable()
		p, _ := syscall.UTF16PtrFromString(exe)
		var big, small uintptr
		procExtractIcon.Call(uintptr(unsafe.Pointer(p)), 0, uintptr(unsafe.Pointer(&big)), uintptr(unsafe.Pointer(&small)), 1)
		done := map[uintptr]bool{}
		for i := 0; ; i++ {
			for _, h := range findAppWindows(title) {
				if !done[h] {
					setWindowProps(h, exe)
					done[h] = true
				}
				if big != 0 { // Edge vuelve a poner su ícono al cargar la página: se reaplica
					procSendMessage.Call(h, 0x80 /* WM_SETICON */, 1, big)
					procSendMessage.Call(h, 0x80, 0, small)
				}
			}
			if i < 40 {
				time.Sleep(500 * time.Millisecond)
			} else {
				time.Sleep(4 * time.Second)
			}
		}
	}()
}
