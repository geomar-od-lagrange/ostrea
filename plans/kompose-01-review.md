# Kubernetes Deployment Review

**Instructions:** For each issue below, add your feedback/decisions in the `YOUR FEEDBACK:` section.
- Format doesn't matter - brief notes are fine
- Options: `YES` / `NO` / `SKIP` / `LATER` / `MODIFY: <your notes>`
- Priority changes: `CRITICAL → HIGH` or `HIGH → SKIP`, etc.

---

## Current State

Successfully converted from docker-compose to Kubernetes manifests using kompose.

### Components
- **nginx**: Reverse proxy (ClusterIP + port-forward for local access)
- **frontend**: React app (ClusterIP)
- **api**: Node.js/Express API (ClusterIP)
- **db**: PostgreSQL with persistent storage (ClusterIP)
- **db-init**: One-time Job for database initialization

### What Works
✅ Complete application stack deploys successfully
✅ Database persistence via PVC
✅ Secrets properly separated from ConfigMaps
✅ Internal DNS resolution (service-to-service communication)
✅ Database initialization is idempotent (completion marker pattern)
✅ Full image names prevent tag collisions

## Security Issues (For Production)

### 🔴 Critical

1. **Hardcoded database password** (k8s/db-secret.yaml:9)
   - Currently: `password`
   - Fix: Use external secret management (SealedSecrets, External Secrets Operator, Vault)
   - OpenShift: Can use built-in secret encryption at rest

**YOUR FEEDBACK:**

Is there a default secret manager that works across k8s dists? Or do we just randomly create passwords we distribute as env vars when app is deployed? I'm not sure we need debug access to the database at all. And if so, we can still just override the credentials?

2. **No resource limits**
   - All deployments missing `resources.limits` and `resources.requests`
   - Risk: Resource exhaustion, noisy neighbor problems
   - Fix: Add CPU/memory limits to all deployments

**YOUR FEEDBACK:**

Let's set limits explicitly which make sense for the current size of the data? How much overhead do we need? Assume there won't be more than 10 users interacting with the frontend.

3. **Containers run as root**
   - No `securityContext.runAsNonRoot: true`
   - No `securityContext.runAsUser` set
   - Fix: Add security contexts, use non-root users

**YOUR FEEDBACK:**

Go for non-root users.

4. **No network policies**
   - All pods can talk to all pods
   - Fix: Restrict db to only accept connections from api/db-init

**YOUR FEEDBACK:**

Yes, fix as recommended.

### 🟡 Medium

5. **Missing health checks**
   - Only db-deployment has livenessProbe
   - api, frontend, nginx missing readiness/liveness probes
   - Impact: Slower rollouts, traffic to unhealthy pods

**YOUR FEEDBACK:**

Not sure. Just logging and not having explict dependencies b/w api and frontend and db seems OK for me.

6. **PVC too small for production**
   - Currently: 1Gi (k8s/db-pvc.yaml:12)
   - Current usage: ~500MB for 17.8M rows
   - Recommendation: 10Gi+ for growth

**YOUR FEEDBACK:**

10 Gi probably never met. But go for it.

7. **No pod disruption budgets**
   - Single replica for everything
   - No PDBs to ensure availability during maintenance

**YOUR FEEDBACK:**

Ignore maintenance. This is not critical. Single replica is fine for now.

8. **nginx image not pinned**
   - Uses `nginx:alpine` (k8s/nginx-deployment.yaml:26)
   - Should pin: `nginx:1.25-alpine` or specific SHA

**YOUR FEEDBACK:**

Pin. Check all images for pins again.

### 🟢 Low

9. **No ingress controller**
   - Currently using port-forward (local only)
   - For production: Need Ingress resource

**YOUR FEEDBACK:**

Already noted for openshift, right?

10. **No resource quotas/limits**
    - No namespace-level quotas
    - Could consume entire cluster

**YOUR FEEDBACK:**

SKIP
