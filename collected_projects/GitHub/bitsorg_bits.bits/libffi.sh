package: libffi
description: libffi, static, linked into bits' Python (ctypes)
version: "3.6.0"
sources:
  - https://github.com/libffi/libffi/releases/download/v%(version)s/libffi-%(version)s.tar.gz,sha256:31ff1fe32deaebfbb388727f32677bb254bf2a41382c51464c0b1837c9ee9828
license: MIT
---
#!/bin/bash -e
# Static and position independent, like zlib.sh; lib/, not lib64/.
"$SOURCEDIR/configure" --prefix="$INSTALLROOT" --disable-shared --with-pic \
  --disable-docs --disable-multi-os-directory
make ${JOBS:+-j$JOBS}
make install
