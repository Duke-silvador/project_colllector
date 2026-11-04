//go:build windows

package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

var (
	kernel32 = syscall.NewLazyDLL("kernel32.dll")

	procGetSystemTimes       = kernel32.NewProc("GetSystemTimes")
	procGlobalMemoryStatusEx = kernel32.NewProc("GlobalMemoryStatusEx")
	procGetSystemPowerStatus = kernel32.NewProc("GetSystemPowerStatus")
	procGetDiskFreeSpaceExW  = kernel32.NewProc("GetDiskFreeSpaceExW")
	procGetTickCount64       = kernel32.NewProc("GetTickCount64")
)

func hardwareInfo() ([]byte, error) { return runPS(psHardware, 120*time.Second) }
func softwareInfo() ([]byte, error) { return runPS(psSoftware, 150*time.Second) }
func usbDevices() ([]byte, error)   { return runPS(psUSB, 30*time.Second) }

// ---------------------------------------------------------------- métricas en vivo (sin PowerShell)

type filetime struct{ Low, High uint32 }

func (f filetime) u64() uint64 { return uint64(f.High)<<32 | uint64(f.Low) }

var (
	cpuMu                        sync.Mutex
	lastIdle, lastKern, lastUser uint64
)

func cpuPercent() float64 {
	var idle, kern, usr filetime
	r, _, _ := procGetSystemTimes.Call(uintptr(unsafe.Pointer(&idle)), uintptr(unsafe.Pointer(&kern)), uintptr(unsafe.Pointer(&usr)))
	if r == 0 {
		return -1
	}
	cpuMu.Lock()
	defer cpuMu.Unlock()
	i, k, u := idle.u64(), kern.u64(), usr.u64()
	di, dk, du := i-lastIdle, k-lastKern, u-lastUser
	first := lastKern == 0
	lastIdle, lastKern, lastUser = i, k, u
	if first || dk+du == 0 {
		return -1
	}
	return float64(dk+du-di) / float64(dk+du) * 100
}

type memStatusEx struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

type powerStatus struct {
	ACLineStatus        byte
	BatteryFlag         byte
	BatteryLifePercent  byte
	SystemStatusFlag    byte
	BatteryLifeTime     uint32
	BatteryFullLifeTime uint32
}

func memInfo() (total, avail uint64) {
	var m memStatusEx
	m.Length = uint32(unsafe.Sizeof(m))
	procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&m)))
	return m.TotalPhys, m.AvailPhys
}

func liveStats() map[string]any {
	total, avail := memInfo()
	var ps powerStatus
	procGetSystemPowerStatus.Call(uintptr(unsafe.Pointer(&ps)))
	var free, tot, totFree uint64
	p, _ := syscall.UTF16PtrFromString(os.Getenv("SystemDrive") + `\`)
	procGetDiskFreeSpaceExW.Call(uintptr(unsafe.Pointer(p)), uintptr(unsafe.Pointer(&free)), uintptr(unsafe.Pointer(&tot)), uintptr(unsafe.Pointer(&totFree)))
	up, _, _ := procGetTickCount64.Call()
	res := map[string]any{
		"cpu": cpuPercent(), "ramTotal": total, "ramAvail": avail,
		"ac": ps.ACLineStatus == 1, "batPct": int(ps.BatteryLifePercent), "batFlag": int(ps.BatteryFlag),
		"batSecs": int64(int32(ps.BatteryLifeTime)), "diskFree": free, "diskTotal": tot, "uptimeMs": uint64(up),
	}
	return res
}

// ---------------------------------------------------------------- ventana

// ---------------------------------------------------------------- acciones

func startDetached(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	return cmd.Start()
}

func adminConsole(command string) map[string]any {
	ps := fmt.Sprintf("Start-Process -FilePath cmd.exe -Verb RunAs -ArgumentList '/k title MiVibra && %s'", strings.ReplaceAll(command, "'", "''"))
	_, err := runPS(ps, 60*time.Second)
	if err != nil {
		return map[string]any{"ok": false, "msg": "Se canceló el permiso de administrador"}
	}
	return map[string]any{"ok": true, "msg": "Se abrió una consola de administrador. Deja que termine y revisa el resultado allí."}
}

func runHidden(timeout time.Duration, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	hideWindow(cmd)
	out, err := cmd.CombinedOutput()
	return strings.TrimSpace(string(out)), err
}

func runAction(name string) map[string]any {
	open := func(target string) map[string]any {
		if err := startDetached("explorer.exe", target); err != nil {
			return map[string]any{"ok": false, "msg": err.Error()}
		}
		return map[string]any{"ok": true}
	}
	switch name {
	case "admin":
		exe, _ := os.Executable()
		_, err := runPS(fmt.Sprintf("Start-Process -FilePath '%s' -Verb RunAs", strings.ReplaceAll(exe, "'", "''")), 60*time.Second)
		if err != nil {
			return map[string]any{"ok": false, "msg": "Se canceló el permiso de administrador"}
		}
		go func() { time.Sleep(1500 * time.Millisecond); os.Exit(0) }()
		return map[string]any{"ok": true, "msg": "MiVibra se abrió de nuevo como administrador."}
	case "flushdns":
		out, err := runHidden(30*time.Second, "ipconfig.exe", "/flushdns")
		return map[string]any{"ok": err == nil, "msg": lastLine(out)}
	case "sfc":
		return adminConsole("sfc /scannow")
	case "dism":
		return adminConsole("DISM /Online /Cleanup-Image /RestoreHealth")
	case "chkdsk":
		return adminConsole("chkdsk " + os.Getenv("SystemDrive") + " /scan")
	case "netreset":
		return adminConsole("netsh winsock reset && netsh int ip reset && ipconfig /release && ipconfig /renew && ipconfig /flushdns")
	case "restorepoint":
		if !isAdmin() {
			return map[string]any{"ok": false, "msg": "Requiere ejecutar MiVibra como administrador"}
		}
		_, err := runPS("Enable-ComputerRestore -Drive \"$env:SystemDrive\\\"; Checkpoint-Computer -Description 'MiVibra' -RestorePointType MODIFY_SETTINGS -ErrorAction Stop", 180*time.Second)
		if err != nil {
			return map[string]any{"ok": false, "msg": "Windows solo permite un punto de restauración cada 24 horas, o la protección del sistema está desactivada"}
		}
		return map[string]any{"ok": true, "msg": "Punto de restauración creado"}
	case "batteryreport":
		f := filepath.Join(os.TempDir(), "MiVibra-informe-bateria.html")
		if _, err := runHidden(60*time.Second, "powercfg.exe", "/batteryreport", "/output", f); err != nil {
			return map[string]any{"ok": false, "msg": "Este equipo no tiene batería o el informe no está disponible"}
		}
		return open(f)
	case "highperf":
		out, err := runHidden(20*time.Second, "powercfg.exe", "/setactive", "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c")
		if err != nil {
			return map[string]any{"ok": false, "msg": "Este equipo no tiene el plan de alto rendimiento. Ajusta el modo de energía en Configuración."}
		}
		_ = out
		return map[string]any{"ok": true, "msg": "Plan de alto rendimiento activado"}
	case "balanced":
		_, err := runHidden(20*time.Second, "powercfg.exe", "/setactive", "381b4222-f694-41f0-9685-ff5bb260df2e")
		return map[string]any{"ok": err == nil, "msg": "Plan equilibrado activado"}
	case "startup":
		return okStart("taskmgr.exe", "/0", "/startup")
	case "taskmgr":
		return okStart("taskmgr.exe")
	case "devmgr":
		return okStart("mmc.exe", "devmgmt.msc")
	case "optimize":
		return okStart("dfrgui.exe")
	case "reliability":
		return okStart("perfmon.exe", "/rel")
	case "cleanmgr":
		return okStart("cleanmgr.exe")
	case "update":
		return open("ms-settings:windowsupdate")
	case "storage":
		return open("ms-settings:storagesense")
	case "apps":
		return open("ms-settings:appsfeatures")
	case "power":
		return open("ms-settings:powersleep")
	case "defender":
		return open("windowsdefender:")
	case "activation":
		return open("ms-settings:activation")
	case "display":
		return open("ms-settings:display")
	case "sound":
		return open("ms-settings:sound")
	case "bluetooth":
		return open("ms-settings:bluetooth")
	case "network":
		return open("ms-settings:network-status")
	case "privacycam":
		return open("ms-settings:privacy-webcam")
	case "privacymic":
		return open("ms-settings:privacy-microphone")
	}
	return map[string]any{"ok": false, "msg": "Acción desconocida"}
}

func okStart(name string, args ...string) map[string]any {
	if err := startDetached(name, args...); err != nil {
		return map[string]any{"ok": false, "msg": err.Error()}
	}
	return map[string]any{"ok": true}
}

// tamaño de la papelera vía Shell
func recycleBin() (int64, int) {
	out, err := runPS(psRecycleSize, 60*time.Second)
	if err != nil {
		return 0, 0
	}
	var s int64
	var n int
	fmt.Sscanf(strings.TrimSpace(string(out)), "%d %d", &s, &n)
	return s, n
}

func emptyRecycleBin() error {
	_, err := runPS("Clear-RecycleBin -Force -ErrorAction SilentlyContinue", 120*time.Second)
	return err
}
