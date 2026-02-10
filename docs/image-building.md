# Building and Pushing Container Images

All component images are pushed to a single repository on Quay.io, distinguished by tag:

**Registry:** `quay.io/willirath/ostrea`

| Component | Tag | Dockerfile | Build context |
|-----------|-----|------------|---------------|
| API | `ostrea-api-latest` | `api/Dockerfile` | `api/` |
| Frontend | `ostrea-frontend-latest` | `frontend/Dockerfile` | `frontend/` |
| Database (PostGIS) | `ostrea-db-latest` | `database/Dockerfile.postgis-fedora` | `database/` |
| DB init | `ostrea-db-init-latest` | `database/init/Dockerfile` | `database/init/` |

## Prerequisites

- Docker with multi-platform support (buildx)
- Write access to `quay.io/willirath/ostrea`

```bash
docker login quay.io
```

## Build and push all images

```bash
REPO=quay.io/willirath/ostrea

docker build --platform linux/amd64,linux/arm64 -t $REPO:ostrea-api-latest --push api/
docker build --platform linux/amd64,linux/arm64 -t $REPO:ostrea-frontend-latest --push frontend/
docker build --platform linux/amd64,linux/arm64 -f database/Dockerfile.postgis-fedora -t $REPO:ostrea-db-latest --push database/
docker build --platform linux/amd64,linux/arm64 -t $REPO:ostrea-db-init-latest --push database/init/
```

## Helm chart integration

The chart pulls from the same registry via `image.repository` in `values.yaml`:

```yaml
image:
  repository: quay.io/willirath/ostrea
  pullPolicy: Always
```

No registry changes needed between local (kind/MicroShift) and production (OpenShift) — all environments pull from Quay.io.
