package: bits-python
description: The Python bits runs on, with the modules bits imports, as one relocatable prefix
version: "3.13.16"
sources:
  - https://www.python.org/ftp/python/%(version)s/Python-%(version)s.tgz,sha256:cfac63bddf956deafb1172ca131ae5dcaafd6f95056086e233fca205593ed427
build_requires:
  - OpenSSL
  - zlib
  - bzip2
  - xz
  - sqlite
  - libffi
license: Python-2.0
sandbox_network: off   # pip install of bits' modules
---
#!/bin/bash -e
# Static, without libpython.so, and its extension modules linked against the
# static libraries of the build_requires: the interpreter finds its standard
# library from its own location and loads no library but the C library, so the
# prefix works wherever it is copied, with nothing on LD_LIBRARY_PATH or
# PYTHONPATH and no rpath that LD_LIBRARY_PATH could override. bits runs it by
# path (see bits.sh). The modules that would need other host libraries (curses,
# readline, dbm, Tk, libuuid) are not built; bits uses none of them, and uuid
# works without its C part. pkg-config sees only the build_requires, and
# _decimal uses the libmpdec bundled with Python.
deps=("${OPENSSL_ROOT:?}" "${ZLIB_ROOT:?}" "${BZIP2_ROOT:?}" "${XZ_ROOT:?}" "${SQLITE_ROOT:?}" "${LIBFFI_ROOT:?}")
export PKG_CONFIG_LIBDIR=$(printf '%s/lib/pkgconfig:' "${deps[@]}")
export CPPFLAGS=$(printf -- '-I%s/include ' "${deps[@]}")
export LDFLAGS=$(printf -- '-L%s/lib ' "${deps[@]}")
"$SOURCEDIR/configure" --prefix="$INSTALLROOT" --disable-shared --disable-test-modules \
  --with-openssl="$OPENSSL_ROOT" --with-openssl-rpath=no --without-readline \
  --without-system-libmpdec --without-system-expat --with-ensurepip=install \
  LIBSQLITE3_LIBS="-lsqlite3 -lm" \
  py_cv_module__curses=n/a py_cv_module__curses_panel=n/a py_cv_module__dbm=n/a \
  py_cv_module__gdbm=n/a py_cv_module__tkinter=n/a py_cv_module__uuid=n/a
make ${JOBS:+-j$JOBS}
make install
py="$INSTALLROOT/bin/python3"

# bits' modules (pyproject.toml) with everything they pull in, pinned, binary
# wheels only; pip check proves the set complete and consistent.
"$py" -m pip install --no-cache-dir --only-binary=:all: --no-deps \
  PyYAML==6.0.3 requests==2.34.2 distro==1.9.0 Jinja2==3.1.6 boto3==1.43.109 \
  cryptography==50.0.2 qrcode==8.2 \
  botocore==1.43.109 s3transfer==0.19.2 jmespath==1.1.0 python-dateutil==2.9.0.post0 six==1.17.0 \
  urllib3==2.8.0 idna==3.20 certifi==2026.7.22 charset_normalizer==3.5.2 MarkupSafe==3.0.4 \
  cffi==2.1.1 pycparser==3.0
"$py" -m pip check

# CA certificates. This OpenSSL is not the host's and does not know where the
# host keeps them (openssl.sh), so _bits_ca.py says: the host's bundle. The ssl
# module adds it, else certifi's, to its default verify paths (used by
# create_default_context() and urllib) unless SSL_CERT_FILE or SSL_CERT_DIR is
# set; certifi.where() (used by requests and botocore) returns it first, as
# distributions patch certifi. So bits trusts what the host trusts, a site CA
# included. Appended to ssl.py and certifi, it costs nothing until they are
# imported, and it sets no environment variable.
stdlib=$("$py" -c 'import sysconfig; print(sysconfig.get_path("stdlib"))')
certifi_core=$("$py" -c 'import certifi.core; print(certifi.core.__file__)')
cat > "$stdlib/_bits_ca.py" <<'EOS'
"""bits-python: where this host keeps its CA certificates (see ssl.py, certifi)."""
import os


def host_bundle():
    """The host's CA bundle, or None."""
    for f in ("/etc/pki/tls/certs/ca-bundle.crt",    # EL, Fedora
              "/etc/ssl/certs/ca-certificates.crt",  # Debian, Ubuntu, Arch
              "/etc/ssl/ca-bundle.pem"):             # openSUSE
        if os.access(f, os.R_OK) and os.path.getsize(f) > 0:
            return f
    return None
EOS
cat >> "$stdlib/ssl.py" <<'EOS'


# bits-python: the host's CA bundle, else certifi's (_bits_ca.py).
_bits_set_default_verify_paths = SSLContext.set_default_verify_paths

def _bits_verify_paths(self):
    _bits_set_default_verify_paths(self)
    import os
    if os.environ.get("SSL_CERT_FILE") or os.environ.get("SSL_CERT_DIR"):
        return
    import _bits_ca
    cafile = _bits_ca.host_bundle()
    if cafile is None:
        try:
            import certifi
        except ImportError:
            return
        cafile = certifi.where()
    try:
        self.load_verify_locations(cafile=cafile)
    except (OSError, SSLError):
        pass   # a bundle that cannot be read: no CA, so verification fails

SSLContext.set_default_verify_paths = _bits_verify_paths
EOS
cat >> "$certifi_core" <<'EOS'


# bits-python: the host's CA bundle first (_bits_ca.py).
_bits_certifi_where = where

def where() -> str:
    import _bits_ca
    return _bits_ca.host_bundle() or _bits_certifi_where()
EOS
"$py" -m compileall -q -f -o 0 -o 1 -o 2 "$stdlib/_bits_ca.py" "$stdlib/ssl.py" "$certifi_core"

# No standard module bits needs was skipped (the C ones by name, as their
# modules fall back to pure Python without them); ssl is this OpenSSL, finds
# CA certificates, and certifi the host's bundle where there is one.
"$py" -c 'import _ssl, _hashlib, _sqlite3, zlib, _bz2, _lzma, _ctypes, _decimal, pyexpat, uuid, yaml, boto3, cryptography'
"$py" -c 'import ssl, sys, certifi, _bits_ca
assert ssl.OPENSSL_VERSION.startswith("OpenSSL %s " % sys.argv[1]), ssl.OPENSSL_VERSION
assert ssl.create_default_context().cert_store_stats()["x509_ca"] > 0
h = _bits_ca.host_bundle()
assert h is None or certifi.where() == h, certifi.where()' "${OPENSSL_VERSION:?}"

# What bits never uses goes, as bits.sh copies the whole prefix: pip too, so
# nothing can be installed into it later.
"$py" -m pip uninstall -q -y pip
rm -rf "$INSTALLROOT"/bin/idle3* "$INSTALLROOT"/lib/libpython*.a "$INSTALLROOT"/lib/python3*/config-*/libpython*.a \
       "$INSTALLROOT"/lib/python3*/{test,idlelib,tkinter,turtledemo,ensurepip}
strip "$INSTALLROOT"/bin/python3.*[0-9]
strip --strip-unneeded "$INSTALLROOT"/lib/python3*/lib-dynload/*.so
