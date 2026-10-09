package: environment-modules
description: Environment Modules (modulecmd), which bits uses for q/enter/load
version: "5.7.0"
sources:
  - https://github.com/envmodules/modules/releases/download/v%(version)s/modules-%(version)s.tar.gz,sha256:0267e47602237ab3fa3b820b5c94332b2e4a551bc08ba7b9d9e68d0eec92b18d
build_requires:
  - Tcl
license: GPL-2.0-or-later
---
#!/bin/bash -e
# Pure Tcl: no C extension library, no documentation tree, no example modulefiles
# (bits sets MODULEPATH itself). The release tarball carries pre-built man pages,
# so no Sphinx is needed. configure looks for tclsh only in the system
# directories, so it is given ours. Built in a copy of the source tree.
rsync -a "$SOURCEDIR/" ./
./configure --prefix="$INSTALLROOT" --with-tclsh="$TCL_ROOT/bin/tclsh8.6" \
            --disable-libtclenvmodules --disable-doc-install --disable-example-modulefiles
make ${JOBS:+-j$JOBS}
make install
# The installed bin/modulecmd execs modulecmd.tcl by its absolute build path,
# with the tclsh of the build. Replace it with one that locates itself, also
# through links, and runs the tclsh8.6 beside it (bits' runtime/), else the one
# on PATH (this package alone), so it works wherever it is copied.
cat > "$INSTALLROOT/bin/modulecmd" <<'EOS'
#!/bin/sh
d=$(dirname "$(readlink -f "$0")")
t=$d/tclsh8.6
[ -x "$t" ] || t=tclsh8.6
exec "$t" "$d/../libexec/modulecmd.tcl" "$@"
EOS
chmod 755 "$INSTALLROOT/bin/modulecmd"
