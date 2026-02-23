import pandas as pd
import matplotlib.pyplot as plt
import os

BASE_DIR = "." 

EXPANDED = os.path.join(BASE_DIR, "rotation_voyage_expanded.csv")
VOYELM = os.path.join(BASE_DIR, "data/dfVoyElm.xlsx")
VOYTERM = os.path.join(BASE_DIR, "data/dfVoyTerm.xlsx")
UNITEXP = os.path.join(BASE_DIR, "data/dfUnitExp.xlsx")

OUT_CSV = os.path.join(BASE_DIR, "rotation_voyage_expanded_with_kpis.csv")
OUT_GANTT = os.path.join(BASE_DIR, "gantt_voyage_legs.png")

# -------------------------------
# Load files
# -------------------------------

df_exp = pd.read_csv(EXPANDED)
df_voyelm = pd.read_excel(VOYELM)
df_voyterm = pd.read_excel(VOYTERM)
df_unite = pd.read_excel(UNITEXP)

# Normalize headers
df_exp.columns = [c.strip().upper() for c in df_exp.columns]
df_voyelm.columns = [c.strip().upper() for c in df_voyelm.columns]
df_voyterm.columns = [c.strip().upper() for c in df_voyterm.columns]
df_unite.columns = [c.strip().upper() for c in df_unite.columns]

# Ensure datetimes
for c in ['LEG_DEPART_DT','LEG_ARRIVE_DT']:
    if c in df_exp.columns:
        df_exp[c] = pd.to_datetime(df_exp[c], utc=True, errors='coerce')

# -------------------------------------------------------
# Merge dfVoyElm (capacity KPI)
# -------------------------------------------------------

if 'VOYAGE' in df_voyelm.columns:
    df_voyelm_small = df_voyelm[['VOYAGE'] + 
                                [c for c in ['TOTALTEU','TOTALWEIGHT','MAXTEU','MAXWEIGHT'] 
                                 if c in df_voyelm.columns]].copy()

    df_voyelm_small = df_voyelm_small.rename(columns={
        'VOYAGE': 'CODE',
        'TOTALTEU': 'VOYELM_TOTALTEU',
        'TOTALWEIGHT': 'VOYELM_TOTALWEIGHT',
        'MAXTEU': 'VOYELM_MAXTEU',
        'MAXWEIGHT': 'VOYELM_MAXWEIGHT'
    })

    df_exp = df_exp.merge(df_voyelm_small, on='CODE', how='left')

# -------------------------------------------------------
# Merge dfVoyTerm (terminal totals)
# -------------------------------------------------------

term_cols = [c for c in ['TOTAL20','TOTAL30','TOTAL40','TOTAL45',
                         'RESERVED20','RESERVED30','RESERVED40']
             if c in df_voyterm.columns]

if 'VOYAGE' in df_voyterm.columns and term_cols:
    vt = df_voyterm.groupby('VOYAGE')[term_cols].sum().reset_index()
    vt = vt.rename(columns={'VOYAGE': 'CODE'})
    vt = vt.rename(columns={c: f"VOYTERM_{c}" for c in term_cols})
    df_exp = df_exp.merge(vt, on='CODE', how='left')

# -------------------------------------------------------
# Merge dfUnitExp (container count KPI)
# -------------------------------------------------------

# Robust dfUnitExp merge
# df_unite is loaded and header-normalized earlier

# find which column in df_unite holds the voyage code (prefers VOYAGE_EXP then VOYAGE)
unit_voy_field = None
if 'VOYAGE_EXP' in df_unite.columns:
    unit_voy_field = 'VOYAGE_EXP'
elif 'VOYAGE' in df_unite.columns:
    unit_voy_field = 'VOYAGE'

if unit_voy_field:
    # normalize to string for safe merge
    df_unite[unit_voy_field] = df_unite[unit_voy_field].astype(str)

    # try to find a container id column (common names)
    possible_id_cols = ['CNTR','UNIT','CONTAINER','CONTAINERID','CNTRID','UNITID']
    container_col = next((c for c in possible_id_cols if c in df_unite.columns), None)

    if container_col:
        # count unique containers per voyage if container id exists
        ue = df_unite.groupby(unit_voy_field)[container_col].nunique().reset_index().rename(
            columns={unit_voy_field: 'CODE', container_col: 'UNITEXP_CONTAINER_COUNT'}
        )
    else:
        # fallback: count rows per voyage (safe)
        ue = df_unite.groupby(unit_voy_field).size().reset_index(name='UNITEXP_CONTAINER_COUNT').rename(
            columns={unit_voy_field: 'CODE'}
        )

    # merge into df_exp on CODE (voyage code)
    df_exp = df_exp.merge(ue, on='CODE', how='left')
else:
    # no voyage-like field in dfUnitExp; create empty column
    df_exp['UNITEXP_CONTAINER_COUNT'] = pd.NA

# -------------------------------------------------------
# Save CSV locally
# -------------------------------------------------------

df_exp.to_csv(OUT_CSV, index=False)
print(f"Saved CSV to: {OUT_CSV}")

# -------------------------------------------------------
# Build Gantt chart
# -------------------------------------------------------

# Determine barge column
barge_col = 'BARGE_ROT' if 'BARGE_ROT' in df_exp.columns else 'BARGE'

gdf = df_exp.sort_values([barge_col, 'LEG_DEPART_DT'])

barges = list(gdf[barge_col].astype(str).unique())
y_map = {b: i for i, b in enumerate(barges)}

fig, ax = plt.subplots(figsize=(14, max(4, len(barges)*0.4)))

for _, row in gdf.iterrows():
    start = row['LEG_DEPART_DT']
    end = row['LEG_ARRIVE_DT']
    if pd.isna(start) or pd.isna(end):
        continue
    y = y_map[str(row[barge_col])]
    duration_hours = (end - start).total_seconds() / 3600.0
    ax.barh(y, duration_hours, left=start, height=0.4)

ax.set_yticks(list(y_map.values()))
ax.set_yticklabels(list(y_map.keys()))
ax.set_xlabel("Datetime (UTC)")
ax.set_title("Barge Voyage Legs Gantt")
fig.autofmt_xdate()

plt.savefig(OUT_GANTT, dpi=150, bbox_inches='tight')
plt.close(fig)

print(f"Saved Gantt PNG to: {OUT_GANTT}")
