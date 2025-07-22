import json
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import FLOAT, INTEGER

with open("geojsons/connectivity.json", "r") as f:
    connectivity = json.load(f)

records = []
for start_id, conn in connectivity.items():
    for end_id, wgt in conn.items():
        records.append({"start_id": int(start_id), "end_id": int(end_id), "weight": wgt})

df = pd.DataFrame(records)

engine = create_engine("postgresql://user:password@localhost:5432/db")

df.to_sql(
    "connectivity_table",     
    engine,
    if_exists="replace",
    index=False,
    dtype={
        "start_id": INTEGER,
        "end_id": INTEGER,
        "weight": FLOAT
    }
)

print(f"Wrote {len(df)} rows to connectivity_table")

