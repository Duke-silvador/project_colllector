#!/usr/bin/env bash
# 本地打包：生成插件商店要求的 <id>_<version>_<goos>_<goarch>.zip 与 checksums.txt
set -euo pipefail
cd "$(dirname "$0")"

ID=stepfun-credit-tracker
VER="${1:-1.1.0}"
mkdir -p dist build

build() {
  local goos=$1 goarch=$2 cc=$3 ext=$4
  local out="${ID}_${VER}_${goos}_${goarch}"
  echo "building $out"
  mkdir -p "build/$out"
  CGO_ENABLED=1 GOOS=$goos GOARCH=$goarch CC=$cc \
    go build -buildmode=c-shared -trimpath -ldflags '-s -w' \
    -o "build/$out/${ID}${ext}" .
  (cd "build/$out" && zip -q "../../dist/${out}.zip" "${ID}${ext}")
}

build linux amd64 gcc .so
build linux arm64 aarch64-linux-gnu-gcc .so

(cd dist && sha256sum *.zip > checksums.txt && cat checksums.txt)
echo "done -> dist/"
