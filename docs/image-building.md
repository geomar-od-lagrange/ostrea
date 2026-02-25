# Building and Pushing Container Images

All component images are pushed to a single repository on Quay.io, distinguished by tag:

**Registry:** `quay.io/willirath/ostrea`

| Component | Tag | Dockerfile | Build context |
|-----------|-----|------------|---------------|
| API | `ostrea-api-latest` | `api/Dockerfile` | `api/` |
| Frontend | `ostrea-frontend-latest` | `frontend/Dockerfile` | `frontend/` |
| Database (PostGIS) | `ostrea-db-latest` | `database/Dockerfile.postgis-fedora` | `database/` |
| DB init | `ostrea-db-init-latest` | `database/init/Dockerfile` | `database/` |

## Prerequisites

- Docker with multi-platform support (buildx)
- Write access to `quay.io/willirath/ostrea`

```bash
docker login quay.io
```

## Build and push all images

Each image is tagged with both `latest` and the current short git SHA:

```bash
REPO=quay.io/willirath/ostrea
GIT_REF=$(git rev-parse --short HEAD)

for component_args in \
  "ostrea-api api/" \
  "ostrea-frontend frontend/" \
  "ostrea-db -f database/Dockerfile.postgis-fedora database/" \
  "ostrea-db-init -f database/init/Dockerfile database/"
do
  set -- $component_args
  NAME=$1; shift
  docker build --platform linux/amd64,linux/arm64 \
    -t $REPO:${NAME}-latest \
    -t $REPO:${NAME}-${GIT_REF} \
    --push "$@"
done
```

## Helm chart integration

The chart pulls from the same registry via `image.repository` and `image.tag` in `values.yaml`:

```yaml
image:
  repository: quay.io/willirath/ostrea
  tag: latest        # or a short git SHA like "abc1234"
  pullPolicy: Always
```

To deploy a pinned version:

```bash
helm upgrade ostrea ./helm/ostrea --set image.tag=abc1234
```

No registry changes needed between local (kind/MicroShift) and production (OpenShift) — all environments pull from Quay.io.
