import { theme } from "../../data/theme";
import { BARGE_COLORS } from "../../data/constants";
import { port, fmtDate } from "./format";
import StatusPill from "./StatusPill";

/**
 * Shows single-journey alternatives that can carry ALL containers without splitting.
 *
 * Props:
 *   alternatives   — result of findNoSplitAlternatives()
 *   containerCount — number of containers
 *   selectedIndex  — index of the currently-selected alternative (null = none)
 *   onSelect       — (index: number | null) => void
 */
export default function NoSplitAlternatives({
  alternatives,
  containerCount,
  selectedIndex,
  onSelect,
}) {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div
      style={{
        background: theme.bgSecondary,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.border}`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${theme.borderMuted}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>
            No-split alternatives
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
            Each option carries all {containerCount} containers in a single journey — select one
            to use it instead of the suggested plan
          </div>
        </div>
        <span
          style={{
            background: theme.infoBg,
            color: theme.info,
            borderRadius: theme.radius.sm,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {alternatives.length}
        </span>
      </div>

      {/* Alternative rows */}
      {alternatives.map((alt, i) => {
        const isSelected = selectedIndex === i;
        return (
          <div
            key={i}
            style={{
              padding: "12px 16px",
              borderBottom: i < alternatives.length - 1 ? `1px solid ${theme.borderMuted}` : "none",
              background: isSelected ? theme.infoBg : i % 2 === 0 ? theme.bgSecondary : theme.bgPrimary,
              borderLeft: `3px solid ${isSelected ? theme.info : "transparent"}`,
              transition: "background 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Journey info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {alt.type === "direct" ? (
                  <DirectAlt voyage={alt.voyages[0]} isLate={alt.isLate} containerCount={containerCount} />
                ) : (
                  <HubAlt leg1={alt.voyages[0]} leg2={alt.voyages[1]} isLate={alt.isLate} containerCount={containerCount} />
                )}
              </div>

              {/* Select / deselect button */}
              <button
                onClick={() => onSelect(isSelected ? null : i)}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: theme.radius.md,
                  border: `1.5px solid ${isSelected ? theme.info : theme.borderMuted}`,
                  background: isSelected ? theme.info : "transparent",
                  color: isSelected ? "#fff" : theme.textSecondary,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {isSelected ? "✓ Selected" : "Use this"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DirectAlt({ voyage: v, isLate, containerCount }) {
  const bc = BARGE_COLORS[v.barge] || theme.textSecondary;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: bc, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: theme.textPrimary }}>{v.barge}</span>
        <span
          style={{
            fontSize: 10,
            color: theme.textMuted,
            fontFamily: theme.fontMono,
            background: theme.bgTertiary,
            padding: "1px 5px",
            borderRadius: theme.radius.sm,
          }}
        >
          {v.code}
        </span>
      </div>
      <span style={{ fontSize: 12, color: theme.textSecondary }}>
        {port(v.portFrom)} → {port(v.portTo)}
      </span>
      <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: theme.fontMono }}>
        dep. {fmtDate(v.depart)}
      </span>
      <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: theme.fontMono }}>
        arr. {fmtDate(v.arrive)}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
        <span style={{ fontSize: 11, color: theme.textSecondary }}>{containerCount} ctrs</span>
        <StatusPill status={isLate ? "late" : "ok"}>{isLate ? "LATE" : "ON TIME"}</StatusPill>
        <span
          style={{
            fontSize: 10,
            color: theme.info,
            fontWeight: 600,
            background: theme.infoBg,
            padding: "2px 6px",
            borderRadius: theme.radius.sm,
          }}
        >
          direct
        </span>
      </div>
    </div>
  );
}

function HubAlt({ leg1, leg2, isLate, containerCount }) {
  const bc1 = BARGE_COLORS[leg1.barge] || theme.textSecondary;
  const bc2 = BARGE_COLORS[leg2.barge] || theme.textSecondary;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {/* Leg 1 */}
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: bc1, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.textPrimary }}>{leg1.barge}</span>
        <span style={{ fontSize: 10, color: theme.textMuted, fontFamily: theme.fontMono, background: theme.bgTertiary, padding: "1px 5px", borderRadius: theme.radius.sm }}>{leg1.code}</span>
        <span style={{ fontSize: 11, color: theme.textSecondary }}>{port(leg1.portFrom)} → Rotterdam</span>
        <span style={{ fontSize: 10, color: theme.textMuted, fontFamily: theme.fontMono }}>dep. {fmtDate(leg1.depart)}</span>

        <span style={{ color: theme.textMuted, fontSize: 12, margin: "0 2px" }}>▸</span>

        {/* Leg 2 */}
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: bc2, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.textPrimary }}>{leg2.barge}</span>
        <span style={{ fontSize: 10, color: theme.textMuted, fontFamily: theme.fontMono, background: theme.bgTertiary, padding: "1px 5px", borderRadius: theme.radius.sm }}>{leg2.code}</span>
        <span style={{ fontSize: 11, color: theme.textSecondary }}>Rotterdam → {port(leg2.portTo)}</span>
        <span style={{ fontSize: 10, color: theme.textMuted, fontFamily: theme.fontMono }}>arr. {fmtDate(leg2.arrive)}</span>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <span style={{ fontSize: 11, color: theme.textSecondary }}>{containerCount} ctrs</span>
          <StatusPill status={isLate ? "late" : "ok"}>{isLate ? "LATE" : "ON TIME"}</StatusPill>
          <span style={{ fontSize: 10, color: theme.textSecondary, fontWeight: 600, background: theme.bgTertiary, padding: "2px 6px", borderRadius: theme.radius.sm }}>
            via ROTTE
          </span>
        </div>
      </div>
    </div>
  );
}
