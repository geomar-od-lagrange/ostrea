#!/usr/bin/env python3
"""Load hexagon geometries from GeoJSON into database."""
from hex_db_loader import get_db_engine, load_geojson

if __name__ == "__main__":
    engine = get_db_engine()
    gdf = load_geojson(engine)
    print(gdf)
