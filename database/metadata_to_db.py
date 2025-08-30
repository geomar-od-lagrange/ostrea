import pandas as pd
from sqlalchemy import create_engine

ENGINE_URL = "postgresql://user:password@localhost:5432/db"  
TABLE = "metadata_table"                                                  
FILE = "./new_data/meta.json"                                      

engine = create_engine(ENGINE_URL)
df = pd.read_json(FILE)
df.to_sql(TABLE, engine, if_exists="append", index=False, method="multi")

