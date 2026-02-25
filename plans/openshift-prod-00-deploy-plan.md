# OpenShift Production Deployment Plan

Goal: deploy ostrea to a real OpenShift cluster from your local machine.

Two phases:
1. **Connect** — get `oc`/`kubectl` talking to the cluster
2. **Deploy** — apply the Helm chart with prod values

---

## Phase 1: Connect to the Cluster

### Step 1.1 — Install `oc` CLI

`oc` is a drop-in superset of `kubectl` that adds OpenShift-specific commands
(`oc login`, `oc new-project`, etc.). Get it from a temp dir:

```bash
OC_DIR=$(mktemp -d)
# Replace URL with the version matching your cluster (see web console → ? → Command Line Tools)
curl -fsSL https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-mac-arm64.tar.gz \
  | tar -xz -C "$OC_DIR"
export PATH="$OC_DIR:$PATH"
oc version
```

Or install persistently via pixi global (if available) or brew.

### Step 1.2 — Log in

**Option A — token login (recommended, no password in shell history):**

1. Open the OpenShift web console
2. Click your username → **Copy login command**
3. Paste and run:

```bash
oc login --token=<token> --server=https://<api.cluster.example.com>:6443
```

**Option B — username/password:**

```bash
oc login https://<api.cluster.example.com>:6443 -u <username>
```

This writes a kubeconfig to `~/.kube/config`. All subsequent `oc`/`kubectl`
commands target the cluster.

### Step 1.3 — Verify

```bash
oc whoami
oc get nodes          # May be restricted; no-output is OK, error is not
oc projects           # List projects/namespaces you can access
```

### YOUR QUESTIONS/NOTES:

- What is the cluster API URL? (e.g. `api.openshift.geomar.de:6443`)
- Do you already have a project/namespace, or do you need to request one?
- What's the target hostname for the app? (`ostrea.geomar.de`? something else?)
- Do you have cluster-admin, or are you a regular user in a project?

---

## Phase 2: Deploy

### Step 2.1 — Namespace / Project

If you already have a project (namespace), just switch to it:

```bash
oc project <your-project-name>
```

If not, request one from the cluster admin. The Helm chart deploys to whatever
namespace is current (or passed via `--namespace`).

### Step 2.2 — Install Helm (if needed)

```bash
HELM_DIR=$(mktemp -d)
curl -fsSL https://get.helm.sh/helm-v3.17.0-darwin-arm64.tar.gz | tar -xz -C "$HELM_DIR"
export PATH="$HELM_DIR/darwin-arm64:$PATH"
```

### Step 2.3 — Create the DB secret

```bash
oc create secret generic db-secret \
  --from-literal=POSTGRES_USER=user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=POSTGRES_DB=db \
  -n <namespace>
```

### Step 2.4 — Dry run first

Preview what will be applied:

```bash
helm template ostrea ./helm/ostrea \
  --namespace <namespace> \
  --set openshift=true \
  --set host=<hostname> \
  --set route.tls.termination=edge
```

Key difference from MicroShift: **do NOT set `restrictedSCC=true`**. Real
OpenShift's admission controller injects the UID from the namespace range
automatically. Setting it would conflict.

### Step 2.5 — Apply

```bash
helm template ostrea ./helm/ostrea \
  --namespace <namespace> \
  --set openshift=true \
  --set host=<hostname> \
  --set route.tls.termination=edge \
  | oc apply --namespace <namespace> -f -
```

### Step 2.6 — Verify

```bash
oc get pods -n <namespace>
oc get routes -n <namespace>
```

Expected routes output (HTTPS via edge TLS):

```
NAME              HOST/PORT          PATH   SERVICES   PORT   TERMINATION
ostrea-api        <hostname>         /api   api        http   edge
ostrea-frontend   <hostname>                frontend   http   edge
```

Test the app:

```bash
curl -s https://<hostname>/api/metadata | head -c 100
```

Then open in browser: **https://\<hostname\>/**

### Step 2.7 — Cleanup (if needed)

```bash
helm template ostrea ./helm/ostrea --namespace <namespace> --set openshift=true \
  | oc delete --namespace <namespace> -f -
# Keeps namespace and db-secret — re-deploy without re-creating the secret
```

---

## Unknowns to resolve before deploying

| Unknown | Why it matters |
|---------|----------------|
| Cluster API URL | needed for `oc login` |
| Namespace/project name | `--namespace` in all commands |
| Target hostname | `--set host=` in Helm |
| SCC / security policy | cluster may have custom SCCs or stricter policy than `restricted` |
| Image pull policy | Quay.io images are public; should work without pull secrets |
| Storage class for PVC | default may differ from MicroShift; db PVC needs a valid StorageClass |
| Cluster version | affects Route API version compatibility |
