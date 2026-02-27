#!/usr/bin/env bash
# Usage: bash scripts/deploy-oc.sh <stage> <hostname>
# Example: bash scripts/deploy-oc.sh test ostrea-test.apps.ocpv.geomar.de
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

STAGE=${1:?Usage: $0 <stage> <hostname>}
HOST=${2:?Usage: $0 <stage> <hostname>}

helm template ostrea ./helm/ostrea \
  --namespace "od-ostrea-${STAGE}" \
  --set openshift=true \
  --set host="${HOST}" \
  --set route.tls.termination=edge \
  --set image.tag="latest-${STAGE}" \
  | oc replace --force --namespace "od-ostrea-${STAGE}" -f -
