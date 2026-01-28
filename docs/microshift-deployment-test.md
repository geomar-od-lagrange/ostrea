# Testing OYSTERS Deployment on MicroShift

Test the full OYSTERS application deployment on a local MicroShift cluster.

## Prerequisites

Complete the MicroShift setup from [microshift-setup.md](microshift-setup.md):
- Docker network `microshift-net` created
- MicroShift container running
- Registry container running at `localhost:5001`
- CRI-O configured to trust the registry
- `KUBECONFIG` exported

Also ensure `envsubst` is available:
```bash
pixi global install gettext
pixi global expose add --environment gettext envsubst
```

## Build and Push Images

Build the project images:

```bash
docker build -t localhost:5001/2024-hex-dashboard-api:latest ./api
docker build -t localhost:5001/2024-hex-dashboard-frontend:latest ./frontend
docker build -t localhost:5001/2024-hex-dashboard-db-init:latest ./database/init
```

Push to registry:

```bash
docker push localhost:5001/2024-hex-dashboard-api:latest
docker push localhost:5001/2024-hex-dashboard-frontend:latest
docker push localhost:5001/2024-hex-dashboard-db-init:latest
```

Verify images are in the registry:

```bash
curl -s http://localhost:5001/v2/_catalog
```

Expected: `{"repositories":["2024-hex-dashboard-api","2024-hex-dashboard-db-init","2024-hex-dashboard-frontend"]}`

## Deploy to MicroShift

### Create Namespace and Secret

```bash
kubectl apply -f k8s/namespace.yaml
```

Create the database secret. Values must match `k8s/env-configmap.yaml`:

```bash
kubectl create secret generic db-secret \
  --from-literal=POSTGRES_USER=user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=POSTGRES_DB=db \
  -n 2024-hex-dashboard
```

### Apply Manifests with Registry Prefix

The k8s manifests use `${REGISTRY}` templating for image names. Set the registry prefix and apply:

```bash
export REGISTRY=registry:5000/
for f in k8s/*.yaml; do
  envsubst '$REGISTRY' < "$f"
  echo "---"
done | kubectl apply -n 2024-hex-dashboard -f -
```

Notes:
- `envsubst '$REGISTRY'` only substitutes `$REGISTRY`, leaving other variables like `$POSTGRES_USER` untouched
- `echo "---"` adds YAML document separators between files
- `-n 2024-hex-dashboard` ensures all resources go to the correct namespace

### Set Up Port Forwarding

```bash
kubectl port-forward -n 2024-hex-dashboard svc/nginx 5173:5173 &
```

**Frontend available at: http://localhost:5173/**

The UI will load immediately. Data populates as db-init runs (~3 minutes).

## Verify Deployment

Check pod status:

```bash
kubectl get pods -n 2024-hex-dashboard
```

Expected:

```
NAME                        READY   STATUS      RESTARTS   AGE
api-...                     1/1     Running     0          1m
db-...                      1/1     Running     0          1m
db-init-...                 1/1     Running     0          1m
frontend-...                1/1     Running     0          1m
nginx-...                   1/1     Running     0          1m
```

Check the OpenShift Route was created:

```bash
kubectl get routes -n 2024-hex-dashboard
```

Test the API:

```bash
curl -s http://localhost:5173/api/metadata | head -c 100
```

## Local Deployment (without registry)

For local testing with kind or Docker Desktop Kubernetes where images are loaded directly:

```bash
export REGISTRY=
for f in k8s/*.yaml; do
  envsubst '$REGISTRY' < "$f"
  echo "---"
done | kubectl apply -n 2024-hex-dashboard -f -
```

This uses local image names directly (e.g., `2024-hex-dashboard-api:latest`).

## Cleanup

Stop port forwarding:

```bash
pkill -f "kubectl port-forward.*2024-hex-dashboard"
```

Delete the namespace (removes all resources):

```bash
kubectl delete namespace 2024-hex-dashboard
```

To fully tear down MicroShift, see [microshift-setup.md](microshift-setup.md#cleanup).
