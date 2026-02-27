#!/usr/bin/env bash
# Usage: bash scripts/build-images.sh [--suffix SUFFIX]
# SUFFIX env var also accepted. Produces tags: ostrea-api-latest[-SUFFIX], ostrea-api-<sha>[-SUFFIX]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

while [[ $# -gt 0 ]]; do
  case $1 in --suffix) SUFFIX="$2"; shift 2 ;; *) echo "Unknown: $1"; exit 1 ;; esac
done

REPO=quay.io/willirath/ostrea
GIT_REF=$(git rev-parse --short HEAD)
SUFFIX=${SUFFIX:-}
SEP=${SUFFIX:+-}

build() {
  local NAME=$1; shift
  docker build --platform linux/amd64,linux/arm64 \
    -t "${REPO}:${NAME}-latest${SEP}${SUFFIX}" \
    -t "${REPO}:${NAME}-${GIT_REF}${SEP}${SUFFIX}" \
    --push "$@"
}

build ostrea-api      api/
build ostrea-frontend frontend/
build ostrea-db       -f database/Dockerfile.postgis-fedora database/
build ostrea-db-init  -f database/init/Dockerfile database/
