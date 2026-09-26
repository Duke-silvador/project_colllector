#!/usr/bin/env bash
set -euo pipefail

SUPPORTED_TARGETS=(
  "Heltec_v3_companion_radio_wifi"
  "Heltec_v3_companion_radio_ble"
  "Heltec_t114_companion_radio_ble"
)

usage() {
  cat <<'EOF'
Usage:
  ./build.sh list
  ./build.sh build-firmware <target>
  ./build.sh build-supported

Supported targets:
  Heltec_v3_companion_radio_wifi
  Heltec_v3_companion_radio_ble
  Heltec_t114_companion_radio_ble

Environment:
  FIRMWARE_VERSION=<version>  Override VERSION for a local build.
  DISABLE_DEBUG=1            Disable HiveFW debug logging flags.
EOF
}

is_supported_target() {
  local requested="$1"
  local target
  for target in "${SUPPORTED_TARGETS[@]}"; do
    [[ "$target" == "$requested" ]] && return 0
  done
  return 1
}

get_platform_for_env() {
  local env_name="$1"
  pio project config --json-output | python3 -c "
import sys, json, re
data = json.load(sys.stdin)
for section, options in data:
    if section == 'env:$env_name':
        for key, value in options:
            if key == 'build_flags':
                for flag in value:
                    match = re.search(r'(ESP32_PLATFORM|NRF52_PLATFORM)', flag)
                    if match:
                        print(match.group(1))
                        raise SystemExit
"
}

disable_debug_flags() {
  if [[ "${DISABLE_DEBUG:-0}" == "1" ]]; then
    export PLATFORMIO_BUILD_FLAGS="${PLATFORMIO_BUILD_FLAGS:-} -UMESH_DEBUG -UBLE_DEBUG_LOGGING -UWIFI_DEBUG_LOGGING -UGPS_NMEA_DEBUG -UCORE_DEBUG_LEVEL -URADIOLIB_DEBUG_SPI -UCFG_DEBUG -URADIOLIB_DEBUG_BASIC -URADIOLIB_DEBUG_PROTOCOL"
  fi
}

build_firmware() {
  local target="$1"
  if ! is_supported_target "$target"; then
    echo "Unsupported HiveFW target: $target" >&2
    echo "Use './build.sh list' to see supported hardware." >&2
    exit 2
  fi

  local env_platform
  env_platform="$(get_platform_for_env "$target")"

  local commit_hash
  commit_hash="$(git rev-parse --short HEAD)"
  local build_date
  build_date="$(LC_ALL=C date '+%b %d %Y')"

  local version="${FIRMWARE_VERSION:-}"
  if [[ -z "$version" ]]; then
    version="$(tr -d '[:space:]' < VERSION)"
  fi
  [[ -n "$version" ]] || { echo "Firmware version is empty" >&2; exit 1; }

  local version_string="${version}-${commit_hash}"
  local output_name="${target}-${version_string}"

  export PLATFORMIO_BUILD_FLAGS="${PLATFORMIO_BUILD_FLAGS:-} -DFIRMWARE_BUILD_DATE='\"${build_date}\"' -DFIRMWARE_VERSION='\"${version_string}\"'"
  disable_debug_flags

  mkdir -p out
  pio run -e "$target"

  if [[ "$env_platform" == "ESP32_PLATFORM" ]]; then
    pio run -t mergebin -e "$target"
    cp ".pio/build/$target/firmware.bin" "out/${output_name}.bin"
    cp ".pio/build/$target/firmware-merged.bin" "out/${output_name}-merged.bin"
  elif [[ "$env_platform" == "NRF52_PLATFORM" ]]; then
    python3 bin/uf2conv/uf2conv.py ".pio/build/$target/firmware.hex" -c -o ".pio/build/$target/firmware.uf2" -f 0xADA52840
    cp ".pio/build/$target/firmware.uf2" "out/${output_name}.uf2"
    cp ".pio/build/$target/firmware.zip" "out/${output_name}.zip"
  else
    echo "Unsupported platform for target $target: $env_platform" >&2
    exit 3
  fi
}

command="${1:-}"
case "$command" in
  list|-l)
    printf '%s\n' "${SUPPORTED_TARGETS[@]}"
    ;;
  build-firmware)
    [[ -n "${2:-}" ]] || { usage; exit 1; }
    rm -rf out
    mkdir -p out
    build_firmware "$2"
    ;;
  build-supported|build-firmwares)
    rm -rf out
    mkdir -p out
    for target in "${SUPPORTED_TARGETS[@]}"; do
      build_firmware "$target"
    done
    ;;
  help|usage|-h|--help|"")
    usage
    ;;
  *)
    echo "Unknown command: $command" >&2
    usage
    exit 1
    ;;
esac
