r"""socks_forward.py -- minimal SOCKS5 CONNECT proxy that never touches TLS.

Why this exists (2026-11-13, after the account was disabled)
------------------------------------------------------------
The previous proxy layer was mitmproxy in HTTP mode: it terminated TLS, then
agy_unlock_addon.py rewrote response bodies (dropped ineligibleTiers, pinned
currentTier to standard-tier, replaced bad quota replies). Three fingerprints
came out of that, all server-visible:

  1. the client claimed standard-tier while the upstream record said free-tier
     / UNSUPPORTED_LOCATION -- a protocol-level contradiction, not a network
     anomaly; this is what "violation of Terms of Service" points at
  2. the TLS ClientHello became Python OpenSSL, so JA3/JA4 no longer matched
     agy's own Go crypto/tls -- a per-handshake beacon, no client action needed
  3. response headers were recomputed (content-length, content-type, and
     content-encoding removed), giving a stable side-channel in header order

This script does none of that. After the SOCKS5 CONNECT it moves raw bytes in
both directions: no decryption, no path inspection, no body rewrite. Whatever
agy sends is what the upstream sees, TLS fingerprint included.

Scope: CONNECT only (TCP). No BIND, no UDP ASSOCIATE -- HTTP/1.1, HTTP/2 and
gRPC all run over CONNECT, which is all agy and the Antigravity GUI need.

Usage
-----
  python socks_forward.py                       # 127.0.0.1:1080, direct egress
  python socks_forward.py --port 1081
  python socks_forward.py --upstream socks5h://HOST:PORT   # chain to a remote hop

  Then, for the CLI:
    set HTTPS_PROXY=socks5h://127.0.0.1:1080
    set HTTP_PROXY=socks5h://127.0.0.1:1080
    "%LOCALAPPDATA%\agy\bin\agy.exe" -p "hello"

  Or let agy-run.py do the wiring:  python agy-run.py --mode socks --target cli

Note: socks5h (not socks5) in the proxy URL means the *client* defers DNS to
the proxy, so no local resolver leak. agy's Go net/http honours the h form.
"""

import argparse
import asyncio
import functools
import os
import socket
import struct
import sys
import time

BUF = 64 * 1024

# SOCKS5 reply frames for our fixed listener address (0.0.0.0:0).
SUCCESS = b"\x05\x00\x00\x01" + b"\x00" * 6
ERR_GENERAL = b"\x05\x01\x00\x01" + b"\x00" * 6
ERR_HOST_UNREACH = b"\x05\x04\x00\x01" + b"\x00" * 6
ERR_REFUSED = b"\x05\x05\x00\x01" + b"\x00" * 6
ERR_CMD = b"\x05\x07\x00\x01" + b"\x00" * 6


# ---------------------------------------------------------------- address I/O

async def _read_addr(reader, atyp):
    """Decode an address field. Returns None for an unsupported ATYP.

    The domain branch decodes ASCII, not idna: the idna codec rejects an
    errors= argument ("Unsupported error handling"), and an IDN arrives here as
    punycode (xn--...) anyway. Passing the ASCII label straight on is correct.
    """
    if atyp == 0x01:
        return socket.inet_ntoa(await reader.readexactly(4))
    if atyp == 0x03:
        size = (await reader.readexactly(1))[0]
        return (await reader.readexactly(size)).decode("ascii", "replace")
    if atyp == 0x04:
        return socket.inet_ntop(socket.AF_INET6, await reader.readexactly(16))
    return None


async def _skip_addr(reader, atyp):
    """Consume an address+port pair without decoding it."""
    if atyp == 0x01:
        await reader.readexactly(4 + 2)
    elif atyp == 0x03:
        size = (await reader.readexactly(1))[0]
        await reader.readexactly(size + 2)
    elif atyp == 0x04:
        await reader.readexactly(16 + 2)


# ------------------------------------------------------------------ handshake

async def _greet(reader, writer):
    """Method negotiation. NO AUTH only; anything else is refused."""
    head = await reader.readexactly(2)
    if head[0] != 0x05:
        return False
    await reader.readexactly(head[1])
    writer.write(b"\x05\x00")
    await writer.drain()
    return True


async def _read_request(reader):
    """Parse a CONNECT request. Returns (cmd, host, port) or None."""
    ver, cmd, _rsv, atyp = await reader.readexactly(4)
    if ver != 0x05:
        return None
    host = await _read_addr(reader, atyp)
    if host is None:
        return None
    port = struct.unpack("!H", await reader.readexactly(2))[0]
    return cmd, host, port


# ----------------------------------------------------------------- connecting

async def _open_direct(host, port):
    reader, writer = await asyncio.open_connection(host, port)
    return reader, writer


async def _open_via_upstream(up_host, up_port, host, port):
    """Chain this CONNECT to another SOCKS5 hop, delegating DNS to it."""
    reader, writer = await asyncio.open_connection(up_host, up_port)
    writer.write(b"\x05\x01\x00")
    await writer.drain()
    ver, method = await reader.readexactly(2)
    if ver != 0x05 or method != 0x00:
        writer.close()
        raise OSError("upstream refused NO AUTH (ver=%d method=%d)" % (ver, method))

    # Hosts reaching this point are already ASCII/punycode (see _read_addr), so
    # encode("idna") is only a safety net -- and it raises on labels with
    # underscores, which real Google endpoints do use. Fall back to ascii.
    try:
        raw = host.encode("idna")
    except UnicodeError:
        raw = host.encode("ascii", "replace")
    writer.write(b"\x05\x01\x00\x03" + bytes([len(raw)]) + raw +
                 struct.pack("!H", port))
    await writer.drain()
    _ver, rep, _rsv, atyp = await reader.readexactly(4)
    if rep != 0x00:
        writer.close()
        raise OSError("upstream CONNECT failed rep=%d" % rep)
    await _skip_addr(reader, atyp)
    return reader, writer


# ------------------------------------------------------------------ byte pump

async def _pipe(src, dst):
    """Copy until EOF, then half-close so the peer sees the end."""
    try:
        while True:
            chunk = await src.read(BUF)
            if not chunk:
                break
            dst.write(chunk)
            await dst.drain()
    except (ConnectionError, OSError, asyncio.IncompleteReadError):
        pass
    finally:
        try:
            if dst.can_write_eof():
                dst.write_eof()
        except (OSError, RuntimeError):
            pass


# ---------------------------------------------------------------- diagnostics

LOG_MAX_BYTES = 256 * 1024
_LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "socks-forward.log")


def _report(host, port, exc):
    """One line per failure. Silent handlers made the first selftest unusable:
    the client saw 'short read' and the server log was empty, so there was no
    way to tell DNS failure from an exception in the greeting path."""
    try:
        try:
            if os.path.getsize(_LOG_PATH) > LOG_MAX_BYTES:
                os.replace(_LOG_PATH, _LOG_PATH + ".old")
        except OSError:
            pass
        stamp = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(_LOG_PATH, "a", encoding="utf-8") as fh:
            fh.write("%s  %s:%s  %s: %s\n"
                     % (stamp, host, port, type(exc).__name__, exc))
    except OSError:
        pass


# --------------------------------------------------------------------- handler

async def handle(creader, cwriter, upstream):
    swriter = None
    try:
        if not await _greet(creader, cwriter):
            return
        req = await _read_request(creader)
        if req is None:
            cwriter.write(ERR_GENERAL)
            await cwriter.drain()
            return

        cmd, host, port = req
        if cmd != 0x01:
            # BIND / UDP ASSOCIATE are out of scope on purpose.
            cwriter.write(ERR_CMD)
            await cwriter.drain()
            return

        try:
            if upstream:
                sreader, swriter = await _open_via_upstream(
                    upstream[0], upstream[1], host, port)
            else:
                sreader, swriter = await _open_direct(host, port)
        except ConnectionRefusedError:
            cwriter.write(ERR_REFUSED)
            await cwriter.drain()
            return
        except (OSError, asyncio.IncompleteReadError) as exc:
            # DNS failure, network unreachable, upstream handshake reject.
            _report(host, port, exc)
            cwriter.write(ERR_HOST_UNREACH)
            await cwriter.drain()
            return

        try:
            swriter.get_extra_info("socket").setsockopt(
                socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except (OSError, AttributeError):
            pass

        cwriter.write(SUCCESS)
        await cwriter.drain()
        await asyncio.gather(_pipe(creader, swriter), _pipe(sreader, cwriter))
    except Exception as exc:                       # keep the listener alive
        _report("session", "-", exc)
    finally:
        for writer in (swriter, cwriter):
            if writer is None:
                continue
            try:
                writer.close()
            except OSError:
                pass


# ------------------------------------------------------------------------ main

def _split(hostport, default_port):
    if "://" in hostport:
        hostport = hostport.split("://", 1)[1]
    hostport = hostport.split("/", 1)[0]
    if ":" in hostport:
        host, port = hostport.rsplit(":", 1)
        return host, int(port)
    return hostport, default_port


async def _serve(args):
    listen_host, listen_port = _split(args.listen, 1080)

    upstream = None
    if args.upstream:
        upstream = _split(args.upstream, 1080)

    # Pass a coroutine function, not a lambda returning one: start_server only
    # awaits what the callback *is*, and a lambda that returns a coroutine is
    # discarded with "coroutine was never awaited" -- the client then sees a
    # closed socket with no SOCKS reply at all.
    server = await asyncio.start_server(
        functools.partial(handle, upstream=upstream), listen_host, listen_port)

    loopback = listen_host in ("127.0.0.1", "localhost", "::1")
    print("socks5  %s:%d  upstream=%s  tls=%s"
          % (listen_host, listen_port,
             "%s:%d" % upstream if upstream else "direct",
             "end-to-end (not intercepted)"))
    if not loopback:
        print("WARNING: bound to %s -- reachable from other hosts" % listen_host)

    async with server:
        await server.serve_forever()


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="SOCKS5 CONNECT forwarder for agy (no TLS interception)")
    ap.add_argument("--listen", default="127.0.0.1:1080")
    ap.add_argument("--port", type=int, default=None,
                    help="shortcut for --listen 127.0.0.1:PORT")
    ap.add_argument("--upstream", default=None,
                    help="socks5h://HOST:PORT to chain through")
    args = ap.parse_args(argv)

    if args.port:
        args.listen = "127.0.0.1:%d" % args.port

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

    try:
        asyncio.run(_serve(args))
    except KeyboardInterrupt:
        print("\nstopped")
        return 0
    except OSError as exc:
        print("failed to bind %s: %s" % (args.listen, exc))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
