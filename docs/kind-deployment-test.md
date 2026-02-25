# Testing OSTREA Deployment with kind

Test the OSTREA Helm chart on a local Kubernetes cluster using [kind](https://kind.sigs.k8s.io/) (Kubernetes IN Docker).

**Goal:** After setup and deployment, access the app at **http://localhost:5173/** using port-forward.

## Prerequisites

- Docker Desktop or Docker CLI
- kubectl

## Differences from MicroShift

| Feature | kind | MicroShift |
|---------|------|------------|
| Kubernetes flavor | Vanilla K8s | OpenShift-compatible |
| Path routing | nginx deployment | OpenShift Routes |
| Setup complexity | Simple | More complex |

All environments pull images from Quay.io (see [image-building.md](image-building.md)).

The Helm chart includes both OpenShift Routes (for MicroShift) and an nginx deployment (for kind/vanilla K8s). Use `kubectl port-forward` to access the nginx service.

## Install kind

```bash
KIND_DIR=$(mktemp -d)
curl -Lo "$KIND_DIR/kind" https://kind.sigs.k8s.io/dl/v0.27.0/kind-darwin-arm64
chmod +x "$KIND_DIR/kind"
export PATH="$KIND_DIR:$PATH"
```

For other platforms, see [kind releases](https://github.com/kubernetes-sigs/kind/releases).

## Create Cluster

```bash
kind create cluster --name ostrea
```

Verify:

```bash
kubectl cluster-info --context kind-ostrea
```

## Deploy with Helm

Install Helm if needed:

```bash
HELM_DIR=$(mktemp -d)
curl -fsSL https://get.helm.sh/helm-v3.17.0-darwin-arm64.tar.gz | tar -xz -C "$HELM_DIR"
export PATH="$HELM_DIR/darwin-arm64:$PATH"
```

Create namespace and secret:

```bash
kubectl create namespace ostrea
kubectl create secret generic db-secret \
  --from-literal=POSTGRES_USER=user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=POSTGRES_DB=db \
  -n ostrea
```

Deploy:

```bash
helm template ostrea ./helm/ostrea --namespace ostrea | kubectl apply --namespace ostrea -f -
```

Note: With `openshift: false` (default), the chart deploys nginx for path-based routing instead of OpenShift Routes.

## Access the Application

Check pod status:

```bash
kubectl get pods -n ostrea
```

Wait for all pods to be Running (db-init will show Completed when done).

Port-forward the nginx service (handles `/api` routing like MicroShift Routes):

```bash
kubectl port-forward -n ostrea svc/nginx 5173:8080
```

Open http://localhost:5173/ in your browser.

## Verify Deployment

Check pods:

```bash
kubectl get pods -n ostrea
```

Check db-init logs:

```bash
kubectl logs -f job/db-init -n ostrea
```

Test API through nginx:

```bash
curl http://localhost:5173/api/metadata | jq '. | length'
```

## PVC Restart Test

Verify data survives pod restarts:

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

Results: Data preserved for both `postgis/postgis:16-3.4` and `ostrea-db` (17,833,840 connectivity rows, 8,357 geo rows). See [microshift-deployment-test.md](microshift-deployment-test.md#pvc-restart-results) for the full results table across clusters and images.

## Cleanup

Delete the deployment:

```bash
helm template ostrea ./helm/ostrea --namespace ostrea | kubectl delete --namespace ostrea -f -
kubectl delete namespace ostrea
```

Delete the cluster:

```bash
kind delete cluster --name ostrea
```
