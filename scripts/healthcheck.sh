#!/usr/bin/env bash
export IMAGE_TAG="$TAG" FORCE_UNHEALTHY=false
export DOCKERHUB_USER="${DOCKERHUB_USER:-wkin}"

URL="${1:?usage: healthcheck.sh <url> [expected_version]}"
EXPECTED="${2:-}"
for i in $(seq 1 10); do
  BODY=$(curl -fsS --max-time 5 "$URL" 2>/dev/null || true)
  if echo "$BODY" | grep -Eq '"status":\s*"ok"'; then
    if [ -z "$EXPECTED" ] || echo "$BODY" | grep -q "$EXPECTED"; then
      echo "HEALTH OK: $BODY"; exit 0
    fi
  fi
  echo "Attempt $i failed, retrying..."; sleep 3
done
echo "HEALTH CHECK FAILED"; exit 1