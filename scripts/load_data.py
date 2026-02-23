import pandas as pd
from pathlib import Path

def normalize_cols(df):
    df = df.copy()
    df.columns = [c.strip().upper() for c in df.columns]
    return df

def read_excel(path):
    path = Path(path)
    df = pd.read_excel(path)
    return normalize_cols(df)

def read_csv(path, parse_dates=None):
    path = Path(path)
    df = pd.read_csv(path, parse_dates=parse_dates)
    return normalize_cols(df)
