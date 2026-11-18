#!/usr/bin/env bash
set -euo pipefail
echo "Rollback is performed by selecting the previously verified image digests" >&2
echo "in a separately reviewed private runtime.env file, then running:" >&2
echo "  pull-images.sh ROLLBACK_ENV GITHUB_USERNAME" >&2
echo "  deploy.sh ROLLBACK_ENV" >&2
echo "Database schema/data may not be backwards-compatible. No automated DB rollback." >&2
exit 0
