import { statusLevel } from "../utils/legHelpers";
import { theme } from "../data/theme";

export default function SummaryBar({ legs }) {
  const barges = [...new Set(legs.map((l) => l.barge))];

  const stats = [
    { label: "Total Legs", val: legs.filter((l) => l.depart).length, color: theme.info },
    { label: "With Issues", val: legs.filter((l) => statusLevel(l) !== "ok").length, color: theme.warning },
    { label: "No Appointment", val: legs.filter((l) => !l.appt).length, color: theme.warning },
    { label: "High Load (≥90%)", val: legs.filter((l) => l.teuPct != null && l.teuPct >= 90).length, color: theme.accent },
    { label: "Active Barges", val: barges.filter((b) => legs.some((l) => l.barge === b && l.depart)).length, color: theme.success },
  ];

  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: theme.bgSecondary,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius.md,
            padding: "12px 18px",
            minWidth: 130,
            boxShadow: theme.shadowSm,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
          <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
