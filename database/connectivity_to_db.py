import json
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB, INTEGER

# 1) Load the JSON file
with open("geojsons/connectivity.json", "r") as f:
    connectivity = json.load(f)

# 2) Prepare records: one row per outer key
#    Convert keys to ints if you want id as integer
records = [
    {"id": int(outer_key), "connectivity": inner_dict}
    for outer_key, inner_dict in connectivity.items()
]

# 3) Make a DataFrame
df = pd.DataFrame(records)

# 4) Connect to your database
engine = create_engine("postgresql://user:password@localhost:5432/db")

# 5) Write to SQL with explicit types
df.to_sql(
    "connectivity_table",     # target table name
    engine,
    if_exists="replace",      # drop+recreate
    index=False,
    dtype={
        "id": INTEGER,
        "connectivity": JSONB
    }
)

print(f"Wrote {len(df)} rows to connectivity_table")

