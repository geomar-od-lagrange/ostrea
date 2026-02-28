#!/usr/bin/env bash
# Usage: bash scripts/deploy-oc.sh <stage> <hostname>
# Example: bash scripts/deploy-oc.sh test ostrea-test.apps.ocpv.geomar.de
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

STAGE=${1:?Usage: $0 <stage> <hostname>}
HOST=${2:?Usage: $0 <stage> <hostname>}
NS="od-ostrea-${STAGE}"

# Create db-secret if it does not already exist
if ! oc get secret db-secret --namespace "${NS}" &>/dev/null; then
  echo "Creating db-secret in ${NS} ..."
  oc create secret generic db-secret \
    --namespace "${NS}" \
    --from-literal=POSTGRES_USER=ostrea \
    --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 32)" \
    --from-literal=POSTGRES_DB=ostrea
  echo "db-secret created."
else
  echo "db-secret already exists in ${NS}, skipping."
fi

helm template ostrea ./helm/ostrea \
  --namespace "${NS}" \
  --set openshift=true \
  --set host="${HOST}" \
  --set route.tls.termination=edge \
  --set image.tag="latest-${STAGE}" \
  | oc replace --force --namespace "${NS}" -f -
