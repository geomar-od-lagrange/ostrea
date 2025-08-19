import pandas as pd

df = pd.read_parquet("new_data/connectivity.pq")
print(df.head())

