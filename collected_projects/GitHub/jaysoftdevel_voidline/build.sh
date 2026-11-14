#!/usr/bin/env bash
# Clean, verbose build of VOIDLINE. Every run starts from an empty build directory.
#
#   ./build.sh                 clean build, then run the unit tests
#   ./build.sh --no-tests      skip the unit tests
#   ./build.sh --verbose       print every compiler and linker command line
#   ./build.sh --debug         build without optimization and with debug info
# Any other argument is passed to CMake, for example -DVOIDLINE_LTO=OFF.
set -uo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
build="$root/build"
log="$root/build.log"
run_tests=1
verbose=0
type=Release
extra=()
for arg in "$@"; do
  case "$arg" in
    --no-tests) run_tests=0 ;;
    --verbose) verbose=1 ;;
    --debug) type=Debug ;;
    *) extra+=("$arg") ;;
  esac
done

if [[ -t 1 ]]; then
  bold=$'\033[1m'; dim=$'\033[2m'; red=$'\033[31m'; green=$'\033[32m'; yellow=$'\033[33m'; cyan=$'\033[36m'; plain=$'\033[0m'
else
  bold=; dim=; red=; green=; yellow=; cyan=; plain=
fi
now() { date +%s.%N; }
elapsed() { awk -v a="$1" -v b="$2" 'BEGIN { printf "%.1f", b - a }'; }
human() { numfmt --to=iec --suffix=B "$1" 2>/dev/null || echo "$1 B"; }
step() { printf '\n%s[%s/7] %s%s\n' "$bold$cyan" "$1" "$2" "$plain"; }
fail() { printf '%s%s%s\n' "$red" "$1" "$plain" >&2; printf '%sFull log: %s%s\n' "$dim" "$log" "$plain" >&2; exit 1; }

total_start=$(now)
: > "$log"
printf '%sVOIDLINE build%s\n' "$bold" "$plain"
printf '  Started      %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
printf '  Host         %s, %s CPU threads, %s\n' "$(uname -sr)" "$(nproc)" "$(uname -m)"
printf '  Source       %s\n' "$root"
printf '  Build type   %s\n' "$type"
printf '  Log file     %s\n' "$log"

command -v cmake >/dev/null || fail "CMake is unavailable. Run ./install_deps.sh."
compiler="${CXX:-g++}"
command -v "$compiler" >/dev/null || fail "C++ compiler '$compiler' is unavailable. Run ./install_deps.sh or set CXX."
generator=()
generator_name="Unix Makefiles"
if command -v ninja >/dev/null; then generator=(-G Ninja); generator_name=Ninja; fi
printf '  Compiler     %s\n' "$("$compiler" --version | head -n1)"
printf '  CMake        %s\n' "$(cmake --version | head -n1)"
printf '  Generator    %s\n' "$generator_name"

step 1 "Cleaning previous build"
if [[ -d "$build" ]]; then
  size=$(du -sb "$build" 2>/dev/null | cut -f1)
  files=$(find "$build" -type f | wc -l)
  rm -rf -- "$build" || fail "Could not remove $build"
  printf '  Removed %s (%s files, %s)\n' "$build" "$files" "$(human "${size:-0}")"
else
  printf '  No previous build directory.\n'
fi

step 2 "Configuring"
t=$(now)
if ! CXX="$compiler" cmake -S "$root" -B "$build" "${generator[@]}" -DCMAKE_BUILD_TYPE="$type" "${extra[@]}" >>"$log" 2>&1; then
  tail -n 30 "$log"; fail "Configuration failed."
fi
sed -n '/VOIDLINE .* configuration/,/Output/p' "$log" | sed 's/^-- /  /' | grep -v '^  $'
configure_time=$(elapsed "$t" "$(now)")
printf '  %sConfigured in %ss%s\n' "$dim" "$configure_time" "$plain"

step 3 "Compiling and linking"
t=$(now)
build_args=(--build "$build" --parallel)
(( verbose )) && build_args+=(--verbose)
warnings=0
status=0
while IFS= read -r line; do
  printf '%s\n' "$line" >>"$log"
  case "$line" in
    *warning:*) warnings=$((warnings+1)); printf '  %s%s%s\n' "$yellow" "$line" "$plain" ;;
    *error:*|*"undefined reference"*|*FAILED:*) printf '  %s%s%s\n' "$red" "$line" "$plain" ;;
    \[*Building*) printf '  %s\n' "$line" ;;
    \[*Linking*) printf '  %s%s%s\n' "$bold" "$line" "$plain" ;;
    *) (( verbose )) && printf '  %s%s%s\n' "$dim" "$line" "$plain" ;;
  esac
done < <(cmake "${build_args[@]}" 2>&1; echo "__status=$?")
# The status marker is the last line of the stream.
status=$(grep -a '^__status=' "$log" | tail -n1 | cut -d= -f2)
sed -i '/^__status=/d' "$log"
compile_time=$(elapsed "$t" "$(now)")
[[ "${status:-1}" == 0 ]] || fail "Build failed."
printf '  %sBuilt in %ss with %s warning(s)%s\n' "$dim" "$compile_time" "$warnings" "$plain"

step 4 "Verifying artifacts"
binary="$build/voidline/voidline"
[[ -x "$binary" ]] || fail "Expected executable $binary was not produced."
bytes=$(stat -c %s "$binary")
printf '  Executable   %s (%s)\n' "$binary" "$(human "$bytes")"
printf '  Linked libs  %s\n' "$(ldd "$binary" 2>/dev/null | awk '/=>/ {print $1}' | grep -E 'SDL2|webp|png|sndfile|json' | tr '\n' ' ')"
printf '  Version      %s\n' "$("$binary" --version 2>/dev/null)"
assets="$root/assets"
printf '  Assets       %s files, %s (art %s, audio %s)\n' "$(find "$assets" -type f | wc -l)" "$(human "$(du -sb "$assets" | cut -f1)")" \
  "$(find "$assets" -maxdepth 1 -type f | wc -l)" "$(find "$assets/audio" -type f | wc -l)"
sources=$(find "$root/src" -type f \( -name '*.cpp' -o -name '*.hpp' \))
printf '  Sources      %s lines in %s files\n' "$(xargs cat <<<"$sources" | wc -l)" "$(wc -l <<<"$sources")"
for module in "$root"/src/*/; do
  printf '    %-10s %s files\n' "$(basename "$module")" "$(find "$module" -type f \( -name '*.cpp' -o -name '*.hpp' \) | wc -l)"
done
for check in "$assets/cover.webp" "$assets/fonts/font-regular.png" "$assets/audio/menu.ogg"; do
  [[ -f "$check" ]] || fail "Missing required asset $check"
done
printf '  %sAll required assets are present.%s\n' "$green" "$plain"

step 5 "Running unit tests"
tests_summary="skipped"
t=$(now)
if (( run_tests )); then
  if ctest --test-dir "$build" --output-on-failure >"$build/ctest.log" 2>&1; then
    tests_summary=$(grep -E 'tests passed' "$build/ctest.log" | sed 's/^ *//')
    cat "$build/ctest.log" | sed 's/^/  /' | grep -E 'Test +#|tests passed'
  else
    cat "$build/ctest.log"; fail "Unit tests failed."
  fi
else
  printf '  Skipped (--no-tests).\n'
fi
test_time=$(elapsed "$t" "$(now)")

step 6 "Staging the tester runtime"
t=$(now)
runtime="$build/dist/VOIDLINE"
if ! bash "$root/scripts/stage-runtime.sh" "$binary" "$runtime" | tee -a "$log"; then
  fail "Runtime staging failed."
fi
stage_time=$(elapsed "$t" "$(now)")

step 7 "Summary"
total=$(elapsed "$total_start" "$(now)")
printf '  %-18s %ss\n' "Configure" "$configure_time"
printf '  %-18s %ss\n' "Compile and link" "$compile_time"
printf '  %-18s %ss\n' "Tests" "$test_time"
printf '  %-18s %ss\n' "Runtime staging" "$stage_time"
printf '  %-18s %s\n' "Tester folder" "$runtime"
printf '  %-18s %ss\n' "Total" "$total"
printf '  %-18s %s\n' "Warnings" "$warnings"
printf '  %-18s %s\n' "Tests" "$tests_summary"
printf '\n%sBuild succeeded.%s Run %s./run.sh%s to play.\n' "$green$bold" "$plain" "$bold" "$plain"
