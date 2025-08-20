import pandas as pd
import pyarrow.parquet as pq
from tqdm import tqdm
from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import DOUBLE_PRECISION, INTEGER, TEXT

# ---- config ----
PARQUET_PATH = "new_data/connectivity.pq"
TABLE_NAME   = "connectivity_table"
PG_URL       = "postgresql://user:password@localhost:5432/db"
CHUNKSIZE    = 100_000
SCHEMA       = "public"
# ---------------

engine = create_engine(PG_URL)

# Read parquet in batches
parquet_file = pq.ParquetFile(PARQUET_PATH)
for batch in tqdm(parquet_file.iter_batches()):
    df = batch.to_pandas()

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
    df["start_id"]   = pd.to_numeric(df["start_id"], errors="raise").astype("int64")
    df["end_id"]     = pd.to_numeric(df["end_id"], errors="raise").astype("int64")
    df["time_range"] = df["time_range"].astype("string")
    df["depth"]      = df["depth"].astype("string")
    df["weight"]     = pd.to_numeric(df["weight"], errors="raise").astype("float64")

    # Write to Postgres (append in chunks)
    df.to_sql(
        TABLE_NAME,
        engine,
        if_exists="append",
        index=False,
        dtype={
            "start_id": INTEGER,
            "end_id": INTEGER,
            "time_range": TEXT,
            "depth": TEXT,
            "weight": DOUBLE_PRECISION,
        },
        chunksize=CHUNKSIZE,
        schema=SCHEMA,
    )

# Create index (concurrently) and analyze after loading
with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
    conn.execute(text(f'''
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connect_dtr_inc
        ON "{SCHEMA}"."{TABLE_NAME}" (depth, time_range, start_id)
        INCLUDE (end_id, weight);
    '''))
    conn.execute(text(f'ANALYZE "{SCHEMA}"."{TABLE_NAME}";'))

print(f"Wrote df to {SCHEMA}.{TABLE_NAME} and ensured index + ANALYZE.")

