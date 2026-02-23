import pandas as pd
import sys

pd.set_option('display.max_columns', 200)

def load(path):
    try:
        return pd.read_excel(path)
    except Exception as e:
        print(f"Failed to read {path}: {e}", file=sys.stderr)
        raise

# Load
dfR = load("data/dfRotation.xlsx")
dfB = load("data/dfBarge.xlsx")
dfV = load("data/dfVoyage.xlsx")

# Normalize column names: strip whitespace and uppercase for robust merges
def norm_cols(df):
    df = df.copy()
    df.columns = [str(c).strip().upper() for c in df.columns]
    return df

dfR = norm_cols(dfR)
dfB = norm_cols(dfB)
dfV = norm_cols(dfV)

print("dfRotation columns:", list(dfR.columns))
print("dfBarge columns:   ", list(dfB.columns))
print("dfVoyage columns:  ", list(dfV.columns))

# Quick sanity checks
required_R = {'SEQ'}
required_V = {'EXTERNALCODE'}
required_B = {'CODE'}

missing = []
if not required_R.issubset(set(dfR.columns)):
    missing.append(("dfRotation", required_R - set(dfR.columns)))
if not required_V.issubset(set(dfV.columns)):
    missing.append(("dfVoyage", required_V - set(dfV.columns)))
if not required_B.issubset(set(dfB.columns)):
    missing.append(("dfBarge", required_B - set(dfB.columns)))
if missing:
    print("Missing required columns:", missing)
    print("Aborting. Fix the column names or update the script to use the correct names.")
    sys.exit(2)

# Prepare join keys as strings
dfR['SEQ_STR'] = dfR['SEQ'].astype(str)
# clean EXTERNALCODE if it's numeric with .0
dfV['EXTERNALCODE_STR'] = dfV['EXTERNALCODE'].astype(str).str.replace(r'\.0$', '', regex=True)

# Combine rotation date+time fields into datetimes (defensive)
def combine_datetime(df, date_col, time_col):
    # if date column missing return NaT column
    if date_col not in df.columns:
        return pd.Series(pd.NaT, index=df.index)
    dates = pd.to_datetime(df[date_col], utc=True, errors='coerce')
    if time_col in df.columns:
        times = df[time_col].astype(str).str.zfill(4).where(df[time_col].notna(), None)
    else:
        times = pd.Series([None]*len(df), index=df.index)
    out = []
    for d, t in zip(dates, times):
        if pd.isna(d):
            out.append(pd.NaT)
        else:
            if not t:
                out.append(d)
            else:
                # '1400' -> '14:00', allow '14:00' too
                try:
                    time_str = t if ':' in str(t) else (str(t)[:2] + ':' + str(t)[2:])
                    out.append(pd.to_datetime(f"{d.date()} {time_str}", utc=True, errors='coerce'))
                except Exception:
                    out.append(d)
    return pd.Series(out, index=df.index)

# Heuristic names seen in your files
dfR['PLANNED_IN_DT']  = combine_datetime(dfR, 'PLANNEDSCOPEINDATE', 'PLANNEDSCOPEINTIME')
dfR['PLANNED_OUT_DT'] = combine_datetime(dfR, 'PLANNEDSCOPEOUTDATE', 'PLANNEDSCOPEOUTTIME')

# If those heuristics didn't find datetimes, try generic 'EDATE'/'ETIME'
if dfR['PLANNED_IN_DT'].isna().all() and 'EDATE' in dfR.columns:
    dfR['PLANNED_IN_DT'] = combine_datetime(dfR, 'EDATE', 'ETIME')

# Merge rotation -> voyage using SEQ_STR == EXTERNALCODE_STR
print("Merging rotation -> voyage using SEQ_STR == EXTERNALCODE_STR ...")
merged = dfR.merge(dfV, left_on='SEQ_STR', right_on='EXTERNALCODE_STR', how='left', suffixes=('_rot','_voy'))

print("Columns after rotation->voyage merge:", list(merged.columns))
# Debug: how many rotation rows didn't match a voyage?
unmatched_voyage = merged['EXTERNALCODE'].isna().sum()
print(f"Rotation rows without a matching voyage (EXTERNALCODE null): {unmatched_voyage} / {len(merged)}")

# Ensure we still have the BARGE column in 'merged' (if present in dfR)
if 'BARGE' not in merged.columns:
    # maybe the rotation dataframe used a different name; try to detect
    possible_barge_cols = [c for c in merged.columns if 'BARGE' in c]
    print("No 'BARGE' in merged columns. Trying to find alternatives:", possible_barge_cols)
    if possible_barge_cols:
        # pick first candidate
        merged['BARGE'] = merged[possible_barge_cols[0]]
        print(f"Copied {possible_barge_cols[0]} -> BARGE")
    else:
        print("Couldn't find any BARGE-like column. Aborting.")
        print("Merged columns:", list(merged.columns))
        sys.exit(3)

print("'BARGE' column is present. Proceeding to merge with dfBarge by CODE.")

# Normalize barge code strings to match dfB 'CODE' style
merged['BARGE_STR'] = merged['BARGE'].astype(str).str.strip()
dfB['CODE_STR'] = dfB['CODE'].astype(str).str.strip()

# Merge with barge master
merged2 = merged.merge(dfB, left_on='BARGE_STR', right_on='CODE_STR', how='left', suffixes=('','_barge'))
print("Columns after merging with dfBarge:", list(merged2.columns))

# Report unmatched barges
unmatched_barges = merged2['CODE'].isna().sum()  # CODE from dfVoyage will be present; to check barge master use 'CODE_STR' from dfB
# check how many rows where barge metadata missing (no match in dfB)
missing_barge_meta = merged2['CODE_STR'].isna().sum()
print(f"Rows missing barge master metadata (no dfB match): {missing_barge_meta} / {len(merged2)}")

# Build cleaned timeline view
cols_keep = []
for c in ['BARGE', 'SEQ', 'PLANNED_IN_DT', 'PLANNED_OUT_DT', 'EXTERNALCODE', 'CODE', 'PORT_FROM', 'IE', 'SCOPEINLOCATION', 'SCOPEOUTLOCATION']:
    if c in merged2.columns:
        cols_keep.append(c)

timeline = merged2[cols_keep].copy()
timeline = timeline.sort_values(['BARGE', 'PLANNED_IN_DT'])
print("Timeline columns:", cols_keep)
print("First rows of timeline (sample):")
print(timeline.head(10).to_string())

# Save timeline
timeline.to_csv("rotation_timeline.csv", index=False)
print("Wrote rotation_timeline.csv with", len(timeline), "rows.")
