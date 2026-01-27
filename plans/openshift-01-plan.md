# OpenShift Deployment - Planning Notes

Areas we'll likely need to address when deploying to OpenShift. To be validated against a local OpenShift instance.

**Note:** Some OpenShift requirements are already being addressed in the K8s hardening work (kompose-02):
- Security contexts (runAsNonRoot) - helps with SCC
- Resource limits - needed for OpenShift quotas
- Image pinning - general best practice

---

## Areas to Investigate

### 1. Image Registry

Current manifests reference local images. Will need to determine:
- Which registry to use (OpenShift internal, external, or BuildConfig)
- How to handle image references in manifests
- Whether `imagePullPolicy: IfNotPresent` works or needs adjustment

### 2. Storage Class

PVC currently doesn't specify `storageClassName`. May need to:
- Check what storage classes are available (`oc get storageclass`)
- Add explicit storage class to `k8s/db-pvc.yaml`
- Verify volume permissions work with our containers

### 3. Security Context Constraints (SCC)

OpenShift has stricter security defaults than vanilla K8s. Potential issues:
- Containers may be blocked from running as root
- May need to add `securityContext` to deployments (already planned in kompose-02)
- Or may need SCC adjustments (less preferred)

### 4. External Access (Routes)

OpenShift uses Routes instead of Ingress. We have `k8s/openshift-route.yaml` (untested):
- Verify Route configuration works
- Check TLS termination settings
- Confirm service targeting is correct

### 5. Database Password

Already addressed in kompose-02 (manual secret creation). Should work the same way with `oc` instead of `kubectl`.

---

## Testing Approach

### Option 1: MicroShift in Docker (preferred)

```bash
docker run --rm -it --privileged \
  -v microshift-data:/var/lib \
  -p 6443:6443 -p 80:80 -p 443:443 \
  quay.io/microshift/microshift-aio:latest
```

- Simplest, no VM needed
- Clean teardown: `docker rm` + `docker volume rm`
- Need to verify ARM64 image availability

### Option 2: Vagrant + QEMU + MicroShift (fallback)

If Docker image doesn't work on ARM64:

```bash
vagrant plugin install vagrant-qemu
vagrant up    # Fedora VM + MicroShift
vagrant destroy  # Clean teardown
```

### Option 3: Hand off to infra

If local testing insufficient, hand over to infra team for real OpenShift cluster testing.

---

## Testing Steps

1. Try Option 1 (Docker MicroShift)
2. Deploy manifests, note what fails
3. Fix issues iteratively
4. If blocked, try Option 2 or hand off

---

## Open Questions

- ARM64 MicroShift image available?
- Any organization-specific requirements (image registry, network policies, etc.)?

---

## Reference

- `k8s/openshift-route.yaml` - Route manifest (untested)
- plans/done/kompose-01-review.md - General K8s security review
- plans/done/kompose-02-implementation.md - Hardening implementation plan
