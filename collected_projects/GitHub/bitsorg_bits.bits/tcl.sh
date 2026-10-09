package: Tcl
description: Tcl interpreter (tclsh), the runtime of Environment Modules
version: "8.6.18"
sources:
  - https://downloads.sourceforge.net/project/tcl/Tcl/%(version)s/tcl%(version)s-src.tar.gz,sha256:14f9af32b1767ff718477a8f974ad03c34341097e6b43f4ce54644ee974e268e
build_requires:
  - zlib
license: TCL
---
#!/bin/bash -e
# Only the interpreter and its script library (init.tcl, …): no bundled
# extensions, no manual pages. Static, with zlib.sh's zlib: tclsh loads no
# library but the C library, so it needs no LD_LIBRARY_PATH or rpath wherever it
# is copied, and finds its script library relative to the executable.
CPPFLAGS="-I${ZLIB_ROOT:?}/include" LDFLAGS="-L$ZLIB_ROOT/lib" \
  "$SOURCEDIR/unix/configure" --prefix="$INSTALLROOT" --disable-shared --disable-rpath
make ${JOBS:+-j$JOBS} binaries libraries
make install-binaries install-libraries install-headers
ln -nfs "tclsh${PKGVERSION%.*}" "$INSTALLROOT/bin/tclsh"
