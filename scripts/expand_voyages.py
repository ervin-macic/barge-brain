from pathlib import Path
from load_data import read_excel
from utils import combine_date_time
import pandas as pd

DATA_DIR = Path("data")
OUT = Path("outputs/rotation_voyage_expanded.csv")

def main():
    dfR = read_excel(DATA_DIR / "dfRotation.xlsx")
    dfV = read_excel(DATA_DIR / "dfVoyage.xlsx")

    # keys
    dfR["SEQ_STR"] = dfR["SEQ"].astype(str)
    dfV["EXTERNALCODE_STR"] = dfV["EXTERNALCODE"].astype(str).str.replace(r"\.0$", "", regex=True)

    merged = dfR.merge(dfV, left_on="SEQ_STR", right_on="EXTERNALCODE_STR", how="left", suffixes=("_ROT","_VOY"))

    merged["LEG_DEPART_DT"] = combine_date_time(merged.get("DEPDATE"), merged.get("DEPTIME"))
    merged["LEG_ARRIVE_DT"] = combine_date_time(merged.get("ARRDATE"), merged.get("ARRTIME"))

    cols = ["SEQ","BARGE_ROT","CODE","IE","PORT_FROM","PORT_TO","LEG_DEPART_DT","LEG_ARRIVE_DT","SCOPEINLOCATION","SCOPEOUTLOCATION"]
    expanded = merged[[c for c in cols if c in merged.columns]].copy()
    expanded = expanded.sort_values(["BARGE_ROT","LEG_DEPART_DT"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    expanded.to_csv(OUT, index=False)
    print("Wrote", OUT)

if __name__ == "__main__":
    main()
