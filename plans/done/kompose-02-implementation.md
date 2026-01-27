# Kubernetes Hardening - Implementation Plan

Based on feedback from kompose-01-review.md.

**Instructions:** Review proposed changes. Add feedback in `YOUR FEEDBACK:` sections.

---

## Summary of Approved Changes

| Issue | Action |
|-------|--------|
| #1 Password | Random at deploy, document in README |
| #2 Resource limits | Implement for ~10 users |
| #3 Non-root | Implement security contexts |
| #4 Network policies | Implement |
| #6 PVC size | Increase to 10Gi |
| #8 Pin images | Pin all images |

**Skipped:** #5 (health checks), #7 (PDB), #9 (ingress), #10 (quotas)

---

## Task 1: Password Management

**Current:** Hardcoded `password` in `k8s/db-secret.yaml`

**Proposed:**
- Remove `k8s/db-secret.yaml` from repo (or keep as example only)
- Document manual secret creation in README:
  ```bash
  kubectl create secret generic db-secret \
    --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 16)
  ```
- No debug access to database needed

**YOUR FEEDBACK:**

OK

---

## Task 2: Resource Limits

**Current:** No limits on any deployment

**Proposed limits** (based on current data size, ~10 concurrent users):

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| api | 100m | 500m | 128Mi | 512Mi |
| frontend | 50m | 200m | 64Mi | 256Mi |
| nginx | 50m | 100m | 32Mi | 128Mi |
| db | 200m | 1000m | 256Mi | 1Gi |
| db-init | 100m | 500m | 256Mi | 512Mi |

**Rationale:**
- API: Moderate CPU for query processing, ~512Mi for Node.js + query results
- Frontend: Minimal, just serving static files
- nginx: Minimal, just proxying
- db: Higher limits for PostgreSQL with 17.8M rows, ~500MB data
- db-init: Temporary job, needs memory for data loading

**YOUR FEEDBACK:**

Limits seem tiny. Let's be more generous and if the admins complain, go tighter.

---

## Task 3: Non-root Security Contexts

**Current:** All containers run as root

**Proposed:** Add to all deployments/jobs:
```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      containers:
        - name: ...
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true  # where possible
```

**Notes:**
- May need to adjust Dockerfiles if containers expect root
- PostgreSQL image may need fsGroup for volume permissions
- Will test each container

**YOUR FEEDBACK:**

OK.

---

## Task 4: Network Policy

**Current:** All pods can communicate with all pods

**Proposed:** Create `k8s/network-policy.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-isolation
spec:
  podSelector:
    matchLabels:
      io.kompose.service: db
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              io.kompose.service: api
        - podSelector:
            matchLabels:
              io.kompose.service: db-init
      ports:
        - protocol: TCP
          port: 5432
```

**Effect:** Only api and db-init can connect to database on port 5432

**YOUR FEEDBACK:**

Not sure I'd do this at this stage. It may make it more difficult to migrate to openshift? I'd only harden networking on final system?

---

## Task 5: PVC Size

**Current:** 1Gi

**Proposed:** Change `k8s/db-pvc.yaml`:
```yaml
resources:
  requests:
    storage: 10Gi
```

**Note:** Existing PVC cannot be resized in place on most clusters. For existing deployments, need to delete and recreate PVC (loses data, requires re-init).

**YOUR FEEDBACK:**

Go 5Gi for now. This should also work for local testing.

---

## Task 6: Pin All Images

**Current state:**

| Image | Current | Proposed |
|-------|---------|----------|
| nginx | `nginx:alpine` | `nginx:1.27-alpine` |
| postgis | `postgis/postgis:16-3.4` | Already pinned |
| api | `2024_hex_dashboard-api:latest` | Keep (our image) |
| frontend | `2024_hex_dashboard-frontend:latest` | Keep (our image) |
| db-init | `2024_hex_dashboard-db-init:latest` | Keep (our image) |

**Note:** Our own images use `latest` which is fine - we control them. Only third-party images need pinning.

**YOUR FEEDBACK:**

OK

---

## Implementation Order

1. Pin nginx image (simple, low risk)
2. Increase PVC size (simple change)
3. Add resource limits (moderate complexity)
4. Add network policy (moderate complexity)
5. Add security contexts (higher complexity, may need testing)
6. Update README for password management (documentation)

**YOUR FEEDBACK on order:**

See comment on network policy.

---

## Questions

1. Should I implement all at once, or incrementally with testing between each?
2. For security contexts (#3), should I test locally first to ensure containers still work?
3. Should db-secret.yaml be deleted entirely, or kept as db-secret.yaml.example?

**YOUR ANSWERS:**

Combine simple steps. Test before and after more complex tasks? (eg 1 and 2 don't need testing in between.)