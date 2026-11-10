#!/usr/bin/env bash
set -euo pipefail

cd /opt/tasktrack

TAG="$(cat last_good_tag 2>/dev/null || true)"
if [ -z "$TAG" ]; then
  echo "No good tag saved"
  exit 1
fi

echo "Rolling back to $TAG"
export DOCKERHUB_USER="${DOCKERHUB_USER:-wkin}"
export IMAGE_TAG="$TAG"
export FORCE_UNHEALTHY=false

docker compose up -d
./healthcheck.sh http://localhost/health "$TAG"