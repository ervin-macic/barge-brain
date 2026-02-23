import pandas as pd, math

def combine_date_time(date_series, time_series):
    """Return Series of timezone-aware pd.Timestamp or NaT."""
    dates = pd.to_datetime(date_series, utc=True, errors='coerce')
    out = []
    for d, t in zip(dates, time_series):
        if pd.isna(d):
            out.append(pd.NaT)
            continue
        if pd.isna(t):
            out.append(d)
            continue
        # normalize t
        try:
            if isinstance(t, (float, int)):
                if math.isnan(t):
                    out.append(d); continue
                t_int = int(t); t_s = f"{t_int:04d}"
            else:
                t_s = str(t).strip()
                if '.' in t_s:
                    t_s = t_s.split('.')[0]
            if ':' in t_s:
                hhmm = t_s
            else:
                t_s = t_s.zfill(4)
                hhmm = t_s[:2] + ":" + t_s[2:4]
            out.append(pd.to_datetime(f"{d.date()} {hhmm}", utc=True, errors='coerce'))
        except Exception:
            out.append(pd.NaT)
    return pd.Series(out, index=date_series.index)

def safe_count_by(group_df, key_col, id_columns_candidates=None):
    """Return DataFrame with key_col -> count. If an id column exists, count unique ids; otherwise count rows."""
    if id_columns_candidates is None:
        id_columns_candidates = ['CNTR','UNIT','CONTAINER','CONTAINERID','CNTRID','UNITID']
    id_col = next((c for c in id_columns_candidates if c in group_df.columns), None)
    if id_col:
        return group_df.groupby(key_col)[id_col].nunique().reset_index(name='COUNT')
    else:
        return group_df.groupby(key_col).size().reset_index(name='COUNT')
