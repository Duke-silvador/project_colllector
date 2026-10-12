#!/usr/bin/env python3
"""Kendi koşumunuzu (lab/OLCUMLER.json) ekibin koşumuyla (beklenen/OLCUMLER.json) karşılaştırır.
  python kontrol.py            → her ölçüm için ✓ / ✗, sonda özet
Kural: sayılar, metinler ve listeler birebir aynı olmalı; benzetim zamanlamasına bağlı ölçümler (derleme süresi,
kesme aralığı, adres alma süresi, uyanık süre…) bilgisayarın hızına göre değişir, yalnız var olup olmadıkları denetlenir."""
import json, pathlib, sys
B = pathlib.Path(__file__).resolve().parent
ZAMANA_BAGLI = ("h2_uart_cerceve", "h3_kilitsiz_", "h1_derleme_s", "h1_acilis_ms", "h1_mcp_derleme", "h2_aralik_", "h2_10ms_", "h3_ip_ms", "h3_gorevler",
                "h3_en_az_bos_yigin", "h4_evre", "h4_uyanik_s", "h4_ortalama_ma", "h4_dongu_", "h4_kat", "h4_periyot_gun",
                "h4_test_linux_s", "h4_test_qemu_s", "h1_bos_yigin", "h1_ikili", "h1_imaj", "h1_iram", "h1_dram",
                "h3_kart_", "h3_benzetim_", "h3_mqtt_paket_bayt", "h4_durum_paketi", "h4_robot_durum")


OPSIYONEL = ("h1_mcp_",)   # MCP özelliği kurulu değilse (install.sh --enable-mcp) bu ölçümler olmaz


def esit(a, b):
    if isinstance(a, float) or isinstance(b, float):
        return abs(a - b) <= 0.01 * max(1.0, abs(b))
    return a == b


def main():
    siz = json.loads((B / "lab" / "OLCUMLER.json").read_text())
    ref = json.loads((B / "beklenen" / "OLCUMLER.json").read_text())
    hata = eksik = 0
    for k, v in sorted(ref.items()):
        if k not in siz:
            if k.startswith(OPSIYONEL):
                print(f"– {k:28s} yok (isteğe bağlı: MCP özelliği)"); continue
            print(f"– {k:28s} yok (ilgili hafta betiğini koşun)"); eksik += 1; continue
        if k.startswith(ZAMANA_BAGLI):
            print(f"~ {k:28s} var (zamana bağlı, karşılaştırılmaz)"); continue
        iyi = esit(siz[k], v)
        hata += not iyi
        print(f"{'✓' if iyi else '✗'} {k:28s} siz={json.dumps(siz[k], ensure_ascii=False)[:40]:42s} beklenen={json.dumps(v, ensure_ascii=False)[:40]}")
    print("SONUÇ:", "geçti" if hata == eksik == 0 else f"{hata} farklı, {eksik} eksik")
    return 1 if hata or eksik else 0


if __name__ == "__main__":
    sys.exit(main())
