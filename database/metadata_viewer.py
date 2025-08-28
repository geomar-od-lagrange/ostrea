import pandas as pd

df = pd.read_json('./new_data/meta.json')

print(df["disease"].nlargest(10))
