import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import FLOAT, INTEGER, TEXT

# ---- config ----
PARQUET_PATH = "new_data/connectivity.pq"
TABLE_NAME   = "connectivity_table"
PG_URL       = "postgresql://user:password@localhost:5432/db"
CHUNKSIZE    = 100_000
# ---------------

# Read parquet
df = pd.read_parquet(PARQUET_PATH)

# Keep/rename only the expected columns (case-insensitive safety)
cols_map = {c.lower(): c for c in df.columns}
required = ["start_id", "end_id", "time", "depth", "weight"]
missing = [c for c in required if c not in cols_map]
if missing:
    raise ValueError(f"Parquet missing required columns: {missing}. Found: {list(df.columns)}")

df = df[[cols_map[c] for c in required]].copy()
df.columns = required  # normalize column names exactly

df = df.rename(columns={"time": "time_range"})

# Enforce dtypes
df["start_id"]       = pd.to_numeric(df["start_id"], errors="raise").astype("int64")
df["end_id"]         = pd.to_numeric(df["end_id"], errors="raise").astype("int64")
df["time_range"]     = df["time_range"].astype("string")
df["depth"]          = df["depth"].astype("string")
df["weight"]         = pd.to_numeric(df["weight"], errors="raise").astype("float64")

# Write to Postgres
engine = create_engine(PG_URL)
df.to_sql(
    TABLE_NAME,
    engine,
    if_exists="replace",
    index=False,
    dtype={
        "start_id": INTEGER,
        "end_id": INTEGER,
        "time_range": TEXT,
        "depth": TEXT,
        "weight": FLOAT,
    },
    chunksize=CHUNKSIZE,
)

print(
    f"Wrote {len(df)} rows to {TABLE_NAME} "
    f"(start_ids={df['start_id'].nunique()}, end_ids={df['end_id'].nunique()})"
)

