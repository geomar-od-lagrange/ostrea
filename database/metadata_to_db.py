import pandas as pd
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

ENGINE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{DB_HOST}:5432/db"  
TABLE = "metadata_table"                                                  
FILE = "./data/meta.json"                                      

engine = create_engine(ENGINE_URL)
df = pd.read_json(FILE)
df.to_sql(TABLE, engine, if_exists="append", index=False, method="multi")

