#!/usr/bin/env bash
set -euo pipefail

TAG="${1:?usage: deploy.sh <tag>}"
export DOCKERHUB_USER="${DOCKERHUB_USER:-wkin}"
export IMAGE_TAG="$TAG"
export FORCE_UNHEALTHY="${FORCE_UNHEALTHY:-false}"

cd /opt/tasktrack
docker compose pull
docker compose up -d
docker image prune -f >/dev/null
echo "Deployed $TAG"