#!/usr/bin/env python3
"""
Smart database initialization script.
Checks if tables already exist and only loads data if needed.
"""
import os
import sys
from sqlalchemy import create_engine, inspect

# Get connection parameters from environment
POSTGRES_USER = os.getenv('POSTGRES_USER')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD')
DB_HOST = os.getenv('DB_HOST', 'db')

if not POSTGRES_USER or not POSTGRES_PASSWORD:
    print("❌ ERROR: POSTGRES_USER and POSTGRES_PASSWORD must be set")
    sys.exit(1)

# Connect to database
ENGINE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{DB_HOST}:5432/db"
print(f"🔗 Connecting to database at {DB_HOST}...")

try:
    engine = create_engine(ENGINE_URL)
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    # Check if data already exists
    if 'geo_table' in existing_tables and 'metadata_table' in existing_tables and 'connectivity_table' in existing_tables:
        print("✅ Database already initialized. Tables found:")
        print(f"   - geo_table")
        print(f"   - metadata_table")
        print(f"   - connectivity_table")
        print("⏭️  Skipping initialization.")
        sys.exit(0)

    # Data doesn't exist, initialize it
    print("🔄 Database is empty. Starting initialization...")
    print()

    # Load geo data
    if 'geo_table' not in existing_tables:
        print("📍 Loading hexagon geometries...")
        exec(open('geojson_to_db.py').read())
        print("✅ Hexagon geometries loaded")
        print()
    else:
        print("⏭️  geo_table already exists, skipping")

    # Load metadata
    if 'metadata_table' not in existing_tables:
        print("📊 Loading metadata...")
        exec(open('metadata_to_db.py').read())
        print("✅ Metadata loaded")
        print()
    else:
        print("⏭️  metadata_table already exists, skipping")

    # Load connectivity data
    if 'connectivity_table' not in existing_tables:
        print("🔗 Loading connectivity data (this takes ~3 minutes)...")
        exec(open('connectivity_to_db.py').read())
        print("✅ Connectivity data loaded")
        print()
    else:
        print("⏭️  connectivity_table already exists, skipping")

    print("🎉 Database initialization complete!")

except Exception as e:
    print(f"❌ ERROR during initialization: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
