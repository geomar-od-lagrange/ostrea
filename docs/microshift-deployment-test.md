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
docker build -t localhost:5001/2024-hex-dashboard-api:latest ./api
docker build -t localhost:5001/2024-hex-dashboard-frontend:latest ./frontend
docker build -t localhost:5001/2024-hex-dashboard-db-init:latest -f database/init/Dockerfile ./database
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
kubectl create namespace 2024-hex-dashboard
```

Create the database secret (values must match `helm/ostrea/templates/env-configmap.yaml`):

```bash
kubectl create secret generic db-secret \
  --from-literal=POSTGRES_USER=user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=POSTGRES_DB=db \
  -n 2024-hex-dashboard
```

### Deploy with Helm

```bash
helm template oysters ./helm/ostrea --set registry=registry:5000/ \
  | kubectl apply --namespace 2024-hex-dashboard -f -
```

### Access the Application

Open in browser: **http://localhost:5173/**

The Routes are configured with `host: localhost`, so no `/etc/hosts` modification needed.

## Verify Deployment

Check pod status:

```bash
kubectl get pods -n 2024-hex-dashboard
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
kubectl get routes -n 2024-hex-dashboard
```

Test API:

```bash
curl -s http://localhost:5173/api/metadata | head -c 100
```

## Cleanup

Remove Helm-deployed resources (keeps namespace and secret for redeployment):

```bash
helm template oysters ./helm/ostrea | kubectl delete --namespace 2024-hex-dashboard -f -
```

Delete the namespace (removes all resources including secret):

```bash
kubectl delete namespace 2024-hex-dashboard
```

To fully tear down MicroShift, see [microshift-setup.md](microshift-setup.md#cleanup).
