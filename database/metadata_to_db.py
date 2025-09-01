import pandas as pd
from sqlalchemy import create_engine

import os

POSTGRES_USER = os.environ["POSTGRES_USER"]
POSTGRES_PASSWORD = os.environ["POSTGRES_PASSWORD"]

ENGINE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@localhost:5432/db"  
TABLE = "metadata_table"                                                  
FILE = "./data/meta.json"                                      

engine = create_engine(ENGINE_URL)
df = pd.read_json(FILE)
df.to_sql(TABLE, engine, if_exists="append", index=False, method="multi")

