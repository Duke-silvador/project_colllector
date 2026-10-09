package: bits
description: bits build and environment tool, with its own Python and Environment Modules
version: "0.6"
tag: "main"
source: https://github.com/bitsorg/bits
# Build-only: their files are copied into runtime/ (below), so loading bits must
# not load them, nor put their bin and lib on PATH and LD_LIBRARY_PATH.
build_requires:
  - bits-python
  - Tcl
  - environment-modules
license: GPL-3.0-or-later
---
#!/bin/bash -e
# The install is the runtime part of a git checkout (the README's "clone and put
# it on PATH"): the scripts with bits_helpers/, keys/ and templates/ beside them,
# which bits finds relative to its own directory. It goes to libexec/bits, not
# bin/, so a merged view links the directory whole.
#
# runtime/ beside the scripts holds bits' own Python with its modules, Tcl and
# modulecmd, copied from those packages. bits finds it there and runs them by
# path, so it needs nothing on PATH, LD_LIBRARY_PATH or PYTHONPATH and adds
# nothing to the environment of what it builds or loads. The C libraries they
# use are linked in statically.
dest="$INSTALLROOT/libexec/bits"
mkdir -p "$dest/runtime"
rsync -a --exclude '/.*' --exclude /tests --exclude /docs --exclude /console-backend \
      --exclude /debian --exclude /tools --exclude '/*.egg-info' --exclude __pycache__ \
      "$SOURCEDIR/" "$dest/"
# No .git in the install: bits_helpers/version.py reads the version of an
# installed package from _version.py.
printf 'version = "%s"\n' "$PKGVERSION" > "$dest/bits_helpers/_version.py"
# Static archives and pkg-config files are for building against, not running.
for d in "${BITS_PYTHON_ROOT:?}"/{bin,lib} "${TCL_ROOT:?}"/{bin,lib} "${ENVIRONMENT_MODULES_ROOT:?}"/{bin,libexec}; do
  mkdir -p "$dest/runtime/${d##*/}"
  rsync -a --exclude '*.a' --exclude /pkgconfig "$d/" "$dest/runtime/${d##*/}/"
done
[[ -x $dest/runtime/bin/python3 && -x $dest/runtime/bin/tclsh8.6 && -x $dest/runtime/bin/modulecmd ]]

# Compiled Python checked against the source's content, not its time (as Python
# does under SOURCE_DATE_EPOCH): a package unpacked from its tarball, or
# published on CVMFS, has other file times than here, and bytecode checked by
# time would be recompiled on every run there (it cannot be written).
"$dest/runtime/bin/python3" -E -s -m compileall -q -f -j 0 -o 0 -o 1 -o 2 \
  --invalidation-mode checked-hash "$dest"

# The runtime loads no library from the host but the C library (and libgcc_s,
# which wheels may use), and no library through a search path that is not
# $ORIGIN-relative: so LD_LIBRARY_PATH never changes what bits runs, and the
# build host's libraries are never needed. Libraries that come with the
# runtime (the wheels' own, under $ORIGIN) are fine.
command -v readelf > /dev/null
bad=$(find "$dest/runtime" -type f \( -name '*.so' -o -name '*.so.*' -o -perm -u+x \) |
while IFS= read -r f; do
  { readelf -d "$f" 2> /dev/null || true; } | sed -n 's/.*(\(NEEDED\|RPATH\|RUNPATH\)).*\[\(.*\)\]/\1 \2/p' |
  while read -r tag val; do
    case $tag:$val in
      NEEDED:libc.so.*|NEEDED:libm.so.*|NEEDED:libdl.so.*|NEEDED:libpthread.so.*|NEEDED:librt.so.*|\
      NEEDED:libutil.so.*|NEEDED:ld-linux*|NEEDED:libgcc_s.so.*) ;;
      NEEDED:*) [[ -n $(find "$dest/runtime" -name "$val" -print -quit) ]] || echo "$f needs $val" ;;
      *) for p in ${val//:/ }; do [[ $p == '$ORIGIN'* ]] || echo "$f has $tag $val"; done ;;
    esac
  done
done)
[[ -z $bad ]] || { echo "$bad"; exit 1; }

# `module load bits`: the scripts' directory on PATH. BASE/1.0 (published with
# the modules) sets BASEDIR; bits fills in the revision placeholder on install.
mkdir -p "$INSTALLROOT/etc/modulefiles"
cat > "$INSTALLROOT/etc/modulefiles/bits" <<EOS
#%Module1.0
module-whatis "bits $PKGVERSION"
if ![ is-loaded BASE/1.0 ] { module load BASE/1.0 }
prepend-path PATH \$::env(BASEDIR)/bits/$PKGVERSION-@@PKGREVISION@$PKGHASH@@/libexec/bits
EOS
