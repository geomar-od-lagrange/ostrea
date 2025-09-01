# OYSTERS

Visualization of simulated Oyster pathogen dispersal in the North Sea.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [License](#license)

## Installation

### Prerequisites

1. Ensure that Docker is installed, e.g., by installing [Docker Desktop](https://docs.docker.com/desktop/setup/install/linux/).

2. Ensure you have a Python installation (e.g. via Micromamba or via the OS). In Ubuntu Linux, you can run
```bash
sudo apt update
sudo apt install -y python3 python3-pip
```

### Getting the app code and starting the app

Make sure the docker engine is running, e.g., through your app browser (the desktop UI can be closed).

```bash
# Clone the repo and change to dir
git clone https://github.com/geomar-od-lagrange/2024_hex_dashboard.git
cd 2024_hex_dashboard

# Start the containers
docker compose build
docker compose up
```

### Fill up the database

```bash
# change to database dir
cd database
pip install -r requirements.txt

# insert the data
python metadata_to_db.py
python geojson_to_db.py
python connectivity_to_db.py  # (might take a few minutes)
```

### Using the app

Connect to http://localhost:5173/ in the browser of your choice.

### Shutting down and restarting

Stop the app with:
```bash
# from within the main project directory
docker compose down
```

Apply code changes and restart:
```bash
# from within the main project directory
docker compose build
docker compose up
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

## Credits / Acknowledgements

- See [database/requirements.txt](database/requirements.txt) for used python libraries. Deckgl and maplibre for the frondend.
- Contributors: Ingmar Eissfeldt (@IngmarEissfeldt), Willi Rath (@willirath), Felix Kirch (@felixkirch)
