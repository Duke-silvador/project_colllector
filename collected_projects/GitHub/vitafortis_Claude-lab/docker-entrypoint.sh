#!/bin/sh
# Runs as root just long enough to let the "node" user use the mounted Docker socket
# (whatever group owns it on this host) and own the data folders. server.js then switches
# to that user (CCM_RUN_AS) before it loads anything.
set -e

if [ "$(id -u)" = 0 ]; then
	sock="${CCM_DOCKER_HOST:-${DOCKER_HOST:-unix:///var/run/docker.sock}}"
	sock="${sock#unix://}"
	if [ -S "$sock" ]; then
		gid="$(stat -c %g "$sock")"
		group="$(getent group "$gid" | cut -d: -f1)"
		if [ -z "$group" ]; then
			addgroup -g "$gid" docker-host
			group=docker-host
		fi
		addgroup node "$group" 2>/dev/null || true
	fi
	# Bind-mounted folders arrive owned by whoever created them on the host.
	for dir in "${CCM_DATA_DIR:-/data}" "${CCM_SESSIONS_DIR:-/sessions}"; do
		mkdir -p "$dir"
		[ "$(stat -c %u "$dir")" = 1000 ] || chown 1000:1000 "$dir"
	done
fi

exec "$@"
