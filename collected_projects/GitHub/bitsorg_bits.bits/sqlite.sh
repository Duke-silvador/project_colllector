package: sqlite
description: SQLite, static, linked into bits' Python
version: "3.53.4"
sources:
  - https://sqlite.org/2026/sqlite-autoconf-3530400.tar.gz,sha256:0e9483900e92cd5de8fd48d16bf9200145a61f7fd5be542a5ac81d8a9516eb9c
license: blessing
---
#!/bin/bash -e
# Static and position independent, like zlib.sh. The URL names the version in
# SQLite's own form (3.53.4 is 3530400) and the year of the release, so update
# both with the version. Built in a copy of the source tree.
rsync -a "$SOURCEDIR/" ./
CFLAGS="-O2 -fPIC" ./configure --prefix="$INSTALLROOT" --disable-shared --disable-readline
make ${JOBS:+-j$JOBS}
make install
