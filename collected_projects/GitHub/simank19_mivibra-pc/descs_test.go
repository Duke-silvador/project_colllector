package main

import "testing"

func TestLocalDesc(t *testing.T) {
	cases := map[string]string{
		"3uTools_v3.18.exe":                        "iPhone",
		"SAMSUNG_USB_Driver_for_Mobile_Phones.exe": "Samsung",
		"VC_redist.x64.exe":                        "Librería",
		"Realtek_Audio_Driver.exe":                 "sonido",
		"MediaCreationTool_22H2.exe":               "Windows",
		"AnyDesk.exe":                              "distancia",
		"npp.8.6.Installer.x64.exe":                "",
	}
	for f, want := range cases {
		got := localDesc("", f, "", "Varios")
		if want == "" && got != "" {
			t.Errorf("%s: no debía reconocerse, dio %q", f, got)
		}
		if want != "" && !contains(got, want) {
			t.Errorf("%s: %q no contiene %q", f, got, want)
		}
	}
	if localDesc("Desconocido", "x.exe", "", "Drivers") == "" {
		t.Error("categoría Drivers sin descripción")
	}
}

func contains(a, b string) bool {
	return len(b) == 0 || (len(a) >= len(b) && (func() bool {
		for i := 0; i+len(b) <= len(a); i++ {
			if a[i:i+len(b)] == b {
				return true
			}
		}
		return false
	})())
}
