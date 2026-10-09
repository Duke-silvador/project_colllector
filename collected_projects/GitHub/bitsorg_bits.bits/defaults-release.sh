package: defaults-release
version: v1
# bits.bits stands alone: no other recipe repository, no compiler package. The
# packages build with the compiler of the build host or builder image, and the
# build architecture is just the platform (x86_64-el9, …), so plain
# `bits build bits` works. A compiler profile, if one is ever wanted, is another
# defaults-<name>.sh here (--defaults <name>).
variables:
  # The {release} of the merged view the entry point runs from:
  # /cvmfs/bits.cern.ch/bits/views/current/<arch>. A new bits replaces it
  # (replace_on_conflict in the Bits community).
  release: "current"

# CVMFS namespace + layout (system: is NOT hashed): packages once per build
# arch, modulefiles beside them, and the merged view.
system:
  prefix:                     "/cvmfs/bits.cern.ch/bits"
  cvmfs_user_prefix:          "{prefix}/user"
  cvmfs_packages_template:    "{prefix}/{arch}/Packages/{pkg}/{tag}"
  cvmfs_modules_template:     "{prefix}/{arch}/Modules/modulefiles/{pkg}"
  cvmfs_shared_path_template: "{prefix}/noarch/{pkg}/{tag}"
  cvmfs_releases_template:    "{prefix}/releases/{release}/{family}{pkg}/{version}/{arch}"
  cvmfs_views_template:       "{prefix}/views/{release}/{arch}"
  # The view holds bits alone: its runtime is copied into it (bits.sh).
  cvmfs_view_exclude:         [bits-python, Tcl, environment-modules,
                               OpenSSL, zlib, bzip2, xz, sqlite, libffi]
---
