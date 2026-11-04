package main

// Scripts de PowerShell 5.1 (incluido en Windows 10/11). Cada bloque está protegido con try/catch
// para que un dato que falle no impida obtener los demás.

const psPrelude = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
function S($v) { if ($null -eq $v) { '' } else { ("" + $v).Trim() } }
function D($d) { if ($d) { try { ([datetime]$d).ToString('yyyy-MM-ddTHH:mm:ss') } catch { '' } } else { '' } }
$o = [ordered]@{}
$o.admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
`

const psHardware = psPrelude + `
try {
  $os = Get-CimInstance Win32_OperatingSystem
  $cv = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
  $o.os = [ordered]@{ caption = S $os.Caption; version = S $os.Version; build = S $os.BuildNumber; ubr = $cv.UBR; display = S $cv.DisplayVersion;
    arch = S $os.OSArchitecture; installed = D $os.InstallDate; boot = D $os.LastBootUpTime; user = $env:USERNAME; computer = $env:COMPUTERNAME }
} catch {}
try {
  $cs = Get-CimInstance Win32_ComputerSystem
  $o.cs = [ordered]@{ maker = S $cs.Manufacturer; model = S $cs.Model; family = S $cs.SystemFamily; ram = [int64]$cs.TotalPhysicalMemory; pctype = $cs.PCSystemType }
} catch {}
try { $p = Get-CimInstance Win32_ComputerSystemProduct; $o.product = [ordered]@{ name = S $p.Name; version = S $p.Version; serial = S $p.IdentifyingNumber } } catch {}
try { $b = Get-CimInstance Win32_BIOS; $o.bios = [ordered]@{ maker = S $b.Manufacturer; version = S $b.SMBIOSBIOSVersion; date = D $b.ReleaseDate; serial = S $b.SerialNumber } } catch {}
try { $bb = Get-CimInstance Win32_BaseBoard | Select-Object -First 1; $o.board = [ordered]@{ maker = S $bb.Manufacturer; product = S $bb.Product } } catch {}
try { $o.chassis = @((Get-CimInstance Win32_SystemEnclosure | Select-Object -First 1).ChassisTypes) } catch {}
try {
  $o.cpu = @(Get-CimInstance Win32_Processor | ForEach-Object { [ordered]@{ name = S $_.Name; cores = $_.NumberOfCores; threads = $_.NumberOfLogicalProcessors;
    mhz = $_.MaxClockSpeed; l2 = $_.L2CacheSize; l3 = $_.L3CacheSize; socket = S $_.SocketDesignation; virt = $_.VirtualizationFirmwareEnabled } })
} catch {}
try {
  $o.ram = @(Get-CimInstance Win32_PhysicalMemory | ForEach-Object { [ordered]@{ cap = [int64]$_.Capacity; speed = $_.Speed; conf = $_.ConfiguredClockSpeed;
    maker = S $_.Manufacturer; part = S $_.PartNumber; slot = S $_.DeviceLocator; type = $_.SMBIOSMemoryType; form = $_.FormFactor } })
} catch {}
try { $a = @(Get-CimInstance Win32_PhysicalMemoryArray); $o.ramSlots = ($a | Measure-Object MemoryDevices -Sum).Sum; $o.ramMaxKB = ($a | Measure-Object MaxCapacityEx -Sum).Sum } catch {}
try {
  $vr = @{}
  Get-ItemProperty 'HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0*' | ForEach-Object {
    $q = $_.'HardwareInformation.qwMemorySize'
    if ($q -is [byte[]]) { $q = [BitConverter]::ToInt64($q, 0) }
    if ($q) { $vr[[string]$_.DriverDesc] = [int64]$q }
  }
  $o.gpu = @(Get-CimInstance Win32_VideoController | ForEach-Object {
    $m = [int64]$_.AdapterRAM; if ($vr.ContainsKey([string]$_.Name)) { $m = $vr[[string]$_.Name] }
    [ordered]@{ name = S $_.Name; vram = $m; driver = S $_.DriverVersion; driverDate = D $_.DriverDate; w = $_.CurrentHorizontalResolution;
      h = $_.CurrentVerticalResolution; hz = $_.CurrentRefreshRate; status = S $_.Status; code = $_.ConfigManagerErrorCode } })
} catch {}
try {
  $basic = @{}
  Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams | ForEach-Object { $basic[$_.InstanceName] = $_ }
  $o.monitors = @(Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorID | ForEach-Object {
    $n = ($_.UserFriendlyName | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) -join ''
    $mk = ($_.ManufacturerName | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }) -join ''
    $bp = $basic[$_.InstanceName]; $in = 0
    if ($bp -and $bp.MaxHorizontalImageSize -gt 0) { $in = [math]::Round([math]::Sqrt([math]::Pow($bp.MaxHorizontalImageSize, 2) + [math]::Pow($bp.MaxVerticalImageSize, 2)) / 2.54, 1) }
    [ordered]@{ name = $n; maker = $mk; inches = $in; year = $_.YearOfManufacture; internal = ($_.InstanceName -match 'DISPLAY\\(LGD|BOE|AUO|SDC|CMN|SHP|IVO|NCP|LEN|CSO)') } })
} catch {}
try {
  $pred = @{}
  try { Get-CimInstance -Namespace root\wmi -ClassName MSStorageDriver_FailurePredictStatus | ForEach-Object { $pred[$_.InstanceName] = $_.PredictFailure } } catch {}
  $o.predictFail = ($pred.Values | Where-Object { $_ }).Count
  $o.disks = @(Get-PhysicalDisk | ForEach-Object {
    $r = $null; try { $r = $_ | Get-StorageReliabilityCounter } catch {}
    [ordered]@{ name = S $_.FriendlyName; media = S $_.MediaType; bus = S $_.BusType; size = [int64]$_.Size; health = S $_.HealthStatus;
      op = S ($_.OperationalStatus -join ','); serial = S $_.SerialNumber; fw = S $_.FirmwareVersion;
      temp = $(if ($r) { $r.Temperature } else { $null }); wear = $(if ($r) { $r.Wear } else { $null });
      hours = $(if ($r) { $r.PowerOnHours } else { $null }); rerr = $(if ($r) { $r.ReadErrorsUncorrected } else { $null });
      werr = $(if ($r) { $r.WriteErrorsUncorrected } else { $null }) } })
} catch {}
try { $o.volumes = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { [ordered]@{ id = S $_.DeviceID; label = S $_.VolumeName; fs = S $_.FileSystem; size = [int64]$_.Size; free = [int64]$_.FreeSpace } }) } catch {}
try {
  $bat = @(Get-CimInstance Win32_Battery) | Select-Object -First 1
  if ($bat) {
    $x = [ordered]@{ present = $true; charge = $bat.EstimatedChargeRemaining; status = $bat.BatteryStatus; name = S $bat.Name; runtime = $bat.EstimatedRunTime }
    $f = Join-Path $env:TEMP ('mivibra-bat-' + [guid]::NewGuid().ToString('N') + '.xml')
    & powercfg.exe /batteryreport /xml /output $f | Out-Null
    if (Test-Path $f) {
      [xml]$xml = Get-Content $f -Raw
      $bb = @($xml.BatteryReport.Batteries.Battery)[0]
      if ($bb) { $x.design = [int64]$bb.DesignCapacity; $x.full = [int64]$bb.FullChargeCapacity; if ($bb.CycleCount) { $x.cycles = [int]$bb.CycleCount }; $x.maker = S $bb.Manufacturer; $x.id = S $bb.Id; $x.chem = S $bb.Chemistry; $x.src = 'report' }
      Remove-Item $f -Force
    }
    if (-not $x.design) {
      $s = @(Get-CimInstance -Namespace root\wmi -ClassName BatteryStaticData)[0]
      $fc = @(Get-CimInstance -Namespace root\wmi -ClassName BatteryFullChargedCapacity)[0]
      $cc = @(Get-CimInstance -Namespace root\wmi -ClassName BatteryCycleCount)[0]
      if ($s) { $x.design = [int64]$s.DesignedCapacity }
      if ($fc) { $x.full = [int64]$fc.FullChargedCapacity }
      if ($cc) { $x.cycles = [int]$cc.CycleCount }
      if ($x.design) { $x.src = 'wmi' }
    }
    $o.battery = $x
  } else { $o.battery = [ordered]@{ present = $false } }
} catch {}
try { $o.net = @(Get-NetAdapter -Physical | ForEach-Object { [ordered]@{ name = S $_.Name; desc = S $_.InterfaceDescription; status = S $_.Status; speed = S $_.LinkSpeed; mac = S $_.MacAddress; media = S $_.PhysicalMediaType } }) } catch {}
try {
  $w = (netsh.exe wlan show interfaces) -join "` + "`n" + `"
  if ($w -match '(?m)^\s*(Signal|Se\S{1,2}al)\s*:\s*(\d+)\s*%') { $o.wifiSignal = [int]$Matches[2] }
  if ($w -match '(?m)^\s*SSID\s*:\s*(.+)$') { $o.wifiSsid = $Matches[1].Trim() }
  if ($w -match '(?m)^\s*(Radio type|Tipo de radio)\s*:\s*(.+)$') { $o.wifiRadio = $Matches[2].Trim() }
} catch {}
try { $o.audio = @(Get-CimInstance Win32_SoundDevice | ForEach-Object { [ordered]@{ name = S $_.Name; status = S $_.Status } }) } catch {}
try { $o.cams = @(Get-PnpDevice -PresentOnly -Class Camera, Image | ForEach-Object { [ordered]@{ name = S $_.FriendlyName; status = S $_.Status } }) } catch {}
try { $o.bt = @(Get-PnpDevice -PresentOnly -Class Bluetooth | Where-Object { $_.InstanceId -match '^(USB|PCI)\\' } | ForEach-Object { [ordered]@{ name = S $_.FriendlyName; status = S $_.Status } }) } catch {}
try { $o.keyboards = @(Get-CimInstance Win32_Keyboard | ForEach-Object { S $_.Description }) } catch {}
try { $o.pointing = @(Get-CimInstance Win32_PointingDevice | ForEach-Object { S $_.Name }) } catch {}
try { $o.thermal = @(Get-CimInstance -Namespace root\wmi -ClassName MSAcpi_ThermalZoneTemperature | ForEach-Object { [math]::Round($_.CurrentTemperature / 10 - 273.15, 1) }) } catch {}
try {
  $sb = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\SecureBoot\State'
  if ($sb) { $o.secureBoot = ($sb.UEFISecureBootEnabled -eq 1) }
} catch {}
try {
  $t = Get-CimInstance -Namespace root\cimv2\security\microsofttpm -ClassName Win32_Tpm
  if ($t) { $o.tpm = [ordered]@{ ver = S $t.SpecVersion; on = $t.IsEnabled_InitialValue } }
  else {
    $td = Get-PnpDevice -PresentOnly -Class SecurityDevices | Where-Object { $_.FriendlyName -match 'Trusted Platform|TPM' } | Select-Object -First 1
    if ($td) { $o.tpm = [ordered]@{ ver = $(if ($td.FriendlyName -match '2\.0') { '2.0' } elseif ($td.FriendlyName -match '1\.2') { '1.2' } else { '' }); on = ($td.Status -eq 'OK') } }
  }
} catch {}
$o.firmware = $env:firmware_type
ConvertTo-Json -InputObject $o -Depth 6 -Compress
`

const psSoftware = psPrelude + `
$since7 = (Get-Date).AddDays(-7); $since30 = (Get-Date).AddDays(-30)
try { $os = Get-CimInstance Win32_OperatingSystem; $cv = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
  $o.os = [ordered]@{ caption = S $os.Caption; build = S $os.BuildNumber; display = S $cv.DisplayVersion; boot = D $os.LastBootUpTime; installed = D $os.InstallDate } } catch {}
try {
  $l = Get-CimInstance SoftwareLicensingProduct -Filter "ApplicationID='55c92734-d682-4d71-983e-d6ec3f16059f' AND PartialProductKey IS NOT NULL" | Select-Object -First 1
  if ($l) { $o.activation = [ordered]@{ status = $l.LicenseStatus; name = S $l.Name; channel = S $l.ProductKeyChannel } }
} catch {}
try { $m = Get-MpComputerStatus; if ($m) { $o.defender = [ordered]@{ av = $m.AntivirusEnabled; rt = $m.RealTimeProtectionEnabled; sig = D $m.AntivirusSignatureLastUpdated; quickAge = $m.QuickScanAge } } } catch {}
try { $o.av = @(Get-CimInstance -Namespace root\SecurityCenter2 -ClassName AntiVirusProduct | ForEach-Object { $st = [int]$_.productState; [ordered]@{ name = S $_.displayName; on = ((($st -shr 12) -band 0xF) -eq 1); current = ((($st -shr 4) -band 0xF) -eq 0) } }) } catch {}
try { $o.firewall = @(Get-NetFirewallProfile | ForEach-Object { [ordered]@{ name = S $_.Name; on = ("" + $_.Enabled) -eq 'True' } }) } catch {}
try {
  $us = New-Object -ComObject Microsoft.Update.Session
  $se = $us.CreateUpdateSearcher(); $n = $se.GetTotalHistoryCount()
  if ($n -gt 0) { $last = $se.QueryHistory(0, [math]::Min($n, 50)) | Where-Object { $_.ResultCode -eq 2 } | Sort-Object Date -Descending | Select-Object -First 1; if ($last) { $o.lastUpdate = D $last.Date; $o.lastUpdateTitle = S $last.Title } }
} catch {}
if (-not $o.lastUpdate) { try { $h = Get-HotFix | Where-Object { $_.InstalledOn } | Sort-Object InstalledOn -Descending | Select-Object -First 1; if ($h) { $o.lastUpdate = D $h.InstalledOn; $o.lastUpdateTitle = S $h.HotFixID } } catch {} }
$o.reboot = (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') -or (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired')
try { $o.badDevices = @(Get-CimInstance Win32_PnPEntity -Filter 'ConfigManagerErrorCode <> 0' | Where-Object { $_.ConfigManagerErrorCode -ne 45 } | ForEach-Object { [ordered]@{ name = S $_.Name; cls = S $_.PNPClass; code = $_.ConfigManagerErrorCode } }) } catch {}
try { $e = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; Level = 1, 2; StartTime = $since7 } -MaxEvents 1000); $o.sysErrors = $e.Count
  $o.topErrors = @($e | Group-Object ProviderName | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object { [ordered]@{ src = S $_.Name; n = $_.Count } }) } catch { $o.sysErrors = 0 }
try { $o.bsod = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 1001; ProviderName = 'Microsoft-Windows-WER-SystemErrorReporting'; StartTime = $since30 } -MaxEvents 100).Count } catch { $o.bsod = 0 }
try { $o.unexpected = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; Id = 41; ProviderName = 'Microsoft-Windows-Kernel-Power'; StartTime = $since30 } -MaxEvents 100).Count } catch { $o.unexpected = 0 }
try { $o.whea = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; ProviderName = 'Microsoft-Windows-WHEA-Logger'; StartTime = $since30 } -MaxEvents 200).Count } catch { $o.whea = 0 }
try { $o.diskErrors = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; ProviderName = 'disk', 'Ntfs', 'stornvme', 'storahci'; Level = 1, 2, 3; StartTime = $since30 } -MaxEvents 300).Count } catch { $o.diskErrors = 0 }
try { $ac = @(Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Id = 1000; StartTime = $since7 } -MaxEvents 500); $o.appCrashes = $ac.Count
  $o.topCrashes = @($ac | ForEach-Object { if ($_.Properties.Count -gt 0) { [string]$_.Properties[0].Value } } | Group-Object | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object { [ordered]@{ app = S $_.Name; n = $_.Count } }) } catch { $o.appCrashes = 0 }
try { $o.startup = @(Get-CimInstance Win32_StartupCommand | ForEach-Object { [ordered]@{ name = S $_.Name; loc = S $_.Location } }) } catch {}
try { $keys = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
  $o.programs = @(Get-ItemProperty $keys | Where-Object { $_.DisplayName -and -not $_.SystemComponent -and -not $_.ParentKeyName }).Count } catch {}
try { $pp = (powercfg.exe /getactivescheme) -join ' '; if ($pp -match '\((.+)\)') { $o.powerPlan = $Matches[1] } } catch {}
try { $sb = Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\SecureBoot\State'; if ($sb) { $o.secureBoot = ($sb.UEFISecureBootEnabled -eq 1) } } catch {}
try { $c = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"; $o.cFree = [int64]$c.FreeSpace; $o.cSize = [int64]$c.Size } catch {}
try { $o.restorePoints = @(Get-ComputerRestorePoint).Count } catch {}
try { $o.storageSense = (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy').'01' -eq 1 } catch {}
ConvertTo-Json -InputObject $o -Depth 5 -Compress
`

const psUSB = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$d = @(Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPDeviceID -like 'USB\VID*' -or $_.PNPDeviceID -like 'USBSTOR\*' } | ForEach-Object { [ordered]@{ id = [string]$_.PNPDeviceID; name = [string]$_.Name } })
ConvertTo-Json -InputObject $d -Compress
`

const psRecycleSize = `$ErrorActionPreference = 'SilentlyContinue'
$s = 0; $n = 0
try { $sh = New-Object -ComObject Shell.Application; foreach ($i in $sh.NameSpace(10).Items()) { $s += [int64]$i.Size; $n++ } } catch {}
Write-Output ("" + $s + " " + $n)
`
