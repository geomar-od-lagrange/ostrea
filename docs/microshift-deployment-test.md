# Testing OSTREA Deployment on MicroShift

Test the full OSTREA application deployment on a local MicroShift cluster.

## Prerequisites

Complete the MicroShift setup from [microshift-setup.md](microshift-setup.md):
- Docker network `microshift-net` created
- MicroShift container running (port 5173 mapped to router)
- Registry container running at `localhost:5001`
- CRI-O configured to trust the registry
- `KUBECONFIG` exported

Install Helm (if not available):
```bash
HELM_DIR=$(mktemp -d)
curl -fsSL https://get.helm.sh/helm-v3.17.0-darwin-arm64.tar.gz | tar -xz -C "$HELM_DIR"
export PATH="$HELM_DIR/darwin-arm64:$PATH"
```

## Build and Push Images

Build the project images:

```bash
docker build -t localhost:5001/ostrea-db:latest -f database/Dockerfile.postgis-fedora ./database
docker build -t localhost:5001/ostrea-api:latest ./api
docker build -t localhost:5001/ostrea-frontend:latest ./frontend
docker build -t localhost:5001/ostrea-db-init:latest -f database/init/Dockerfile ./database
```

Push to registry:

```bash
docker push localhost:5001/ostrea-db:latest
docker push localhost:5001/ostrea-api:latest
docker push localhost:5001/ostrea-frontend:latest
docker push localhost:5001/ostrea-db-init:latest
```

Verify images are in the registry:

```bash
curl -s http://localhost:5001/v2/_catalog
```

Expected: `{"repositories":["ostrea-api","ostrea-db","ostrea-db-init","ostrea-frontend"]}`

## Deploy to MicroShift

### Create Namespace and Secret

```bash
kubectl create namespace ostrea
```

#### Simulate Production OpenShift Security (Optional)

By default, MicroShift does not enforce the `restricted` SCC — containers can run as root. Production OpenShift assigns a random non-root UID from a namespace-specific range. To simulate this, annotate the namespace:

```bash
kubectl annotate namespace ostrea \
  openshift.io/sa.scc.uid-range=1000700000/10000 \
  openshift.io/sa.scc.supplemental-groups=1000700000/10000 \
  openshift.io/sa.scc.mcs-labels=s0:c26,c15
```

On production OpenShift, the `restricted` SCC enforces:

| Constraint | Effect |
|------------|--------|
| `runAsNonRoot: true` | Container must not run as root |
| `MustRunAsRange` | UID assigned from namespace annotation range |
| `allowPrivilegeEscalation: false` | No privilege escalation |
| `MustRunAs` (fsGroup) | fsGroup from namespace range |

MicroShift does not auto-inject these values into pods. The Helm chart must set them explicitly in pod security contexts for them to take effect. See [Restricted SCC Test Results](#restricted-scc-test-results) for image compatibility findings.

To remove the annotations and return to default behavior:

```bash
kubectl annotate namespace ostrea \
  openshift.io/sa.scc.uid-range- \
  openshift.io/sa.scc.supplemental-groups- \
  openshift.io/sa.scc.mcs-labels-
```

Create the database secret (values must match `helm/ostrea/templates/env-configmap.yaml`):

```bash
kubectl create secret generic db-secret \
  --from-literal=POSTGRES_USER=user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=POSTGRES_DB=db \
  -n ostrea
```

### Deploy with Helm

```bash
helm template ostrea ./helm/ostrea \
  --namespace ostrea \
  --set openshift=true \
  --set registry=registry:5000/ \
  --set host=localhost \
  | kubectl apply --namespace ostrea -f -
```

### Access the Application

Open in browser: **http://localhost:5173/**

The Routes are configured with `host: localhost`, so no `/etc/hosts` modification needed.

## Verify Deployment

Check pod status:

```bash
kubectl get pods -n ostrea
```

Expected:

```
NAME                        READY   STATUS    RESTARTS   AGE
api-...                     1/1     Running   0          1m
db-...                      1/1     Running   0          1m
db-init-...                 1/1     Running   0          1m
frontend-...                1/1     Running   0          1m
```

Check routes:

```bash
kubectl get routes -n ostrea
```

Test API:

```bash
curl -s http://localhost:5173/api/metadata | head -c 100
```

## Cleanup

Remove Helm-deployed resources (keeps namespace and secret for redeployment):

```bash
helm template ostrea ./helm/ostrea --namespace ostrea --set openshift=true | kubectl delete --namespace ostrea -f -
```

Delete the namespace (removes all resources including secret):

```bash
kubectl delete namespace ostrea
```

To fully tear down MicroShift, see [microshift-setup.md](microshift-setup.md#cleanup).

## PVC Restart Test

Verify data survives pod restarts (relevant for issue #31):

1. Deploy and wait for db-init to complete
2. Record row counts:
   ```bash
   kubectl exec -n ostrea deploy/db -- psql -U user -d db -c "SELECT count(*) FROM connectivity_table;"
   ```
3. Delete the pod (not the PVC):
   ```bash
   kubectl delete pod -n ostrea -l app=db
   ```
4. Wait for the replacement pod:
   ```bash
   kubectl wait -n ostrea --for=condition=ready pod -l app=db --timeout=120s
   ```
5. Verify row counts match

## Database Image: `ostrea-db`

The Helm chart uses `ostrea-db`, a custom PostgreSQL 16 + PostGIS image built from the [sclorg/postgresql-container](https://github.com/sclorg/postgresql-container) source. We build it ourselves because:

- `postgis/postgis:16-3.4` (used by docker-compose for local dev) runs as root — incompatible with OpenShift's restricted SCC
- `quay.io/fedora/postgresql-16` (Red Hat's prebuilt image) is OpenShift-compatible but lacks PostGIS and only ships amd64
- Building from the sclorg Fedora source (`quay.io/fedora/s2i-core:41`) gives us PostGIS, arm64 support, and OpenShift compatibility

Source: `database/Dockerfile.postgis-fedora` with vendored sclorg entrypoint scripts in `database/vendor/`.

> **Note:** docker-compose continues to use `postgis/postgis:16-3.4` for local frontend/API development. The `ostrea-db` image is only needed for Kubernetes deployments.

## Restricted SCC Test Results

Results from testing database container images under restricted-SCC-like constraints (namespace annotated with UID range, pods configured with `runAsNonRoot: true`, `runAsUser: 1000700000`).

### `postgis/postgis:16-3.4`

**Not compatible with restricted SCC.**

| Test | Result |
|------|--------|
| `runAsNonRoot` without explicit UID | `container has runAsNonRoot and image will run as root` — image runs as root |
| Explicit `runAsUser: 1000700000` | `chmod: changing permissions of '/var/lib/postgresql/data': Operation not permitted` |
| `initdb` | `could not change permissions of directory "/var/lib/postgresql/data": Operation not permitted` |

The image's entrypoint runs `chmod` and `initdb` as root. It cannot function under a random non-root UID.

### `quay.io/fedora/postgresql-16` (Investigation Baseline)

Tested the prebuilt RH image to confirm sclorg compatibility before building `ostrea-db`. **Compatible with restricted SCC, with volume adjustments.**

| Test | Result |
|------|--------|
| `initdb` as UID 1000700000 | Succeeds — all data files owned by random UID |
| PVC mount at `/var/lib/pgsql/data` | Fails — entrypoint creates `/var/lib/pgsql` first, permission denied |
| PVC mount at `/var/lib/pgsql` | Succeeds |
| Lock file at `/var/run/postgresql` | `FATAL: could not create lock file` — permission denied |
| Additional `emptyDir` at `/var/run/postgresql` | Succeeds — PostgreSQL starts and serves queries |

These findings apply equally to `ostrea-db` since it uses the same sclorg entrypoint scripts.

To debug startup failures, override the container command:

```yaml
command: ["bash", "-c", "run-postgresql || (cat /var/lib/pgsql/data/userdata/log/*.log 2>/dev/null; ls -la /var/lib/pgsql/ 2>/dev/null; id; exit 1)"]
```

### Image Comparison

| Aspect | `postgis/postgis:16-3.4` | `ostrea-db` (sclorg + PostGIS) |
|--------|--------------------------|-------------------------------|
| Runs as | root (UID 0) | postgres (UID 26), supports arbitrary UIDs |
| Data directory | `/var/lib/postgresql/data` | `/var/lib/pgsql/data/userdata` |
| PVC mount point | `/var/lib/postgresql/data` | `/var/lib/pgsql` |
| Env vars | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `POSTGRESQL_USER`, `POSTGRESQL_PASSWORD`, `POSTGRESQL_DATABASE` |
| Needs `/var/run/postgresql` mount | No (root can write anywhere) | Yes (`emptyDir`) |
| PostGIS | Built-in | Added via `dnf install postgis` |
| Architectures | amd64, arm64 | amd64, arm64 (built from Fedora base) |
| OpenShift restricted SCC | Not compatible | Compatible |

### PVC Restart Results

| Cluster | Image | UID After Restart | Data Preserved |
|---------|-------|-------------------|----------------|
| kind (vanilla k8s) | `postgis/postgis:16-3.4` | root (0) | Yes (17,833,840 rows) |
| MicroShift (default SCC) | `postgis/postgis:16-3.4` | root (0) | Yes (17,833,840 rows) |
| MicroShift (restricted SCC) | `postgis/postgis:16-3.4` | N/A | Pod fails to start |
| kind (vanilla k8s) | `ostrea-db` | 26 (postgres) | Yes (17,833,840 rows) |
| MicroShift (restricted SCC) | `ostrea-db` | — | Pending |

> **Gotcha:** Dockerfile `VOLUME` directives cause anonymous volume overlays on Kubernetes, shadowing PVC mounts at parent paths. The `ostrea-db` Dockerfile deliberately omits `VOLUME` for this reason. If data is lost on pod restart, check for this first.
