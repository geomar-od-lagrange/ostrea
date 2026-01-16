import geopandas as gpd
from sqlalchemy import create_engine
import os
import yaml

# Try environment variables first (Docker), fall back to .env file (local dev)
POSTGRES_USER = os.getenv('POSTGRES_USER')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'localhost')

if not POSTGRES_USER or not POSTGRES_PASSWORD:
    with open("../.env", mode="r") as f:
        _env = yaml.safe_load(f)
    POSTGRES_USER = _env["POSTGRES_USER"]
    POSTGRES_PASSWORD = _env["POSTGRES_PASSWORD"]

engine = create_engine(f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{DB_HOST}:5432/db")

gdf = gpd.read_file("data/hexes.geojson")

gdf.set_crs(epsg=4326, inplace=True)

gdf.to_postgis("geo_table", engine, if_exists="replace", index=False)

print(gdf)

gdf2 = gpd.read_postgis("geo_table", engine, "geometry")

print(gdf2)
