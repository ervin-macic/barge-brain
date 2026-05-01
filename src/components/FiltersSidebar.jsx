import { theme } from "../data/theme";
import { PORT_LABELS } from "../data/constants";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "ok", label: "OK" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High load (≥90%)" },
  { value: "pending fix", label: "Pending Fix" }
];

export default function FiltersSidebar({ filters, onFilterChange, legs }) {
  const terminals = [...new Set(legs.flatMap((l) => [l.portFrom, l.portTo]).filter(Boolean))].sort();

  // Utilization stats for display
  const withTeu = legs.filter((l) => l.teuPct != null);
  const avgUtil = withTeu.length
    ? (withTeu.reduce((a, l) => a + l.teuPct, 0) / withTeu.length).toFixed(1)
    : "—";
  const maxUtil = withTeu.length ? Math.max(...withTeu.map((l) => l.teuPct)).toFixed(1) : "—";

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: theme.bgSecondary,
        borderRight: `1px solid ${theme.border}`,
        padding: theme.space.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.space.xl,
      }}
    >
      {/* Status filter */}
      <section>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 1,
            margin: "0 0 10px",
          }}
        >
          Status
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: theme.textPrimary,
              }}
            >
              <input
                type="radio"
                name="status"
                value={opt.value}
                checked={filters.status === opt.value}
                onChange={() => onFilterChange("status", opt.value)}
                style={{ accentColor: theme.accent }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </section>

      {/* Terminal filter */}
      <section>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 1,
            margin: "0 0 10px",
          }}
        >
          Terminal
        </h3>
        <select
          value={filters.terminal}
          onChange={(e) => onFilterChange("terminal", e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: theme.radius.md,
            border: `1px solid ${theme.border}`,
            background: theme.bgPrimary,
            fontSize: 13,
            color: theme.textPrimary,
            cursor: "pointer",
          }}
        >
          <option value="all">All terminals</option>
          {terminals.map((t) => (
            <option key={t} value={t}>
              {PORT_LABELS[t] || t}
            </option>
          ))}
        </select>
      </section>

      {/* Utilization */}
      <section>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 1,
            margin: "0 0 10px",
          }}
        >
          Utilization
        </h3>
        <div
          style={{
            background: theme.bgTertiary,
            borderRadius: theme.radius.md,
            padding: 12,
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: theme.textSecondary }}>Avg TEU</span>
            <span style={{ fontWeight: 600, color: theme.textPrimary }}>{avgUtil}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: theme.textSecondary }}>Peak TEU</span>
            <span style={{ fontWeight: 600, color: theme.textPrimary }}>{maxUtil}%</span>
          </div>
        </div>
      </section>

      {/* Legend */}
      <section>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 1,
            margin: "0 0 10px",
          }}
        >
          Legend
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { color: theme.success, label: "OK" },
            { color: theme.warning, label: "Warning (No Appt/NOK)" },
            { color: theme.error, label: "Critical (>20 NOK)" },
            { color: theme.accent, label: "≥90% TEU (high load)" },
            { color: theme.pendingFixColour, label: "Pending Fix" },
          ].map((x) => (
            <div key={x.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: x.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: theme.textPrimary }}>{x.label}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
