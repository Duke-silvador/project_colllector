//go:build windows

package main

import (
	"context"
	"encoding/json"
	"errors"
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
	shell32           = syscall.NewLazyDLL("shell32.dll")
	user32            = syscall.NewLazyDLL("user32.dll")
	procIsUserAnAdmin = shell32.NewProc("IsUserAnAdmin")
	procShellExecuteW = shell32.NewProc("ShellExecuteW")
	procMessageBoxW   = user32.NewProc("MessageBoxW")
)

const createNoWindow = 0x08000000

func hideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: createNoWindow}
}

func fatal(msg string) {
	t, _ := syscall.UTF16PtrFromString("MiVibra PC")
	m, _ := syscall.UTF16PtrFromString(msg)
	procMessageBoxW.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10)
}

func isAdmin() bool {
	r, _, _ := procIsUserAnAdmin.Call()
	return r != 0
}

func shellExec(verb, file, params string, show int) error {
	v, _ := syscall.UTF16PtrFromString(verb)
	f, _ := syscall.UTF16PtrFromString(file)
	var p *uint16
	if params != "" {
		p, _ = syscall.UTF16PtrFromString(params)
	}
	r, _, _ := procShellExecuteW.Call(0, uintptr(unsafe.Pointer(v)), uintptr(unsafe.Pointer(f)), uintptr(unsafe.Pointer(p)), 0, uintptr(show))
	if r <= 32 {
		return errors.New("cancelado")
	}
	return nil
}

func relaunchAdmin() bool {
	exe, _ := os.Executable()
	return shellExec("runas", exe, "", 1) == nil
}

// runElevated abre este mismo programa como administrador para procesar la cola (un solo aviso UAC).
func runElevated(jobFile string) error {
	exe, _ := os.Executable()
	return shellExec("runas", exe, `--runner "`+jobFile+`"`, 0)
}

func openPath(p string) { _ = exec.Command("explorer.exe", p).Start() }

func scheduleReboot() {
	cmd := exec.Command("shutdown.exe", "/r", "/t", "60", "/c", "MiVibra PC terminó de instalar. El equipo se reiniciará en 1 minuto.")
	hideWindow(cmd)
	_ = cmd.Run()
}

func normCode(c int) int { return int(int32(uint32(c))) }

func runTool(timeout time.Duration, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	hideWindow(cmd)
	out, err := cmd.CombinedOutput()
	return string(out), err
}

func waitCancelable(cmd *exec.Cmd, timeout time.Duration, cancelled func() bool) int {
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	deadline := time.Now().Add(timeout)
	for {
		select {
		case <-done:
			if cmd.ProcessState == nil {
				return -1
			}
			return normCode(cmd.ProcessState.ExitCode())
		case <-time.After(time.Second):
			if cancelled() {
				_ = cmd.Process.Kill()
				<-done
				return -2
			}
			if time.Now().After(deadline) {
				_ = cmd.Process.Kill()
				<-done
				return -3
			}
		}
	}
}

func runCancelable(timeout time.Duration, cancelled func() bool, hide bool, name string, args ...string) (int, string) {
	cmd := exec.Command(name, args...)
	if hide {
		hideWindow(cmd)
	}
	var buf strings.Builder
	cmd.Stdout, cmd.Stderr = &buf, &buf
	if err := cmd.Start(); err != nil {
		return -1, err.Error()
	}
	return waitCancelable(cmd, timeout, cancelled), buf.String()
}

// runRaw usa la línea de comandos tal cual (necesario para parámetros como /v"/qn").
func runRaw(timeout time.Duration, cancelled func() bool, hide bool, prog, cmdline string) (int, string) {
	cmd := exec.Command(prog)
	attr := &syscall.SysProcAttr{CmdLine: cmdline}
	if hide {
		attr.HideWindow = true
	}
	cmd.SysProcAttr = attr
	cmd.Dir = filepath.Dir(prog)
	if !strings.Contains(prog, `\`) {
		cmd.Dir = ""
	}
	if err := cmd.Start(); err != nil {
		// Algunos instaladores exigen elevación propia o están marcados por Windows:
		// se reintenta como lo haría el Explorador (ShellExecuteEx), que resuelve esos casos.
		args := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(cmdline, `"`+prog+`"`), prog))
		code, e2 := shellExecWait(prog, args, hide, timeout, cancelled)
		if e2 != nil {
			return -1, winErrText(err) + " / " + e2.Error()
		}
		return code, ""
	}
	return waitCancelable(cmd, timeout, cancelled), ""
}

func winErrText(err error) string {
	var en syscall.Errno
	if errors.As(err, &en) {
		switch en {
		case 740:
			return "el instalador pide permisos de administrador"
		case 225:
			return "el antivirus de Windows bloqueó el archivo"
		case 193:
			return "el archivo no es un programa válido para Windows"
		case 5:
			return "acceso denegado"
		case 2, 3:
			return "no se encontró el archivo"
		}
		return fmt.Sprintf("error de Windows %d (%s)", int(en), en.Error())
	}
	return err.Error()
}

type shellExecuteInfo struct {
	cbSize       uint32
	fMask        uint32
	hwnd         uintptr
	lpVerb       *uint16
	lpFile       *uint16
	lpParameters *uint16
	lpDirectory  *uint16
	nShow        int32
	hInstApp     uintptr
	lpIDList     uintptr
	lpClass      *uint16
	hkeyClass    uintptr
	dwHotKey     uint32
	hIcon        uintptr
	hProcess     syscall.Handle
}

var procShellExecuteExW = syscall.NewLazyDLL("shell32.dll").NewProc("ShellExecuteExW")

// shellExecWait ejecuta con ShellExecuteEx y espera el código de salida.
func shellExecWait(file, params string, hide bool, timeout time.Duration, cancelled func() bool) (int, error) {
	const seeMaskNoCloseProcess, seeMaskNoAsync, seeMaskFlagNoUI = 0x40, 0x100, 0x400
	f, _ := syscall.UTF16PtrFromString(file)
	v, _ := syscall.UTF16PtrFromString("open")
	d, _ := syscall.UTF16PtrFromString(filepath.Dir(file))
	info := shellExecuteInfo{fMask: seeMaskNoCloseProcess | seeMaskNoAsync | seeMaskFlagNoUI, lpVerb: v, lpFile: f, lpDirectory: d, nShow: 1}
	if hide {
		info.nShow = 0
	}
	if params != "" {
		info.lpParameters, _ = syscall.UTF16PtrFromString(params)
	}
	info.cbSize = uint32(unsafe.Sizeof(info))
	r, _, e := procShellExecuteExW.Call(uintptr(unsafe.Pointer(&info)))
	if r == 0 {
		return -1, errors.New(winErrText(e))
	}
	if info.hProcess == 0 {
		return 0, nil
	}
	defer syscall.CloseHandle(info.hProcess)
	deadline := time.Now().Add(timeout)
	for {
		ev, _ := syscall.WaitForSingleObject(info.hProcess, 1000)
		if ev == syscall.WAIT_OBJECT_0 {
			var code uint32
			_ = syscall.GetExitCodeProcess(info.hProcess, &code)
			return normCode(int(code)), nil
		}
		if cancelled() {
			_ = syscall.TerminateProcess(info.hProcess, 1)
			return -2, nil
		}
		if time.Now().After(deadline) {
			_ = syscall.TerminateProcess(info.hProcess, 1)
			return -3, nil
		}
	}
}

// unblock quita la marca "descargado de internet" para que Windows no frene el instalador.
func unblock(p string) { _ = os.Remove(p + ":Zone.Identifier") }

func runPS(script string, timeout time.Duration) ([]byte, error) {
	f, err := os.CreateTemp("", "mivibra-*.ps1")
	if err != nil {
		return nil, err
	}
	name := f.Name()
	defer os.Remove(name)
	_, _ = f.Write([]byte{0xEF, 0xBB, 0xBF})
	_, _ = f.WriteString(script)
	_ = f.Close()
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", name)
	hideWindow(cmd)
	out, err := cmd.Output()
	return []byte(strings.TrimSpace(string(out))), err
}

func psq(s string) string { return "'" + strings.ReplaceAll(s, "'", "''") + "'" }

const psMeta = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Drawing
$paths = Get-Content -LiteralPath __LIST__ -Raw -Encoding UTF8 | ConvertFrom-Json
$res = @{}
foreach ($p in $paths) {
  $o = [ordered]@{ product = ''; desc = ''; company = ''; version = ''; icon = '' }
  try { $v = (Get-Item -LiteralPath $p).VersionInfo; $o.product = "" + $v.ProductName; $o.desc = "" + $v.FileDescription; $o.company = "" + $v.CompanyName; $o.version = "" + $v.ProductVersion } catch {}
  if ($p -like '*.msi') {
    try {
      $wi = New-Object -ComObject WindowsInstaller.Installer
      $db = $wi.GetType().InvokeMember('OpenDatabase', 'InvokeMethod', $null, $wi, @($p, 0))
      foreach ($prop in 'ProductName', 'ProductVersion', 'Manufacturer') {
        $view = $db.GetType().InvokeMember('OpenView', 'InvokeMethod', $null, $db, @("SELECT Value FROM Property WHERE Property='$prop'"))
        $view.GetType().InvokeMember('Execute', 'InvokeMethod', $null, $view, $null) | Out-Null
        $rec = $view.GetType().InvokeMember('Fetch', 'InvokeMethod', $null, $view, $null)
        if ($rec) {
          $val = $rec.GetType().InvokeMember('StringData', 'GetProperty', $null, $rec, 1)
          if ($prop -eq 'ProductName') { $o.product = $val } elseif ($prop -eq 'ProductVersion') { $o.version = $val } else { $o.company = $val }
        }
        $view.GetType().InvokeMember('Close', 'InvokeMethod', $null, $view, $null) | Out-Null
      }
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($db)
    } catch {}
  }
  try {
    $ic = [System.Drawing.Icon]::ExtractAssociatedIcon($p)
    if ($ic) { $bmp = $ic.ToBitmap(); $ms = New-Object IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $o.icon = [Convert]::ToBase64String($ms.ToArray()); $bmp.Dispose(); $ic.Dispose() }
  } catch {}
  $res[$p] = $o
}
ConvertTo-Json -InputObject $res -Depth 3 -Compress
`

func readMeta(paths []string) map[string]MetaCache {
	out := map[string]MetaCache{}
	list, err := os.CreateTemp("", "mivibra-lista-*.json")
	if err != nil {
		return out
	}
	b, _ := json.Marshal(paths)
	_, _ = list.Write(b)
	list.Close()
	defer os.Remove(list.Name())
	res, err := runPS(strings.Replace(psMeta, "__LIST__", psq(list.Name()), 1), 5*time.Minute)
	if err != nil && len(res) == 0 {
		return out
	}
	var m map[string]MetaCache
	if json.Unmarshal(res, &m) == nil {
		out = m
	}
	return out
}

const psInstalled = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$k = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
$n = @(Get-ItemProperty $k | Where-Object { $_.DisplayName } | ForEach-Object { "" + $_.DisplayName })
try { $n += @(Get-AppxPackage | ForEach-Object { "" + $_.Name }) } catch {}
ConvertTo-Json -InputObject @($n | Sort-Object -Unique) -Compress
`

var (
	instMu    sync.Mutex
	instNames []string
	instAt    time.Time
)

func invalidateInstalled() {
	instMu.Lock()
	instAt = time.Time{}
	instMu.Unlock()
}

func installedNames(refresh bool) []string {
	instMu.Lock()
	defer instMu.Unlock()
	if !refresh && instNames != nil && time.Since(instAt) < 60*time.Second {
		return instNames
	}
	res, err := runPS(psInstalled, 60*time.Second)
	if err == nil || len(res) > 0 {
		var n []string
		if json.Unmarshal(res, &n) == nil {
			instNames, instAt = n, time.Now()
		}
	}
	return instNames
}

func openWindow(url string) {
	data := filepath.Join(os.Getenv("LOCALAPPDATA"), "MiVibraPC", "ventana")
	_ = os.MkdirAll(data, 0o755)
	cands := []string{
		filepath.Join(os.Getenv("ProgramFiles(x86)"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("ProgramFiles"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("LOCALAPPDATA"), `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(os.Getenv("ProgramFiles"), `Google\Chrome\Application\chrome.exe`),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), `Google\Chrome\Application\chrome.exe`),
		filepath.Join(os.Getenv("LOCALAPPDATA"), `Google\Chrome\Application\chrome.exe`),
		filepath.Join(os.Getenv("ProgramFiles"), `BraveSoftware\Brave-Browser\Application\brave.exe`),
	}
	for _, c := range cands {
		if _, err := os.Stat(c); err == nil {
			cmd := exec.Command(c, "--app="+url, "--window-size=1320,880", "--user-data-dir="+data,
				"--no-first-run", "--no-default-browser-check", "--disable-features=Translate,msEdgeSidebarV2", "--lang=es")
			if cmd.Start() == nil {
				return
			}
		}
	}
	_ = exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url).Start()
}

// makeShortcut crea el acceso directo de un programa portable en el menú Inicio (para todos los usuarios).
func makeShortcut(name, target string) {
	dir := filepath.Join(os.Getenv("ProgramData"), `Microsoft\Windows\Start Menu\Programs\MiVibra Portables`)
	_ = os.MkdirAll(dir, 0o755)
	lnk := filepath.Join(dir, safeName(name)+".lnk")
	_, _ = runPS(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut(`+psq(lnk)+`);$s.TargetPath=`+psq(target)+`;$s.WorkingDirectory=`+psq(filepath.Dir(target))+`;$s.Save()`, 20*time.Second)
}

// ventoyDrive busca una USB preparada con Ventoy (etiqueta de volumen "Ventoy").
func ventoyDrive() string {
	k := syscall.NewLazyDLL("kernel32.dll")
	getDrives := k.NewProc("GetLogicalDrives")
	getVol := k.NewProc("GetVolumeInformationW")
	mask, _, _ := getDrives.Call()
	for i := 2; i < 26; i++ { // desde C:
		if mask&(1<<uint(i)) == 0 {
			continue
		}
		root := string(rune('A'+i)) + `:\`
		p, _ := syscall.UTF16PtrFromString(root)
		label := make([]uint16, 261)
		r, _, _ := getVol.Call(uintptr(unsafe.Pointer(p)), uintptr(unsafe.Pointer(&label[0])), 261, 0, 0, 0, 0, 0)
		if r != 0 && strings.EqualFold(syscall.UTF16ToString(label), "Ventoy") {
			return root
		}
	}
	return ""
}
