import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

IN = Path("outputs/rotation_voyage_expanded_with_kpis.csv")
OUT = Path("outputs/gantt_voyage_legs.png")

def main():
    df = pd.read_csv(IN, parse_dates=['LEG_DEPART_DT','LEG_ARRIVE_DT'])
    barge_col = 'BARGE_ROT' if 'BARGE_ROT' in df.columns else 'BARGE'
    df = df.sort_values([barge_col,'LEG_DEPART_DT'])
    barges = list(df[barge_col].astype(str).unique())
    y_map = {b:i for i,b in enumerate(barges)}

    fig, ax = plt.subplots(figsize=(14, max(4, len(barges)*0.35)))
    for _, r in df.iterrows():
        s = r['LEG_DEPART_DT']; e = r['LEG_ARRIVE_DT']
        if pd.isna(s) or pd.isna(e): continue
        ax.barh(y_map[str(r[barge_col])], (e-s).total_seconds()/3600.0, left=s, height=0.4)
    ax.set_yticks(list(y_map.values()))
    ax.set_yticklabels(list(y_map.keys()))
    ax.set_xlabel("Datetime (UTC)")
    ax.set_title("Barge voyage legs Gantt")
    fig.autofmt_xdate()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(OUT, bbox_inches='tight', dpi=150)
    plt.close(fig)
    print("Wrote", OUT)

if __name__ == "__main__":
    main()
