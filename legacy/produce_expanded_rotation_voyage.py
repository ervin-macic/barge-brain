import pandas as pd

pd.set_option('display.max_columns', 200)

# Load
dfR = pd.read_excel("data/dfRotation.xlsx")
dfV = pd.read_excel("data/dfVoyage.xlsx")

# Normalize headers
dfR.columns = [c.strip().upper() for c in dfR.columns]
dfV.columns = [c.strip().upper() for c in dfV.columns]

# Join keys
dfR['SEQ_STR'] = dfR['SEQ'].astype(str)
dfV['EXTERNALCODE_STR'] = dfV['EXTERNALCODE'].astype(str).str.replace(r'\.0$', '', regex=True)

# Merge rotation -> voyage
merged = dfR.merge(
    dfV,
    left_on='SEQ_STR',
    right_on='EXTERNALCODE_STR',
    how='left',
    suffixes=('_ROT','_VOY')
)

# --------------------------------------------------
# Helper to combine DATE + TIME columns correctly
# --------------------------------------------------

def combine_date_time(date_series, time_series):
    """
    Safely combine a date (datetime or date) series and a time series that may contain:
      - strings like '1400' or '14:00'
      - numeric values like 1400.0 or 900.0
      - NaN / None
    Returns a pandas Series of timezone-aware UTC timestamps (pd.Timestamp) or NaT.
    """
    import math
    dates = pd.to_datetime(date_series, utc=True, errors='coerce')

    combined = []
    # iterate elementwise; handling mixed types robustly
    for d, t in zip(dates, time_series):
        if pd.isna(d):
            combined.append(pd.NaT)
            continue

        # Normalize t to a zero-padded 4-digit string or None
        if pd.isna(t):
            time_str = None
        else:
            # If it's a float or int, convert to int first (e.g. 1400.0 -> 1400)
            try:
                if isinstance(t, float) or isinstance(t, int):
                    if math.isnan(t):
                        time_str = None
                    else:
                        t_int = int(t)
                        time_str = f"{t_int:04d}"
                else:
                    # t is str-like
                    t_s = str(t).strip()
                    # if already in 'HH:MM' form, use it directly
                    if ':' in t_s:
                        time_str = t_s
                    else:
                        # remove any decimal .0 if present then zfill
                        t_s = t_s.split('.')[0]
                        time_str = t_s.zfill(4)
            except Exception:
                time_str = None

        if time_str is None:
            combined.append(d)      # fallback to date-only (keep date as-is)
        else:
            # If time_str contains ':', assume it's HH:MM; else it's HHMM
            if ':' in time_str:
                fmt_time = time_str
            else:
                fmt_time = time_str[:2] + ":" + time_str[2:4]
            try:
                combined.append(pd.to_datetime(f"{d.date()} {fmt_time}", utc=True, errors='coerce'))
            except Exception:
                combined.append(pd.NaT)

    return pd.Series(combined)
# --------------------------------------------------
# Build voyage-level leg datetimes
# --------------------------------------------------

merged['LEG_DEPART_DT'] = combine_date_time(
    merged['DEPDATE'],
    merged['DEPTIME']
)

merged['LEG_ARRIVE_DT'] = combine_date_time(
    merged['ARRDATE'],
    merged['ARRTIME']
)

# --------------------------------------------------
# Keep useful columns
# --------------------------------------------------

expanded = merged[[
    'SEQ',
    'BARGE_ROT',
    'CODE',           # voyage code (DEC0074 etc)
    'IE',
    'PORT_FROM',
    'PORT_TO',
    'LEG_DEPART_DT',
    'LEG_ARRIVE_DT',
    'SCOPEINLOCATION',
    'SCOPEOUTLOCATION'
]].copy()

expanded = expanded.sort_values(['BARGE_ROT', 'LEG_DEPART_DT'])

expanded.to_csv("rotation_voyage_expanded.csv", index=False)

print("✔ Created rotation_voyage_expanded.csv")
print("Rows:", len(expanded))
print(expanded.head(10))
