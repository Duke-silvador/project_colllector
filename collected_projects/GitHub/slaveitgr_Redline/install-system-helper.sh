#!/bin/sh
# Install only the fork's helpers and standard authorization descriptors.
# No permissive Polkit rules, driver changes or boot parameters are added.
set -eu
[ "$(id -u)" = 0 ] || { echo 'Administrator permission is needed: run this script with sudo.'; exit 1; }
project=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
runtime="$project/runtime"
[ -f "$runtime/share/dbus-1/system-services/io.github.redline.native.helper.service" ] || { echo 'Build and stage the fork first.'; exit 1; }
[ ! -e /usr/local/libexec/redline ] || { echo 'An existing Redline helper installation was found; stopped.'; exit 1; }
for name in helper helperkiller; do
 for target in "/usr/share/dbus-1/system-services/io.github.redline.native.$name.service" "/etc/dbus-1/system.d/io.github.redline.native.$name.conf" "/usr/share/polkit-1/actions/io.github.redline.native.$name.policy"; do
  [ ! -e "$target" ] || { echo "Existing file: $target; stopped."; exit 1; }
 done
 binary="$runtime/libexec/redline/redline_$name"
 [ -x "$binary" ] || { echo "Missing binary: $binary"; exit 1; }
 if readelf -d "$binary" | grep -Eq 'RPATH|RUNPATH'; then echo 'Refusing privileged helper with an embedded library search path.'; exit 1; fi
 if ldd "$binary" | grep -q 'not found'; then echo 'Missing system runtime dependency; stopped.'; exit 1; fi
done
install -d -o root -g root -m 755 /usr/local/libexec/redline
for name in helper helperkiller; do
 install -o root -g root -m 755 "$runtime/libexec/redline/redline_$name" "/usr/local/libexec/redline/redline_$name"
 # Never run a privileged binary from this user-writable source checkout.
 sed "s|^Exec=.*|Exec=/usr/local/libexec/redline/redline_$name|" "$runtime/share/dbus-1/system-services/io.github.redline.native.$name.service" > "/usr/share/dbus-1/system-services/io.github.redline.native.$name.service"
 install -o root -g root -m 644 "$runtime/share/dbus-1/system.d/io.github.redline.native.$name.conf" "/etc/dbus-1/system.d/io.github.redline.native.$name.conf"
 install -o root -g root -m 644 "$runtime/share/polkit-1/actions/io.github.redline.native.$name.policy" "/usr/share/polkit-1/actions/io.github.redline.native.$name.policy"
 chown root:root "/usr/share/dbus-1/system-services/io.github.redline.native.$name.service"
 chmod 644 "/usr/share/dbus-1/system-services/io.github.redline.native.$name.service"
done
echo 'Redline helpers installed under their own namespace. No hardware settings were applied.'
echo 'Close the read-only preview, then run ./run-native.sh as your normal user.'
