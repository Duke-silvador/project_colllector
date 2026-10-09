package: zlib
description: zlib, static, linked into bits' Python and Tcl
version: "1.3.2"
sources:
  - https://github.com/madler/zlib/releases/download/v%(version)s/zlib-%(version)s.tar.gz,sha256:bb329a0a2cd0274d05519d61c667c062e06990d72e125ee2dfa8de64f0119d16
license: Zlib
---
#!/bin/bash -e
# The C libraries of bits' runtime are static and position independent: they are
# linked into the Python and Tcl that use them, so the runtime loads no library
# but the C library and needs no LD_LIBRARY_PATH or rpath. Built in a copy of
# the source tree.
rsync -a "$SOURCEDIR/" ./
CFLAGS="-O2 -fPIC" ./configure --prefix="$INSTALLROOT" --static
make ${JOBS:+-j$JOBS} libz.a
make install
