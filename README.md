# OSTREA

Oyster Spatio-Temporal Dispersal Atlas - Visualization of simulated oyster larval dispersal connectivity in the North Sea.

![Screenshot](images/ostrea.png)

## Quick Start

### Docker Compose (Recommended for Local Development)

Clone and enter the repository:

```bash
git clone https://github.com/geomar-od-lagrange/2024_hex_dashboard.git
cd 2024_hex_dashboard
```

Create environment file from example:

```bash
cp .env.example .env
```

Build and run (database auto-initializes):

```bash
docker compose build
docker compose up
```

Open http://localhost:5173/ in your browser.

### Kubernetes (kind)

The Helm chart supports vanilla Kubernetes using [kind](https://kind.sigs.k8s.io/). An nginx proxy handles `/api` routing.

```bash
kind create cluster --name ostrea
docker compose build
kind load docker-image ostrea-api:latest ostrea-frontend:latest ostrea-db-init:latest --name ostrea
kubectl create namespace ostrea
kubectl create secret generic db-secret \
  --from-literal=POSTGRES_USER=user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=POSTGRES_DB=db \
  -n ostrea
helm template ostrea ./helm/ostrea --namespace ostrea | kubectl apply --namespace ostrea -f -
kubectl port-forward -n ostrea svc/nginx 5173:8080
```

Open http://localhost:5173/

For detailed instructions, see [docs/kind-deployment-test.md](docs/kind-deployment-test.md).

### Kubernetes (OpenShift)

The Helm chart also supports OpenShift clusters using Routes for ingress (`--set openshift=true`).

```bash
kubectl create namespace ostrea
kubectl create secret generic db-secret \
  --from-literal=POSTGRES_USER=user \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 24) \
  --from-literal=POSTGRES_DB=db \
  -n ostrea
helm template ostrea ./helm/ostrea --namespace ostrea \
  --set openshift=true \
  --set registry=<registry>/ \
  | kubectl apply --namespace ostrea -f -
```

For local OpenShift testing with MicroShift, see [docs/microshift-deployment-test.md](docs/microshift-deployment-test.md).

## Project Structure

```
.
├── api/                    # Node.js/Express API server
├── database/
│   ├── data/               # Processed data (parquet, geojson, json)
│   │   └── source/         # Original data + processing notebook
│   ├── init/               # Database init container
│   └── src/hex_db_loader/  # Python data loading package
├── frontend/               # React + deck.gl + MapLibre frontend
├── helm/ostrea/            # Helm chart for Kubernetes/OpenShift
├── images/                 # Screenshots
├── security/               # CVE scan results
├── volumes/                # Docker volumes (gitignored)
├── .env                    # Environment variables (gitignored)
├── .env.example            # Environment template
└── docker-compose.yml
```

## Development

### Prerequisites

- Docker (via [Docker Desktop](https://docs.docker.com/desktop/) or CLI)
- [pixi](https://pixi.sh/) (for Python development in `database/`)

### Running Locally

Foreground mode with live logs (Ctrl+C to stop):

```bash
docker compose up
```

Background mode:

```bash
docker compose up -d
docker compose logs -f
docker compose down
docker compose down -v  # also removes volumes
```

### Database Loaders

The database initializes automatically. For manual data loading:

```bash
cd database
pixi run python -m hex_db_loader.connectivity
pixi run python -m hex_db_loader.geojson
pixi run python -m hex_db_loader.metadata
```

## License

MIT License. See [LICENSE](LICENSE).

## Contributors

- Willi Rath ([@willirath](https://github.com/willirath))
- Ingmar Eissfeldt ([@IngmarEissfeldt](https://github.com/ingmareissfeldt))
- Felix Kirch ([@felixkirch](https://github.com/felixkirch))
- Lara Schmittmann ([@laraschmittmann](https://github.com/laraschmittmann))
