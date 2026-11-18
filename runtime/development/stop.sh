#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 1 ]]; then
  echo "Usage: stop.sh /absolute/path/to/runtime.env" >&2
  exit 2
fi
runtime_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
docker compose --env-file "$1" -f "$runtime_dir/compose.yaml" stop
# Do not run 'down -v': PostgreSQL and Caddy volumes must survive deployments.
