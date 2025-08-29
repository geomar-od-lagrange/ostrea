# Project Title

Visalizer for particle flow in the north sea

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [License](#license)

## Installation for linux ubuntu
Download [docker desktop](https://docs.docker.com/desktop/setup/install/linux/) 

```bash
#Download python 3.10 or above
sudo apt install -y python3 python3-pip

# Clone the repo
git clone https://github.com/geomar-od-lagrange/2024_hex_dashboard/tree/better_docker_architecture

#Install required python packages
pip install requirements.txt

# Go into the project directory
cd better_docker_architecture

#Start up the docker engine through your app browser (the desktop UI can be closed)

# Start the docker
docker compose build
docker compose up

#Insert the data into the database
python database/metadata_to_db.py
python database/geojson_to_db.py
python database/connectivity_to_db.py #(might take a few minutes)
```

## Usage

Examples of how to run or use your project:

```bash
# Start the container
docker compose up
```

Then http://localhost:5173/ in the browser of your choice

```bash
# To turn off the docker compose
docker compose down

#To apply any code changes
docker compose build
```


## Contributing
(Optional if open source)
1. Fork the repo
2. Create a new branch (`git checkout -b feature-foo`)
3. Commit changes (`git commit -m "Add foo"`)
4. Push (`git push origin feature-foo`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Credits / Acknowledgements

- Libraries used
- Inspiration / references
- Contributors
