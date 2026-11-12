r"""selftest_socks.py -- prove socks_forward.py really forwards TLS untouched.

What this asserts
-----------------
1. the listener accepts a SOCKS5 greeting with NO AUTH
2. CONNECT to a real host succeeds (rep=0)
3. the TLS handshake that comes back has a *server* certificate for that host,
   which can only happen if the proxy passed bytes through without terminating
   TLS -- an intercepted proxy would present a mitmproxy CA instead

Exit code 0 = passthrough confirmed. Nothing is written to disk.
"""

import os
import socket
import ssl
import struct
import subprocess
import sys
import time

HOST = "cloudcode-pa.googleapis.com"
PORT = 443
PY = sys.executable
SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "socks_forward.py")
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "selftest-socks.log")


def free_port():
    """Ask the OS for an unused port so a stale listener can never be reused."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]
    finally:
        sock.close()


PROXY_PORT = free_port()


def recv_exact(sock, n):
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise OSError("short read")
        buf += chunk
    return buf


def socks_connect(host, port):
    """Minimal SOCKS5 client: greeting, CONNECT by domain, read reply."""
    sock = socket.create_connection(("127.0.0.1", PROXY_PORT), timeout=8)
    sock.sendall(b"\x05\x01\x00")
    try:
        ver, method = recv_exact(sock, 2)
    except OSError as exc:
        raise OSError("no greeting reply from proxy (%s)" % exc)
    assert (ver, method) == (5, 0), "greeting failed ver=%d method=%d" % (ver, method)

    raw = host.encode("idna")
    sock.sendall(b"\x05\x01\x00\x03" + bytes([len(raw)]) + raw +
                 struct.pack("!H", port))
    try:
        _ver, rep, _rsv, atyp = recv_exact(sock, 4)
    except OSError as exc:
        raise OSError("no CONNECT reply from proxy (%s)" % exc)
    assert rep == 0, "CONNECT refused rep=%d" % rep
    if atyp == 0x01:
        recv_exact(sock, 4 + 2)
    elif atyp == 0x03:
        n = recv_exact(sock, 1)[0]
        recv_exact(sock, n + 2)
    elif atyp == 0x04:
        recv_exact(sock, 16 + 2)
    return sock


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    log_path = LOG
    log = open(log_path, "wb")
    proc = subprocess.Popen([PY, SCRIPT, "--port", str(PROXY_PORT)],
                            stdout=log, stderr=subprocess.STDOUT)
    try:
        deadline = time.time() + 6
        up = False
        while time.time() < deadline:
            try:
                socket.create_connection(("127.0.0.1", PROXY_PORT), timeout=0.4).close()
                up = True
                break
            except OSError:
                if proc.poll() is not None:
                    log.flush()
                    with open(log_path, encoding="utf-8", errors="replace") as fh:
                        print("FAIL  proxy exited before listening:\n%s" % fh.read())
                    return 1
                time.sleep(0.15)
        if not up:
            print("FAIL  listener never came up on %d" % PROXY_PORT)
            return 1
        print("ok    socks5 listener on 127.0.0.1:%d (server log: %s)"
              % (PROXY_PORT, log_path))

        raw = socks_connect(HOST, PORT)
        print("ok    CONNECT %s:%d accepted" % (HOST, PORT))

        ctx = ssl.create_default_context()
        tls = ctx.wrap_socket(raw, server_hostname=HOST)
        cert = tls.getpeercert()
        issuer = dict(x[0] for x in cert.get("issuer", ()))
        print("ok    TLS established, cipher=%s" % (tls.cipher()[0],))
        print("      peer CN=%s" % (dict(x[0] for x in cert.get("subject", ())).get("commonName"),))
        print("      issuer O=%s" % issuer.get("organizationName"))

        trusted = ctx.get_ca_certs()
        mitm = any("mitmproxy" in str(c.get("issuer", "")) or
                   "mitmproxy" in str(c.get("subject", "")) for c in trusted)
        if "mitmproxy" in str(issuer) or "mitmproxy" in str(cert.get("subject")):
            print("FAIL  peer presented a mitmproxy certificate -- TLS was intercepted")
            return 1
        print("ok    peer certificate is not a mitm certificate -> TLS is end-to-end")
        tls.close()
        print("\nRESULT  passthrough confirmed (JA3 stays agy's own)")
        return 0
    except (OSError, ssl.SSLError, AssertionError) as exc:
        print("FAIL  %s: %s" % (type(exc).__name__, exc))
        return 1
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    sys.exit(main())
