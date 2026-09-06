#!/usr/bin/env bash
# Canonical repository verification command.
#
# Runs the complete backend Java 21 Maven test suite, including the
# PostgreSQL/Testcontainers integration tests. Local agents and the
# `verify` GitHub Actions check both invoke this exact script, so there is
# one reproducible definition of "green" for the repository.
#
# Prerequisites: a JDK on PATH (the Maven wrapper provisions Maven itself)
# and a running Docker daemon (Testcontainers uses it to start PostgreSQL).
#
# Exits nonzero if any test fails.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$REPO_ROOT/backend"
./mvnw --batch-mode test
