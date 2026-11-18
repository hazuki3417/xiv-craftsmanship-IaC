#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ $# -ne 2 ]]; then
  echo "Usage: pull-images.sh /absolute/path/to/runtime.env GITHUB_USERNAME" >&2
  exit 2
fi
env_file=$1
github_username=$2
runtime_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -f "$env_file" ]] || { echo "Runtime environment file not found" >&2; exit 1; }
[[ -n "$github_username" ]] || { echo "GitHub username must not be empty" >&2; exit 1; }

config_dir=$(mktemp -d)
cleanup() { rm -rf -- "$config_dir"; }
trap cleanup EXIT
export DOCKER_CONFIG="$config_dir"

echo "Enter a GitHub token with read:packages permission (input hidden):" >&2
IFS= read -r -s token < /dev/tty
printf '\n' >&2
if [[ -z "$token" ]]; then
  echo "No token provided" >&2
  exit 1
fi
printf '%s' "$token" | docker login ghcr.io -u "$github_username" --password-stdin >/dev/null
unset token

docker compose --env-file "$env_file" -f "$runtime_dir/compose.yaml" config --quiet
docker compose --env-file "$env_file" -f "$runtime_dir/compose.yaml" pull web api db caddy
echo "Images pulled; running containers were NOT changed."
