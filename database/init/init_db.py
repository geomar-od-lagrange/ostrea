#!/usr/bin/env python3
"""
Smart database initialization script.
Checks if tables already exist and only loads data if needed.
"""
import sys
import logging
from sqlalchemy import inspect
from hex_db_loader import (
    get_db_engine,
    load_geojson,
    load_metadata,
    load_connectivity,
    GEO_TABLE_NAME,
    METADATA_TABLE_NAME,
    CONNECTIVITY_TABLE_NAME,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    # Connect to database
    logger.info("Connecting to database...")
    engine = get_db_engine()
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # Check if data already exists
    required_tables = [GEO_TABLE_NAME, METADATA_TABLE_NAME, CONNECTIVITY_TABLE_NAME]
    if all(table in existing_tables for table in required_tables):
        logger.info("Database already initialized. Tables found:")
        for table in required_tables:
            logger.info(f"  - {table}")
        logger.info("Skipping initialization.")
        sys.exit(0)

    # Data doesn't exist, initialize it
    logger.info("Database is empty. Starting initialization...")

    # Load geo data
    if GEO_TABLE_NAME not in existing_tables:
        logger.info("Loading hexagon geometries...")
        gdf = load_geojson(engine)
        logger.info(f"Hexagon geometries loaded: {len(gdf)} features")
    else:
        logger.info(f"{GEO_TABLE_NAME} already exists, skipping")

    # Load metadata
    if METADATA_TABLE_NAME not in existing_tables:
        logger.info("Loading metadata...")
        df = load_metadata(engine)
        logger.info(f"Metadata loaded: {len(df)} records")
    else:
        logger.info(f"{METADATA_TABLE_NAME} already exists, skipping")

    # Load connectivity data
    if CONNECTIVITY_TABLE_NAME not in existing_tables:
        logger.info("Loading connectivity data (this takes ~3 minutes)...")
        load_connectivity(engine)
        logger.info("Connectivity data loaded with index and ANALYZE")
    else:
        logger.info(f"{CONNECTIVITY_TABLE_NAME} already exists, skipping")

    logger.info("Database initialization complete!")

except Exception as e:
    logger.error(f"ERROR during initialization: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
