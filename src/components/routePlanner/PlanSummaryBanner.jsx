import { theme } from "../../data/theme";

/**
 * Four-stat result header card.
 *
 * Props:
 *   assignedTotal — number of containers successfully placed
 *   result        — { unassigned, assignments, totalTeu, teuPerCntr }
 *   count         — originally requested container count
 */
export default function PlanSummaryBanner({ assignedTotal, result, count }) {
  const stats = [
    {
      label: "Containers",
      value: assignedTotal,
      sub: `of ${count} requested`,
      color: assignedTotal === count ? theme.success : theme.warning,
    },
    {
      label: "Unassigned",
      value: result.unassigned,
      sub: "need manual planning",
      color: result.unassigned > 0 ? theme.error : theme.textMuted,
    },
    {
      label: "Voyages used",
      value: result.assignments.length,
      sub: "across schedule",
      color: theme.info,
    },
    {
      label: "TEU needed",
      value: result.totalTeu,
      sub: `${count} × ${result.teuPerCntr} TEU`,
      color: theme.textPrimary,
    },
  ];

  return (
    <div
      style={{
        background: theme.bgSecondary,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.border}`,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        overflow: "hidden",
      }}
    >
      {stats.map(({ label, value, sub, color }, i) => (
        <div
          key={label}
          style={{
            padding: "16px 20px",
            textAlign: "center",
            borderRight: i < 3 ? `1px solid ${theme.borderMuted}` : "none",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.textPrimary, marginTop: 3 }}>
            {label}
          </div>
          <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>{sub}</div>
        </div>
      ))}
    </div>
  );
}
