package: xz
description: liblzma, static, linked into bits' Python
version: "5.8.4"
sources:
  - https://github.com/tukaani-project/xz/releases/download/v%(version)s/xz-%(version)s.tar.gz,sha256:0014c7886930454fe8bd4228665b51af55eeae560ea135c9c4cd33f55b2591d9
license: 0BSD
---
#!/bin/bash -e
# Static and position independent, like zlib.sh. Only liblzma: no tools,
# scripts, translations or documentation.
"$SOURCEDIR/configure" --prefix="$INSTALLROOT" --disable-shared --with-pic \
  --disable-xz --disable-xzdec --disable-lzmadec --disable-lzmainfo --disable-lzma-links \
  --disable-scripts --disable-doc --disable-nls
make ${JOBS:+-j$JOBS}
make install
