package: OpenSSL
description: OpenSSL (LTS), static, linked into bits' Python (ssl, hashlib)
version: "3.5.9"
sources:
  - https://github.com/openssl/openssl/releases/download/openssl-%(version)s/openssl-%(version)s.tar.gz,sha256:603f5602e2eef00d77fbd429d34dcd5822bb301757a1bc9cdb24c670f1eb859a
license: Apache-2.0
---
#!/bin/bash -e
# Static and position independent, like zlib.sh: the libraries and headers only.
# OPENSSLDIR is where OpenSSL looks for openssl.cnf and CA certificates. It is
# a directory that does not exist, so that this OpenSSL never reads the host's
# configuration, written for the host's own OpenSSL; bits' Python adds the
# host's CA certificates itself (bits-python.sh). SSL_CERT_FILE, SSL_CERT_DIR
# and OPENSSL_CONF still work.
"$SOURCEDIR/Configure" --prefix="$INSTALLROOT" --libdir=lib \
  --openssldir=/nonexistent/bits-openssl \
  no-shared no-apps no-docs no-tests -fPIC
make ${JOBS:+-j$JOBS} build_libs
make install_dev
