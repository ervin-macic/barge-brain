import { theme } from "../data/theme";

export default function Tooltip({ leg, x, y, onMouseEnter, onMouseLeave }) {
  const fmt = iso =>
    iso
      ? new Date(iso).toLocaleString("nl-NL", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const nok = (leg.expNok || 0) + (leg.impNok || 0);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        left: Math.min(x + 12, window.innerWidth - 300),
        top: Math.max(10, y - 10),
        background: theme.bgSecondary,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius.md,
        padding: "12px 14px",
        zIndex: 9999,
        minWidth: 240,
        boxShadow: theme.shadowLg,
        fontSize: 12,
        lineHeight: 1.6,
        color: theme.textPrimary,
        fontFamily: theme.fontMono,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: theme.textPrimary, marginBottom: 6 }}>
        {leg.code} · {leg.barge}
      </div>
      <div>
        {leg.ie === "E" ? "⬆ Export" : "⬇ Import"} &nbsp; {leg.portFrom} → {leg.portTo}
      </div>
      <div style={{ marginTop: 4, color: theme.textSecondary }}>
        Dep: {fmt(leg.depart)}
        <br />
        Arr: {fmt(leg.arrive)}
      </div>
      {leg.teuPct != null && (
        <div style={{ marginTop: 6 }}>
          <span style={{ color: leg.teuPct >= 90 ? theme.warning : theme.success }}>
            TEU: {leg.teu}/{leg.maxTeu} ({leg.teuPct}%)
          </span>
        </div>
      )}
      {leg.weightPct != null && (
        <div>
          <span style={{ color: theme.textSecondary }}>
            Weight: {(leg.weight / 1000).toFixed(0)}t / {(leg.maxWeight / 1000).toFixed(0)}t (
            {leg.weightPct}%)
          </span>
        </div>
      )}
      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            background: leg.appt ? theme.successBg : theme.errorBg,
            padding: "2px 8px",
            borderRadius: theme.radius.sm,
            color: leg.appt ? theme.success : theme.error,
          }}
        >
          {leg.appt ? "✓ Appt" : "✗ No Appt"}
        </span>
        {nok > 0 && (
          <span style={{ background: theme.errorBg, padding: "2px 8px", borderRadius: theme.radius.sm, color: theme.error }}>
            {nok} NOK
          </span>
        )}
        {leg.scopeIn && (
          <span
            style={{
              background: theme.bgTertiary,
              padding: "2px 8px",
              borderRadius: theme.radius.sm,
              color: theme.textSecondary,
              fontSize: 10,
            }}
          >
            🚧 {leg.scopeIn}
          </span>
        )}
      </div>
    </div>
  );
}
