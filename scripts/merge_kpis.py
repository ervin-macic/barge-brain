from pathlib import Path
from load_data import read_excel, read_csv
import pandas as pd
from utils import safe_count_by

DATA_DIR = Path("data")
IN_EXPANDED = Path("outputs/rotation_voyage_expanded.csv")
OUT = Path("outputs/rotation_voyage_expanded_with_kpis.csv")

def main():
    df_exp = read_csv(IN_EXPANDED, parse_dates=['LEG_DEPART_DT','LEG_ARRIVE_DT'])
    df_voyelm = read_excel(DATA_DIR / "dfVoyElm.xlsx")
    df_voyterm = read_excel(DATA_DIR / "dfVoyTerm.xlsx")
    df_unite = read_excel(DATA_DIR / "dfUnitExp.xlsx")

    # VoyElm merge (per VOYAGE -> CODE)
    if 'VOYAGE' in df_voyelm.columns:
        vx = df_voyelm[['VOYAGE'] + [c for c in ['TOTALTEU','TOTALWEIGHT','MAXTEU','MAXWEIGHT'] if c in df_voyelm.columns]].copy()
        vx = vx.rename(columns={'VOYAGE':'CODE','TOTALTEU':'VOYELM_TOTALTEU','TOTALWEIGHT':'VOYELM_TOTALWEIGHT','MAXTEU':'VOYELM_MAXTEU','MAXWEIGHT':'VOYELM_MAXWEIGHT'})
        df_exp = df_exp.merge(vx, on='CODE', how='left')

    # VoyTerm aggregated totals by VOYAGE
    term_cols = [c for c in ['TOTAL20','TOTAL30','TOTAL40','TOTAL45','RESERVED20','RESERVED30','RESERVED40'] if c in df_voyterm.columns]
    if 'VOYAGE' in df_voyterm.columns and term_cols:
        vt = df_voyterm.groupby('VOYAGE')[term_cols].sum().reset_index().rename(columns={'VOYAGE':'CODE'})
        vt = vt.rename(columns={c:f"VOYTERM_{c}" for c in term_cols})
        df_exp = df_exp.merge(vt, on='CODE', how='left')

    # UnitExp container counts by VOYAGE_EXP or VOYAGE
    unit_voy_field = 'VOYAGE_EXP' if 'VOYAGE_EXP' in df_unite.columns else ('VOYAGE' if 'VOYAGE' in df_unite.columns else None)
    if unit_voy_field:
        df_unite[unit_voy_field] = df_unite[unit_voy_field].astype(str)
        ue = safe_count_by(df_unite, unit_voy_field)
        ue = ue.rename(columns={unit_voy_field:'CODE','COUNT':'UNITEXP_CONTAINER_COUNT'})
        df_exp = df_exp.merge(ue, on='CODE', how='left')
    else:
        df_exp['UNITEXP_CONTAINER_COUNT'] = pd.NA

    OUT.parent.mkdir(parents=True, exist_ok=True)
    df_exp.to_csv(OUT, index=False)
    print("Wrote", OUT)

if __name__ == "__main__":
    main()
