//go:build windows

package main

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const psAVStatusFn = `
function D($d) { if ($d) { try { ([datetime]$d).ToString('yyyy-MM-ddTHH:mm:ss') } catch { '' } } else { '' } }
function Status {
  $r = [ordered]@{}
  $s = Get-MpComputerStatus -ErrorAction SilentlyContinue
  if ($s) {
    $r.defender = [ordered]@{ on = [bool]$s.AntivirusEnabled; svc = [bool]$s.AMServiceEnabled; rt = [bool]$s.RealTimeProtectionEnabled; mode = "$($s.AMRunningMode)";
      sig = (D $s.AntivirusSignatureLastUpdated); sigVer = "$($s.AntivirusSignatureVersion)"; quick = (D $s.QuickScanEndTime); full = (D $s.FullScanEndTime); tamper = [bool]$s.IsTamperProtected }
  }
  $r.av = @(Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction SilentlyContinue | ForEach-Object {
    $st = [int]$_.productState; [ordered]@{ name = "$($_.displayName)"; on = ((($st -shr 12) -band 0xF) -eq 1); current = ((($st -shr 4) -band 0xF) -eq 0) } })
  $e = $null
  $det = @(Get-MpThreatDetection -ErrorAction SilentlyContinue -ErrorVariable e)
  if ($e -and $e.Count -and -not $det.Count) { $r.needAdmin = $true }
  $th = @{}; Get-MpThreat -ErrorAction SilentlyContinue | ForEach-Object { $th["$($_.ThreatID)"] = $_ }
  $r.threats = @($det | Sort-Object InitialDetectionTime -Descending | Select-Object -First 80 | ForEach-Object {
    $t = $th["$($_.ThreatID)"]
    [ordered]@{ id = "$($_.ThreatID)"; name = $(if ($t) { "$($t.ThreatName)" } else { 'Amenaza ' + $_.ThreatID }); sev = $(if ($t) { [int]$t.SeverityID } else { 0 });
      active = $(if ($t) { [bool]$t.IsActive } else { $false }); status = [int]$_.ThreatStatusID; when = (D $_.InitialDetectionTime); ok = [bool]$_.ActionSuccess;
      proc = "$($_.ProcessName)"; res = @($_.Resources | Select-Object -First 6 | ForEach-Object { ("$_" -replace '^[a-zA-Z]+:_', '') }) } })
  return $r
}
`

const psAVStatus = `$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
` + psAVStatusFn + `
Status | ConvertTo-Json -Depth 6 -Compress`

const psAVOp = `$ErrorActionPreference = 'Stop'
` + psAVStatusFn + `
$out = __OUT__; $cancel = __CANCEL__; $op = __OP__; $arg = __ARG__; $upd = __UPD__
$mp = Join-Path $env:ProgramFiles 'Windows Defender\MpCmdRun.exe'
function W($h) { $h.beat = (Get-Date).ToString('o'); ($h | ConvertTo-Json -Depth 7 -Compress) | Set-Content -Encoding UTF8 -LiteralPath $out }
$st = [ordered]@{ state = 'running'; op = $op; arg = $arg; start = (Get-Date).ToString('o'); step = 'Preparando…'; found = 0 }
W $st
$before = @(Get-MpThreatDetection -ErrorAction SilentlyContinue).Count
try {
  if ($op -in 'quick', 'full', 'custom') {
    if ($upd) { $st.step = 'Actualizando la base de virus…'; W $st; try { Update-MpSignature -ErrorAction Stop } catch { } }
    $st.step = 'Escaneando…'; $st.scanStart = (Get-Date).ToString('o'); W $st
    $p = @{ ScanType = @{ quick = 'QuickScan'; full = 'FullScan'; custom = 'CustomScan' }[$op] }
    if ($op -eq 'custom') { $p.ScanPath = $arg }
    $j = Start-MpScan @p -AsJob
    while ($j.State -in 'NotStarted', 'Running') {
      if (Test-Path -LiteralPath $cancel) { & $mp -Scan -Cancel | Out-Null; Stop-Job $j -ErrorAction SilentlyContinue; $st.state = 'cancelled'; break }
      $st.found = [Math]::Max(0, @(Get-MpThreatDetection -ErrorAction SilentlyContinue).Count - $before); W $st
      Start-Sleep -Seconds 2
    }
    if ($st.state -eq 'running') { $e = @($j.ChildJobs | ForEach-Object { $_.Error }); if ($j.State -eq 'Failed' -or $e.Count) { throw ($e | Select-Object -First 1) } }
  } elseif ($op -eq 'remove') {
    $st.step = 'Eliminando amenazas…'; W $st; Remove-MpThreat
  } elseif ($op -eq 'restore') {
    $st.step = 'Restaurando…'; W $st; & $mp -Restore -Name $arg -All | Out-Null
    if ($LASTEXITCODE) { throw "Windows no pudo restaurar el archivo (código $LASTEXITCODE)" }
  } elseif ($op -eq 'update') {
    $st.step = 'Actualizando la base de virus…'; W $st; Update-MpSignature
  } elseif ($op -eq 'offline') {
    $st.step = 'Programando el escaneo sin conexión…'; W $st; Start-MpWDOScan
  }
  if ($st.state -eq 'running') { $st.state = 'done' }
} catch { $st.state = 'error'; $st.msg = "$($_.Exception.Message)".Trim(); if (-not $st.msg) { $st.msg = "$_" } }
$st.found = [Math]::Max(0, @(Get-MpThreatDetection -ErrorAction SilentlyContinue).Count - $before)
$st.end = (Get-Date).ToString('o')
$st.status = Status
W $st
`

func avStatus() ([]byte, error) { return runPS(psAVStatus, 90*time.Second) }

// avLaunch escribe el script y lo ejecuta oculto (como administrador: Defender lo exige para escanear y eliminar).
func avLaunch(op, arg string, update bool) error {
	upd := "$false"
	if update {
		upd = "$true"
	}
	script := strings.NewReplacer("__OUT__", psq(avJobFile()), "__CANCEL__", psq(avCancelFile()), "__OP__", psq(op), "__ARG__", psq(arg), "__UPD__", upd).Replace(psAVOp)
	p := filepath.Join(workDir, "antivirus.ps1")
	if err := os.WriteFile(p, append([]byte{0xEF, 0xBB, 0xBF}, []byte(script)...), 0o644); err != nil {
		return err
	}
	if isAdmin() {
		cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", p)
		hideWindow(cmd)
		if err := cmd.Start(); err != nil {
			return err
		}
		go func() { _ = cmd.Wait() }()
		return nil
	}
	args := `-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "` + p + `"`
	if err := shellExec("runas", "powershell.exe", args, 0); err != nil {
		return errors.New("Se necesita el permiso de administrador para usar el antivirus")
	}
	return nil
}
