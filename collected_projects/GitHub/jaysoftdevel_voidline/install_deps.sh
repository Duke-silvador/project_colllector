#!/usr/bin/env bash
set -euo pipefail
packages=(g++ cmake ninja-build libsdl2-2.0-0 libgl1 libwebp7 libsndfile1 libjson-c5)
if ! command -v apt-get >/dev/null; then
  echo 'Install a C++20 compiler and runtime libraries SDL2, OpenGL/Mesa, libwebp, libpng16, libsndfile and json-c using your distribution package manager.' >&2
  exit 1
fi
if apt-cache show libpng16-16t64 2>/dev/null | awk '/^Package:/{found=1} END {exit !found}'; then
  packages+=(libpng16-16t64)
else
  packages+=(libpng16-16)
fi
if (( EUID == 0 )); then
  exec apt-get install "${packages[@]}"
else
  exec sudo apt-get install "${packages[@]}"
fi
