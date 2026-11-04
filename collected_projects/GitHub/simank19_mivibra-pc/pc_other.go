//go:build !windows

package main

// Implementación de desarrollo (Linux/macOS): datos simulados para probar la interfaz.

import (
	"fmt"
	"math/rand"
	"time"
)

func hardwareInfo() ([]byte, error) {
	time.Sleep(600 * time.Millisecond)
	return []byte(`{"admin":false,"os":{"caption":"Microsoft Windows 11 Home","version":"10.0.26100","build":"26100","ubr":2033,"display":"24H2","arch":"64 bits","installed":"2025-03-02T10:11:00","boot":"2026-10-10T08:00:00","user":"Brandon","computer":"PORTATIL-MV"},
"cs":{"maker":"LENOVO","model":"82XM","family":"IdeaPad Slim 3 15IRH8","ram":16910000000,"pctype":2},"product":{"name":"82XM","version":"IdeaPad Slim 3 15IRH8","serial":"PF4XXXXX"},
"bios":{"maker":"LENOVO","version":"M5CN32WW","date":"2024-05-10T00:00:00","serial":"PF4XXXXX"},"board":{"maker":"LENOVO","product":"LNVNB161216"},"chassis":[10],
"cpu":[{"name":"13th Gen Intel(R) Core(TM) i5-13420H","cores":8,"threads":12,"mhz":2100,"l2":7168,"l3":12288,"socket":"U3E1","virt":true}],
"ram":[{"cap":8589934592,"speed":5200,"conf":5200,"maker":"Samsung","part":"M425R1GB4BB0-CQKOL","slot":"DIMM 0","type":34,"form":12},{"cap":8589934592,"speed":5200,"conf":5200,"maker":"Samsung","part":"M425R1GB4BB0-CQKOL","slot":"DIMM 1","type":34,"form":12}],"ramSlots":2,"ramMaxKB":67108864,
"gpu":[{"name":"Intel(R) UHD Graphics","vram":134217728,"driver":"31.0.101.4502","driverDate":"2023-06-12T00:00:00","w":1920,"h":1080,"hz":60,"status":"OK","code":0}],
"monitors":[{"name":"","maker":"BOE","inches":15.6,"year":2023,"internal":true}],"predictFail":0,
"disks":[{"name":"SAMSUNG MZAL8512HDLU-00BL2","media":"SSD","bus":"NVMe","size":512110190592,"health":"Healthy","op":"OK","serial":"S6","fw":"FXV7","temp":null,"wear":null,"hours":null,"rerr":null,"werr":null}],
"volumes":[{"id":"C:","label":"","fs":"NTFS","size":510770802688,"free":84321378304}],
"battery":{"present":true,"charge":81,"status":2,"name":"L22B3PG1","runtime":null,"design":47000,"full":41120,"cycles":186,"maker":"SMP","id":"L22B3PG1","chem":"LiP","src":"report"},
"net":[{"name":"Wi-Fi","desc":"Intel(R) Wi-Fi 6 AX201 160MHz","status":"Up","speed":"866.7 Mbps","mac":"AA-BB-CC-DD-EE-FF","media":"Native 802.11"}],"wifiSignal":88,"wifiSsid":"MiVibra","wifiRadio":"802.11ax",
"audio":[{"name":"Realtek(R) Audio","status":"OK"},{"name":"Intel(R) Display Audio","status":"OK"}],"cams":[{"name":"Integrated Camera","status":"OK"}],"bt":[{"name":"Intel(R) Wireless Bluetooth(R)","status":"OK"}],
"keyboards":["Teclado PS/2 estándar"],"pointing":["Synaptics SMBus TouchPad","Mouse compatible con HID"],"thermal":[],"secureBoot":true,"tpm":{"ver":"2.0","on":true},"firmware":"UEFI"}`), nil
}

func softwareInfo() ([]byte, error) {
	time.Sleep(900 * time.Millisecond)
	return []byte(`{"admin":false,"os":{"caption":"Microsoft Windows 11 Home","build":"26100","display":"24H2","boot":"2026-10-03T08:00:00","installed":"2025-03-02T10:11:00"},
"activation":{"status":1,"name":"Windows(R), Core edition","channel":"OEM:DM"},"defender":{"av":true,"rt":true,"sig":"2026-10-11T09:12:00","quickAge":3},
"av":[{"name":"Windows Defender","on":true,"current":true}],"firewall":[{"name":"Domain","on":true},{"name":"Private","on":true},{"name":"Public","on":true}],
"lastUpdate":"2026-09-18T11:20:00","lastUpdateTitle":"Actualización acumulativa 2026-09","reboot":false,
"badDevices":[{"name":"Dispositivo desconocido","cls":"","code":28}],"sysErrors":14,"topErrors":[{"src":"Microsoft-Windows-DistributedCOM","n":9},{"src":"Service Control Manager","n":5}],
"bsod":1,"unexpected":2,"whea":0,"diskErrors":0,"appCrashes":6,"topCrashes":[{"app":"chrome.exe","n":4},{"app":"Teams.exe","n":2}],
"startup":[{"name":"OneDrive","loc":"HKU"},{"name":"Spotify","loc":"HKU"},{"name":"Discord","loc":"HKU"},{"name":"SecurityHealth","loc":"HKLM"},{"name":"Steam","loc":"HKU"},{"name":"Teams","loc":"HKU"},{"name":"WhatsApp","loc":"Startup"},{"name":"Zoom","loc":"HKU"},{"name":"Epic Games","loc":"HKU"},{"name":"Adobe","loc":"HKLM"},{"name":"Razer","loc":"HKLM"}],
"programs":87,"powerPlan":"Equilibrado","secureBoot":true,"cFree":84321378304,"cSize":510770802688,"restorePoints":0,"storageSense":false}`), nil
}

var usbTick int

func usbDevices() ([]byte, error) {
	usbTick++
	base := `{"id":"USB\\VID_8087&PID_0026\\5&1","name":"Intel(R) Wireless Bluetooth(R)"},{"id":"USB\\VID_04F2&PID_B7E0\\0001","name":"Integrated Camera"}`
	if usbTick%3 == 0 {
		base += fmt.Sprintf(`,{"id":"USBSTOR\\DISK&VEN_KINGSTON\\%d","name":"Kingston DataTraveler 3.0 USB Device"}`, rand.Intn(1000))
	}
	return []byte("[" + base + "]"), nil
}

func liveStats() map[string]any {
	return map[string]any{"cpu": 12 + rand.Float64()*30, "ramTotal": 16910000000, "ramAvail": 7400000000 + rand.Int63n(500000000),
		"ac": false, "batPct": 81, "batFlag": 1, "batSecs": 14400, "diskFree": 84321378304, "diskTotal": 510770802688, "uptimeMs": 186000000}
}

func runAction(name string) map[string]any {
	return map[string]any{"ok": true, "msg": "(simulado) " + name}
}

func recycleBin() (int64, int) { return 734003200, 41 }
func emptyRecycleBin() error   { return nil }
