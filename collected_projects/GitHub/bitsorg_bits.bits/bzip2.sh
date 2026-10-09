package: bzip2
description: libbz2, static, linked into bits' Python
version: "1.0.8"
sources:
  - https://sourceware.org/pub/bzip2/bzip2-%(version)s.tar.gz,sha256:ab5a03176ee106d3f0fa90e381da478ddae405918153cca248e682cd0c4a2269
license: bzip2-1.0.6
---
#!/bin/bash -e
# Static and position independent, like zlib.sh. Only the library: its Makefile
# has no configure step and no separate library install.
rsync -a "$SOURCEDIR/" ./
make ${JOBS:+-j$JOBS} libbz2.a CFLAGS="-O2 -fPIC -D_FILE_OFFSET_BITS=64"
mkdir -p "$INSTALLROOT/include" "$INSTALLROOT/lib"
cp bzlib.h "$INSTALLROOT/include/"
cp libbz2.a "$INSTALLROOT/lib/"
