#!/usr/bin/env bash
set -euo pipefail
umask 077
if [[ $# -ne 1 ]]; then
  echo "Usage: deploy.sh /absolute/path/to/runtime.env" >&2
  exit 2
fi
env_file=$1
runtime_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -f "$env_file" ]] || { echo "Runtime environment file not found" >&2; exit 1; }
permissions=$(stat -c %a -- "$env_file")
if (( (8#$permissions & 077) != 0 )); then
  echo "Runtime environment file is readable by group/others; chmod 600 first." >&2
  exit 1
fi

compose=(docker compose --env-file "$env_file" -f "$runtime_dir/compose.yaml")
"${compose[@]}" config --quiet
images=$("${compose[@]}" config --images)
for name in xiv-craftsmanship-web xiv-craftsmanship-api xiv-craftsmanship-db; do
  if ! grep -Eq "^ghcr\.io/hazuki3417/${name}@sha256:[0-9a-f]{64}$" <<< "$images"; then
    echo "Missing immutable GHCR digest for $name" >&2
    exit 1
  fi
done
if grep -Eq '(^|:)latest$|REPLACE_WITH_' <<< "$images"; then
  echo "Refusing mutable latest tag or placeholder image." >&2
  exit 1
fi
# Pull must be performed separately by pull-images.sh with temporary credentials.
# Never auto-pull on startup.
"${compose[@]}" up -d --no-build --pull never --wait
"${compose[@]}" ps
echo "Containers started; verify HTTPS and the actual BOM query manually."
