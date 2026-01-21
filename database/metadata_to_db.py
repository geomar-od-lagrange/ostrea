#!/usr/bin/env python3
"""Load metadata from JSON into database."""
from hex_db_loader import get_db_engine, load_metadata

if __name__ == "__main__":
    engine = get_db_engine()
    df = load_metadata(engine)
    print(f"Loaded {len(df)} metadata records")

