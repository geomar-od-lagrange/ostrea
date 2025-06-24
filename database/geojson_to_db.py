import geopandas as gpd
from sqlalchemy import create_engine

engine = create_engine("postgresql://user:password@localhost:5432/db")

gdf = gpd.read_file("geojsons/test.geojson")

gdf.set_crs(epsg=4326, inplace=True)

gdf.to_postgis("geo_table", engine, if_exists="replace", index=False)

print(gdf)

gdf2 = gpd.read_postgis("geo_table", engine, "geometry")

print(gdf2)
