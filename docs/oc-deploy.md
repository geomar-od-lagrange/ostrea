# OpenShift Deployment

Deploying OSTREA to OpenShift (staging or production).

Images are pulled from Quay.io (see [image-building.md](image-building.md)).

---

## Prerequisites

### `oc` CLI

`oc` is a drop-in superset of `kubectl` with OpenShift-specific commands. Install to a temp dir:

```bash
OC_DIR=$(mktemp -d)
# Adjust URL to match your cluster version (web console → ? → Command Line Tools)
curl -fsSL https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-mac-arm64.tar.gz \
  | tar -xz -C "$OC_DIR"
export PATH="$OC_DIR:$PATH"
oc version
```

### Log in

```bash
# Option A — token (recommended, no password in shell history):
# Web console → username → Copy login command
oc login --token=<token> --server=https://<api.cluster>:6443

# Option B — password:
oc login https://<api.cluster>:6443 -u <username>
```

Verify:

```bash
oc whoami
oc projects
```

### Helm

```bash
HELM_DIR=$(mktemp -d)
curl -fsSL https://get.helm.sh/helm-v3.17.0-darwin-arm64.tar.gz | tar -xz -C "$HELM_DIR"
export PATH="$HELM_DIR/darwin-arm64:$PATH"
```

---

## Staging

**URL:** https://ostrea-stage.apps.ocpv.geomar.de
**Image tag:** `staging` (i.e. `ostrea-*-staging` on Quay.io)

### Create namespace and secret (once)

```bash
oc project <staging-namespace>

oc create secret generic db-secret \
  --from-literal=POSTGRES_USER=user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=POSTGRES_DB=db \
  -n <staging-namespace>
```

### Deploy

```bash
helm template ostrea ./helm/ostrea \
  --namespace <staging-namespace> \
  --set openshift=true \
  --set host=ostrea-stage.apps.ocpv.geomar.de \
  --set route.tls.termination=edge \
  --set image.tag=staging \
  | oc apply --namespace <staging-namespace> -f -
```

### Verify

```bash
oc get pods -n <staging-namespace>
oc get routes -n <staging-namespace>
curl -s https://ostrea-stage.apps.ocpv.geomar.de/api/metadata | head -c 100
```

### Update staging images

After building new `*-staging` images (see [image-building.md](image-building.md)):

```bash
oc rollout restart deployment/frontend -n <staging-namespace>
oc rollout restart deployment/api -n <staging-namespace>
```

### Cleanup

```bash
helm template ostrea ./helm/ostrea \
  --namespace <staging-namespace> \
  --set openshift=true \
  | oc delete --namespace <staging-namespace> -f -
# Keeps namespace and db-secret
```

---

## Production

**URL:** https://ostrea.geomar.de
**Image tag:** `latest` (or a pinned git SHA)

### Create namespace and secret (once)

```bash
oc project <prod-namespace>

oc create secret generic db-secret \
  --from-literal=POSTGRES_USER=user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=POSTGRES_DB=db \
  -n <prod-namespace>
```

### Deploy

Do NOT set `restrictedSCC=true` — real OpenShift injects the UID from the namespace range automatically via its admission controller.

```bash
# Dry run first
helm template ostrea ./helm/ostrea \
  --namespace <prod-namespace> \
  --set openshift=true \
  --set host=ostrea.geomar.de \
  --set route.tls.termination=edge

# Apply
helm template ostrea ./helm/ostrea \
  --namespace <prod-namespace> \
  --set openshift=true \
  --set host=ostrea.geomar.de \
  --set route.tls.termination=edge \
  | oc apply --namespace <prod-namespace> -f -
```

To deploy a pinned version:

```bash
helm template ostrea ./helm/ostrea \
  --namespace <prod-namespace> \
  --set openshift=true \
  --set host=ostrea.geomar.de \
  --set route.tls.termination=edge \
  --set image.tag=<git-sha> \
  | oc apply --namespace <prod-namespace> -f -
```

### Verify

```bash
oc get pods -n <prod-namespace>
oc get routes -n <prod-namespace>
curl -s https://ostrea.geomar.de/api/metadata | head -c 100
```

### Cleanup

```bash
helm template ostrea ./helm/ostrea \
  --namespace <prod-namespace> \
  --set openshift=true \
  | oc delete --namespace <prod-namespace> -f -
# Keeps namespace and db-secret
```
