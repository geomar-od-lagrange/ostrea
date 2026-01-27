# OYSTERS

Visualization of simulated oyster larval dispersal connectivity in the North Sea.

## Quick Start

Clone and enter the repository:

```bash
$ git clone https://github.com/geomar-od-lagrange/2024_hex_dashboard.git
$ cd 2024_hex_dashboard
```

Create environment file from example:

```bash
$ cp .env.example .env
```

Build and run (database auto-initializes):

```bash
$ docker compose build
$ docker compose up
```

Open http://localhost:5173/ in your browser.

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
├── nginx/                  # Reverse proxy config
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
$ docker compose up
```

Background mode:

```bash
$ docker compose up -d
$ docker compose logs -f
$ docker compose down
$ docker compose down -v  # also removes volumes
```

### Database Loaders

The database initializes automatically. For manual data loading:

```bash
$ cd database
$ pixi run python -m hex_db_loader.connectivity
$ pixi run python -m hex_db_loader.geojson
$ pixi run python -m hex_db_loader.metadata
```

## License

MIT License. See [LICENSE](LICENSE).

## Contributors

- Willi Rath ([@willirath](https://github.com/willirath))
- Ingmar Eissfeldt ([@IngmarEissfeldt](https://github.com/ingmareissfeldt))
- Felix Kirch ([@felixkirch](https://github.com/felixkirch))
