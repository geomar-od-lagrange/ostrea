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
docker build -t localhost:5001/ostrea-api:latest ./api
docker build -t localhost:5001/ostrea-frontend:latest ./frontend
docker build -t localhost:5001/ostrea-db-init:latest -f database/init/Dockerfile ./database
```

Push to registry:

```bash
docker push localhost:5001/ostrea-api:latest
docker push localhost:5001/ostrea-frontend:latest
docker push localhost:5001/ostrea-db-init:latest
```

Verify images are in the registry:

```bash
curl -s http://localhost:5001/v2/_catalog
```

Expected: `{"repositories":["ostrea-api","ostrea-db-init","ostrea-frontend"]}`

## Deploy to MicroShift

### Create Namespace and Secret

```bash
kubectl create namespace ostrea
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
helm template ostrea ./helm/ostrea | kubectl delete --namespace ostrea -f -
```

Delete the namespace (removes all resources including secret):

```bash
kubectl delete namespace ostrea
```

To fully tear down MicroShift, see [microshift-setup.md](microshift-setup.md#cleanup).
