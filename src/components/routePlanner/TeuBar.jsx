import { theme } from "../../data/theme";
import { pct } from "../../utils/routePlanner";

export default function TeuBar({ used, max, extra = 0, showLabel = true }) {
  const usedPct  = Math.min(100, pct(used, max));
  const extraPct = Math.min(100 - usedPct, pct(extra, max));
  const totalPct = usedPct + extraPct;
  const color =
    totalPct >= 95 ? theme.error : totalPct >= 80 ? theme.warning : theme.success;

  return (
    <div>
      <div
        style={{
          height: 8,
          background: theme.bgTertiary,
          borderRadius: theme.radius.sm,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${usedPct}%`,
            background: theme.textMuted,
            borderRadius: theme.radius.sm,
            transition: "width 0.3s",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${usedPct}%`,
            top: 0,
            height: "100%",
            width: `${extraPct}%`,
            background: color,
            borderRadius: theme.radius.sm,
            opacity: 0.85,
            transition: "all 0.3s",
          }}
        />
      </div>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: 10, color: theme.textMuted }}>
            {used} used {extra > 0 ? `+ ${extra} planned` : ""}
          </span>
          <span
            style={{
              fontSize: 10,
              color: totalPct >= 95 ? theme.error : theme.textSecondary,
              fontWeight: 600,
            }}
          >
            {totalPct}% / {max} TEU
          </span>
        </div>
      )}
    </div>
  );
}
