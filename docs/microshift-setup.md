# MicroShift Setup for OpenShift Testing

Run a local OpenShift-compatible cluster using MicroShift in Docker. Useful for validating Kubernetes manifests against OpenShift APIs (Routes, SCCs, etc.) without a full OpenShift installation.

## Prerequisites

- Docker Desktop or Docker CLI
- kubectl (included with Docker Desktop, or `brew install kubectl`)

## How It Works

kubectl reads connection details from a kubeconfig file. By setting the `KUBECONFIG` environment variable to point to MicroShift's kubeconfig, the same kubectl binary connects to MicroShift instead of Docker Desktop's Kubernetes cluster.

## Start MicroShift

```bash
docker run -d --name microshift --privileged \
  -v microshift-data:/var/lib \
  -p 6443:6443 -p 80:80 -p 443:443 \
  quay.io/microshift/microshift-aio:latest
```

Wait for the container to initialize (~1-2 minutes).

## Configure kubectl

Create a temporary directory for the kubeconfig and note its path:

```bash
MICROSHIFT_DIR=$(mktemp -d)
echo "Kubeconfig dir: $MICROSHIFT_DIR"
```

Extract the kubeconfig from the container:

```bash
docker exec microshift cat /var/lib/microshift/resources/kubeadmin/kubeconfig > "$MICROSHIFT_DIR/kubeconfig"
```

Point kubectl to the MicroShift cluster:

```bash
export KUBECONFIG="$MICROSHIFT_DIR/kubeconfig"
```

Note: The `MICROSHIFT_DIR` variable and `KUBECONFIG` export only persist in the current shell session. If you open a new terminal, re-export `KUBECONFIG` using the path printed above.

Verify connectivity:

```bash
kubectl get nodes
```

Expected output:

```
NAME           STATUS   ROLES    AGE   VERSION
<container-id> Ready    <none>   30s   v1.21.0
```

## Verify OpenShift APIs

Check that OpenShift-specific APIs are available:

```bash
kubectl api-resources | grep route.openshift.io
```

Expected output:

```
routes    route.openshift.io/v1    true    Route
```

## Check System Pods

```bash
kubectl get pods -A
```

Core pods should be Running:

- `kube-flannel-ds-*` (networking)
- `router-default-*` (OpenShift ingress)
- `service-ca-*` (certificate authority)
- `dns-default-*` (cluster DNS)

## Cleanup

Stop and remove the container:

```bash
docker stop microshift && docker rm microshift
```

Remove the persistent volume:

```bash
docker volume rm microshift-data
```

Remove the temporary kubeconfig directory. If you're in the same shell session:

```bash
rm -rf "$MICROSHIFT_DIR"
```

If `MICROSHIFT_DIR` is no longer set, check `KUBECONFIG` or find the directory manually:

```bash
echo $KUBECONFIG   # Shows path if still exported
# Or list recent temp directories (macOS uses /var/folders, Linux uses /tmp)
ls -ltd $TMPDIR/tmp.* 2>/dev/null || ls -ltd /tmp/tmp.* 2>/dev/null
```

Then remove the directory containing the kubeconfig.

## Notes

- Tested on macOS ARM64 (Apple Silicon)
- MicroShift runs as a privileged container (required for nested containers)
- The cluster uses Flannel for networking
- Storage is provided by `kubevirt-hostpath-provisioner`
- MicroShift runs Kubernetes v1.21; newer kubectl versions work for basic operations despite the version skew
