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

Use `scripts/build-images.sh`. Each image is tagged with both `latest` and the current short git SHA:

```bash
bash scripts/build-images.sh
# → ostrea-api-latest, ostrea-api-<sha>, ostrea-frontend-latest, ...
```

With an optional suffix for environment targeting:

```bash
bash scripts/build-images.sh --suffix test
# → ostrea-api-latest-test, ostrea-api-<sha>-test, ...

bash scripts/build-images.sh --suffix staging
# → ostrea-api-latest-staging, ostrea-api-<sha>-staging, ...
```

The suffix can also be passed via `SUFFIX` env var:

```bash
SUFFIX=test bash scripts/build-images.sh
```

See [oc-deploy.md](oc-deploy.md) for how to deploy with `--set image.tag=latest-staging`.

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
