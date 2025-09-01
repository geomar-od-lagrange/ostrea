import pandas as pd
from sqlalchemy import create_engine

import yaml

with open("../.env", mode="r") as f:
    _env = yaml.safe_load(f)
POSTGRES_USER = _env["POSTGRES_USER"]
POSTGRES_PASSWORD = _env["POSTGRES_PASSWORD"]

ENGINE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@localhost:5432/db"  
TABLE = "metadata_table"                                                  
FILE = "./data/meta.json"                                      

engine = create_engine(ENGINE_URL)
df = pd.read_json(FILE)
df.to_sql(TABLE, engine, if_exists="append", index=False, method="multi")

