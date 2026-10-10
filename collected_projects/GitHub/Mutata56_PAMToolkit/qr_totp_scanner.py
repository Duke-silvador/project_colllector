


from __future__ import annotations
import argparse
import base64
import os
import sys
import urllib.parse
from pathlib import Path

TOTP_FILE = Path("~/.dbjump_totp").expanduser()

def decode_qr(image) -> list[str]:
    pass
    results: list[str] = []

    try:
        from pyzbar.pyzbar import decode as zbar_decode
        for obj in zbar_decode(image):
            results.append(obj.data.decode("utf-8", "replace"))
        if results:
            return results
    except ImportError:
        pass

    import cv2
    detector = cv2.QRCodeDetector()
    ok, decoded, _, _ = detector.detectAndDecodeMulti(image)
    if ok:
        results.extend([d for d in decoded if d])
    return results

def _b32(secret_bytes: bytes) -> str:
    return base64.b32encode(secret_bytes).decode("ascii").rstrip("=")


def parse_otpauth(uri: str) -> list[dict]:
    pass
    u = urllib.parse.urlparse(uri)
    q = urllib.parse.parse_qs(u.query)
    secret = (q.get("secret") or [""])[0]
    if not secret:
        return []
    label = urllib.parse.unquote(u.path.lstrip("/"))
    issuer = (q.get("issuer") or [""])[0]
    return [{"name": label, "issuer": issuer, "secret": secret.replace(" ", "").upper()}]


def _read_varint(buf: bytes, i: int) -> tuple[int, int]:
    result = shift = 0
    while True:
        b = buf[i]; i += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            return result, i
        shift += 7


def _parse_fields(buf: bytes) -> list[tuple[int, int, object]]:
    pass
    i = 0
    out: list[tuple[int, int, object]] = []
    while i < len(buf):
        key, i = _read_varint(buf, i)
        field_no, wire = key >> 3, key & 7
        if wire == 0:
            val, i = _read_varint(buf, i)
        elif wire == 2:
            ln, i = _read_varint(buf, i)
            val = buf[i:i + ln]; i += ln
        elif wire == 5:
            val = buf[i:i + 4]; i += 4
        elif wire == 1:
            val = buf[i:i + 8]; i += 8
        else:
            raise ValueError(f"неподдерживаемый wire type {wire}")
        out.append((field_no, wire, val))
    return out


def parse_migration(uri: str) -> list[dict]:
    pass
    u = urllib.parse.urlparse(uri)
    data_q = urllib.parse.parse_qs(u.query).get("data")
    if not data_q:
        return []
    raw = base64.b64decode(urllib.parse.unquote(data_q[0]))
    accounts: list[dict] = []

    for field_no, wire, val in _parse_fields(raw):
        if field_no == 1 and wire == 2:
            secret_bytes = b""
            name = issuer = ""
            for f_no, f_wire, f_val in _parse_fields(val):
                if f_no == 1 and f_wire == 2:
                    secret_bytes = f_val
                elif f_no == 2 and f_wire == 2:
                    name = f_val.decode("utf-8", "replace")
                elif f_no == 3 and f_wire == 2:
                    issuer = f_val.decode("utf-8", "replace")
            if secret_bytes:
                accounts.append({"name": name, "issuer": issuer, "secret": _b32(secret_bytes)})
    return accounts


def extract_accounts(qr_text: str) -> list[dict]:
    if qr_text.startswith("otpauth-migration://"):
        return parse_migration(qr_text)
    if qr_text.startswith("otpauth://"):
        return parse_otpauth(qr_text)
    return []

def show_accounts(accounts: list[dict]) -> None:
    for n, a in enumerate(accounts, 1):
        title = " / ".join(x for x in (a["issuer"], a["name"]) if x) or "(без имени)"
        print(f"  [{n}] {title}")
        print(f"      secret: {a['secret']}")


def save_secret(secret: str) -> None:
    TOTP_FILE.write_text(secret + "\n", encoding="utf-8")
    os.chmod(TOTP_FILE, 0o600)
    print(f"Секрет сохранён в {TOTP_FILE} (права 600).")


def handle(accounts: list[dict], auto_save: bool) -> bool:
    if not accounts:
        return False
    print(f"\nНайдено аккаунтов: {len(accounts)}")
    show_accounts(accounts)
    if len(accounts) == 1:
        chosen = accounts[0]["secret"]
    else:
        ans = input("Какой сохранить? Номер (Enter — пропустить): ").strip()
        if not ans.isdigit() or not (1 <= int(ans) <= len(accounts)):
            print("Пропущено.")
            return True
        chosen = accounts[int(ans) - 1]["secret"]
    if auto_save or input(f"Сохранить в {TOTP_FILE}? [y/N]: ").strip().lower() == "y":
        save_secret(chosen)
    else:
        print("Не сохранял. Секрет выше — можешь вписать сам.")
    return True

def from_image(path: str, auto_save: bool) -> int:
    import cv2
    img = cv2.imread(path)
    if img is None:
        print(f"Не удалось открыть файл: {path}")
        return 1
    for text in decode_qr(img):
        if handle(extract_accounts(text), auto_save):
            return 0
    print("QR с TOTP-секретом в файле не найден.")
    return 1


def from_camera(show_window: bool, auto_save: bool) -> int:
    import cv2
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Камера не открылась. Дай терминалу доступ к камере в Настройках -> "
              "Конфиденциальность -> Камера, или используй --image со скриншотом QR.")
        return 1
    print("Наведи камеру на QR. Выход — q (в окне) или Ctrl+C.")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                continue
            for text in decode_qr(frame):
                accounts = extract_accounts(text)
                if accounts:
                    handle(accounts, auto_save)
                    return 0
            if show_window:
                cv2.imshow("QR TOTP scanner (q - выход)", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    print("Выход без результата.")
                    return 1
    except KeyboardInterrupt:
        print("\nПрервано.")
        return 1
    finally:
        cap.release()
        if show_window:
            cv2.destroyAllWindows()


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Сканер TOTP-секрета с камеры/картинки")
    ap.add_argument("--image", help="разобрать QR из файла вместо камеры")
    ap.add_argument("--no-window", action="store_true", help="камера без окна предпросмотра")
    ap.add_argument("--save", action="store_true", help="сохранить секрет без лишнего вопроса")
    args = ap.parse_args(argv)

    if args.image:
        return from_image(args.image, args.save)
    return from_camera(show_window=not args.no_window, auto_save=args.save)


if __name__ == "__main__":
    sys.exit(main())
