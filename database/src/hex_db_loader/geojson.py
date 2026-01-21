"""GeoJSON hexagon data loading."""
import geopandas as gpd
from pathlib import Path
from .config import GEO_TABLE_NAME


def load_geojson(engine, data_path=None):
    """Load hexagon geometries from GeoJSON file into database.

    Args:
        engine: SQLAlchemy engine instance
        data_path: Path to GeoJSON file (default: data/hexes.geojson)

    Returns:
        GeoDataFrame: Loaded and verified data
    """
    if data_path is None:
        data_path = Path(__file__).parent.parent.parent / "data" / "hexes.geojson"
    else:
        data_path = Path(data_path)

    # Load GeoJSON
    gdf = gpd.read_file(data_path)

    # Set coordinate reference system
    gdf.set_crs(epsg=4326, inplace=True)

    # Write to database
    gdf.to_postgis(GEO_TABLE_NAME, engine, if_exists="replace", index=False)

    # Verify by reading back
    gdf_verify = gpd.read_postgis(GEO_TABLE_NAME, engine, "geometry")

    return gdf_verify
