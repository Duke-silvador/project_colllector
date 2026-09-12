#!/usr/bin/env python3
"""Lokaler Bridge-Server fuer den Etiketten-Editor (Brother PT-P700).

Liefert die statischen Dateien dieses Ordners aus und reicht Druckdaten an
/dev/usb/lp* durch - fuer Browser ohne WebUSB (Firefox) oder wenn man den
Drucker lieber ueber den usblp-Kerneltreiber anspricht. Nur Standardbibliothek.

    python3 server.py              # http://localhost:7700
    python3 server.py --port 8080
    python3 server.py --device /dev/usb/lp1

Schnittstelle (JSON):
    GET  /api/ping                     -> {"ptouch": true, "version": 1}
    GET  /api/devices                  -> {"devices": [{path, name, vendor, product, plite}]}
    GET  /api/status?device=/dev/usb/lp0
                                       -> {"raw": [32 Bytes]} oder {"error": "..."}
    POST /api/print?device=...&pages=N (Body: fertiger Rasterdatenstrom)
                                       -> {"ok": true, "statuses": [[32 Bytes], ...]}

Voraussetzung: Schreibrecht auf das Geraet (udev-Regel in linux/, oder
Mitglied der Gruppe "lp"). Der PT-P700 muss aus dem "P-touch Editor Lite"-
Modus geholt werden (Taste gedrueckt halten, bis die gruene LED erlischt).
"""

import argparse
import glob
import json
import os
import select
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

VERSION = 1
BROTHER = '04f9'
# Produkt-IDs, unter denen sich P-touch-Geraete als "Editor Lite"-USB-Stick melden
PLITE = {'2064': 'PT-P700', '2065': 'PT-P750W', '2030': 'PT-1230PC', '2031': 'PT-2430PC'}
STATUSANFRAGE = b'\x1b\x69\x53'
INVALIDATE_INIT = b'\x00' * 100 + b'\x1b\x40'

HIER = os.path.dirname(os.path.abspath(__file__))


def sysfs(pfad, name):
    try:
        with open(os.path.join(pfad, name), encoding='utf-8', errors='replace') as f:
            return f.read().strip()
    except OSError:
        return ''


def geraete():
    """Alle /dev/usb/lp* mit Hersteller/Produkt aus sysfs."""
    liste = []
    for knoten in sorted(glob.glob('/dev/usb/lp*')):
        name = os.path.basename(knoten)
        info = {'path': knoten, 'name': name, 'vendor': '', 'product': '', 'plite': False}
        try:
            ziel = os.path.realpath(f'/sys/class/usbmisc/{name}/device')   # .../1-2:1.0
            usb = os.path.dirname(ziel)                                     # .../1-2
            info['vendor'] = sysfs(usb, 'idVendor')
            info['product'] = sysfs(usb, 'idProduct')
            hersteller = sysfs(usb, 'manufacturer')
            produkt = sysfs(usb, 'product')
            if produkt:
                info['name'] = (hersteller + ' ' if hersteller and hersteller.lower() not in produkt.lower() else '') + produkt
        except OSError:
            pass
        info['plite'] = info['vendor'] == BROTHER and info['product'] in PLITE
        info['schreibbar'] = os.access(knoten, os.W_OK)
        liste.append(info)
    # Ausserdem: Geraete, die im Editor-Lite-Modus haengen (kein lp-Knoten)
    for usb in glob.glob('/sys/bus/usb/devices/*'):
        if sysfs(usb, 'idVendor') == BROTHER and sysfs(usb, 'idProduct') in PLITE:
            liste.append({'path': '', 'name': PLITE[sysfs(usb, 'idProduct')] + ' (Editor Lite)',
                          'vendor': BROTHER, 'product': sysfs(usb, 'idProduct'), 'plite': True, 'schreibbar': False})
    return liste


class Drucker:
    """Ein /dev/usb/lpN, bidirektional. read() liefert 32-Byte-Statusbloecke."""

    def __init__(self, pfad):
        if not pfad.startswith('/dev/usb/lp') and not pfad.startswith('/dev/lp'):
            raise ValueError('device')
        self.fd = os.open(pfad, os.O_RDWR | os.O_NONBLOCK)

    def close(self):
        os.close(self.fd)

    def schreiben(self, daten, timeout=60.0):
        ansicht = memoryview(daten)
        ende = time.monotonic() + timeout
        while ansicht:
            _, bereit, _ = select.select([], [self.fd], [], max(0.0, ende - time.monotonic()))
            if not bereit:
                raise TimeoutError('write')
            try:
                n = os.write(self.fd, ansicht[:16384])
            except BlockingIOError:
                continue
            ansicht = ansicht[n:]

    def lesen(self, timeout):
        """Ein Statusblock oder None."""
        ende = time.monotonic() + timeout
        puffer = b''
        while len(puffer) < 32:
            rest = ende - time.monotonic()
            if rest <= 0:
                return None if not puffer else puffer
            bereit, _, _ = select.select([self.fd], [], [], rest)
            if not bereit:
                return None if not puffer else puffer
            try:
                teil = os.read(self.fd, 64)
            except BlockingIOError:
                continue
            if not teil:
                time.sleep(0.05)
                continue
            puffer += teil
        return puffer[:32]

    def status(self):
        # Erst alte Antworten wegwerfen, dann anfragen
        while self.lesen(0.05):
            pass
        self.schreiben(STATUSANFRAGE)
        for _ in range(4):
            b = self.lesen(2.0)
            if b is None:
                return None
            if len(b) == 32 and b[0] == 0x80 and b[1] == 0x20 and b[18] == 0x00:
                return b
        return None


class Handler(SimpleHTTPRequestHandler):
    server_version = 'ptouch-bridge/' + str(VERSION)

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HIER, **kw)

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))

    # CORS: die auf einem Webserver gehostete Fassung der App darf den lokalen
    # Server ansprechen; Chrome verlangt fuer localhost zusaetzlich die
    # Private-Network-Freigabe.
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Cache-Control', 'no-store')

    def json(self, obj, code=200):
        daten = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(daten)))
        self.end_headers()
        self.wfile.write(daten)

    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def geraet(self, q):
        pfad = q.get('device', [self.server.vorgabe or ''])[0]
        if not pfad:
            alle = [g for g in geraete() if g['path'] and not g['plite']]
            if not alle:
                raise FileNotFoundError('kein Drucker unter /dev/usb/lp*')
            pfad = alle[0]['path']
        return Drucker(pfad)

    # Die App verweist mit absoluten Pfaden auf /ptouch/... (so liegt sie auch auf
    # dem Webserver). Lokal wird dieser Praefix einfach abgestreift.
    PRAEFIX = '/ptouch'

    def normalisieren(self):
        if self.path == self.PRAEFIX:
            self.path = '/'
        elif self.path.startswith(self.PRAEFIX + '/'):
            self.path = self.path[len(self.PRAEFIX):]

    def do_GET(self):
        self.normalisieren()
        u = urlparse(self.path)
        if u.path == '/api/ping':
            return self.json({'ptouch': True, 'version': VERSION})
        if u.path == '/api/devices':
            return self.json({'devices': geraete()})
        if u.path == '/api/status':
            try:
                d = self.geraet(parse_qs(u.query))
            except Exception as e:  # noqa: BLE001
                return self.json({'error': str(e)})
            try:
                b = d.status()
            except Exception as e:  # noqa: BLE001
                return self.json({'error': str(e)})
            finally:
                d.close()
            if b is None:
                return self.json({'error': 'keine Antwort'})
            return self.json({'raw': list(b)})
        if u.path.startswith('/api/'):
            return self.json({'error': 'unbekannt'}, 404)
        if u.path == '/':
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        self.normalisieren()
        u = urlparse(self.path)
        if u.path != '/api/print':
            return self.json({'error': 'unbekannt'}, 404)
        q = parse_qs(u.query)
        laenge = int(self.headers.get('Content-Length') or 0)
        if laenge <= 0 or laenge > 64 * 1024 * 1024:
            return self.json({'error': 'leer'})
        daten = self.rfile.read(laenge)
        seiten = int(q.get('pages', ['1'])[0] or 1)
        try:
            d = self.geraet(q)
        except Exception as e:  # noqa: BLE001
            return self.json({'error': str(e)})
        statuses = []
        try:
            d.schreiben(daten, timeout=120.0)
            fertig = 0
            fehler = None
            start = time.monotonic()
            while time.monotonic() - start < 180:
                b = d.lesen(2.5 if fertig >= seiten else 60.0)
                if not b:
                    break
                if len(b) < 32 or b[0] != 0x80:
                    continue
                statuses.append(list(b))
                if b[18] == 0x02 or b[8] or b[9]:
                    fehler = 'printer'
                    break
                if b[18] == 0x01:
                    fertig += 1
                if fertig >= seiten and b[18] == 0x06 and b[19] == 0x00:
                    break
            return self.json({'ok': fehler is None, 'pages': fertig, 'statuses': statuses,
                              **({'error': fehler} if fehler else {})})
        except Exception as e:  # noqa: BLE001
            return self.json({'error': str(e), 'statuses': statuses})
        finally:
            d.close()


def main():
    p = argparse.ArgumentParser(description='Bridge-Server fuer den Etiketten-Editor (Brother PT-P700)')
    p.add_argument('--port', type=int, default=7700)
    p.add_argument('--host', default='127.0.0.1', help='nur lokal (Vorgabe); 0.0.0.0 fuer das ganze Netz')
    p.add_argument('--device', default='', help='Vorgabegeraet, z. B. /dev/usb/lp0')
    a = p.parse_args()
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    srv.vorgabe = a.device
    print(f'Etiketten-Editor: http://{"localhost" if a.host in ("127.0.0.1", "0.0.0.0") else a.host}:{a.port}')
    gefunden = geraete()
    if gefunden:
        for g in gefunden:
            print('  Drucker:', g['name'], g['path'] or '', '(Editor Lite - bitte Taste halten bis LED aus)' if g['plite'] else
                  ('' if g.get('schreibbar') else '(kein Schreibrecht - udev-Regel installieren)'))
    else:
        print('  Kein /dev/usb/lp* gefunden - Drucker eingeschaltet, Editor Lite aus?')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
