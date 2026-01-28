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

## Set Up Image Registry

MicroShift uses CRI-O which requires a registry to pull images from (no direct image loading like kind). Run a registry container on a shared Docker network.

Create the network and connect MicroShift to it:

```bash
docker network create microshift-net
docker network connect microshift-net microshift
```

Start the registry container (using port 5001 since macOS uses 5000 for AirPlay):

```bash
docker run -d --name registry --network microshift-net -p 5001:5000 registry:2
```

Verify both sides can access it:

```bash
# From host
curl -s http://localhost:5001/v2/_catalog

# From MicroShift (uses container name as hostname)
docker exec microshift curl -s http://registry:5000/v2/_catalog
```

Configure CRI-O to trust the insecure registry:

```bash
docker exec microshift bash -c 'cat >> /etc/containers/registries.conf <<EOF

[[registry]]
location = "registry:5000"
insecure = true
EOF'

docker exec microshift systemctl restart crio
```

### Push Images to Registry

Tag and push images from your host. Use `localhost:5001` for pushing:

```bash
docker tag myimage:latest localhost:5001/myimage:latest
docker push localhost:5001/myimage:latest
```

In Kubernetes manifests, reference images as `registry:5000/myimage:latest` (how MicroShift sees the registry on the Docker network).

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

Stop and remove the containers:

```bash
docker stop microshift registry && docker rm microshift registry
```

Remove the Docker network:

```bash
docker network rm microshift-net
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
