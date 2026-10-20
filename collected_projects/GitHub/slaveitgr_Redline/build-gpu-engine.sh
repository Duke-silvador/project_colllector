#!/bin/sh
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cargo_bin=${CARGO:-cargo}
if [ -z "${BINDGEN_EXTRA_CLANG_ARGS:-}" ]; then
 export BINDGEN_EXTRA_CLANG_ARGS="-isystem $(cc -print-file-name=include)"
fi
"$cargo_bin" +1.97.0 build --locked --manifest-path "$project/3rdparty/redline-gpu/Cargo.toml" -p redline-gpu-backend --release
install -d "$project/runtime/libexec/redline"
install -m 755 "${CARGO_TARGET_DIR:-$project/3rdparty/redline-gpu/target}/release/redline-gpu-backend" "$project/runtime/libexec/redline/redline-gpu-backend"
