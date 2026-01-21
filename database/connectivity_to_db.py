#!/usr/bin/env python3
"""Load connectivity data from Parquet into database."""
from hex_db_loader import get_db_engine, load_connectivity, CONNECTIVITY_TABLE_NAME, SCHEMA

if __name__ == "__main__":
    engine = get_db_engine()
    load_connectivity(engine)
    print(f"Wrote data to {SCHEMA}.{CONNECTIVITY_TABLE_NAME} and ensured index + ANALYZE.")

