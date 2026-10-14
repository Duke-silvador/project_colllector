#!/bin/bash
set -e

# Wrapper de compatibilite qui delegue au script d'entrypoint Auto-Wake
exec "$(dirname "$0")/scripts/entrypoint.sh"
