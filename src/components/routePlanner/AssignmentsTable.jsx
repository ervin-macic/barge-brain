import { theme } from "../../data/theme";
import { BARGE_COLORS } from "../../data/constants";
import { port, fmtDate } from "./format";
import StatusPill from "./StatusPill";

const COL_TEMPLATE = "36px 1fr 120px 90px 100px 90px 90px";

/**
 * Grid-row assignment breakdown card.
 *
 * Props:
 *   assignments — planRoute result.assignments
 *   origin      — port code
 *   destination — port code
 *   dueDate     — ISO date string
 */
export default function AssignmentsTable({ assignments, origin, destination, dueDate }) {
  return (
    <div
      style={{
        background: theme.bgSecondary,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.border}`,
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${theme.borderMuted}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>
          Assignment breakdown
        </span>
        <span style={{ fontSize: 11, color: theme.textMuted }}>
          {port(origin)} → {port(destination)} · by {fmtDate(dueDate)}
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COL_TEMPLATE,
          padding: "8px 16px",
          background: theme.bgTertiary,
          fontSize: 10,
          fontWeight: 700,
          color: theme.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        <div>#</div>
        <div>Barge / Voyage</div>
        <div>Route</div>
        <div style={{ textAlign: "center" }}>Containers</div>
        <div style={{ textAlign: "center" }}>Departs</div>
        <div style={{ textAlign: "center" }}>Arrives</div>
        <div style={{ textAlign: "right" }}>Load after</div>
      </div>

      {/* Rows */}
      {assignments.map((a, i) => {
        const bc = BARGE_COLORS[a.voyage.barge] || theme.textSecondary;
        const isLate = a.status === "late";
        const rowBg = isLate ? theme.errorBg : i % 2 === 0 ? theme.bgSecondary : theme.bgPrimary;
        const accentColor =
          a.status === "critical"
            ? theme.error
            : a.status === "warning"
            ? theme.warning
            : theme.success;

        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: COL_TEMPLATE,
              padding: "10px 16px",
              background: rowBg,
              borderBottom: `1px solid ${theme.borderMuted}`,
              alignItems: "center",
              borderLeft: `3px solid ${accentColor}`,
            }}
          >
            <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600 }}>{i + 1}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: bc,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.textPrimary }}>
                  {a.voyage.barge}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: theme.textMuted,
                    fontFamily: theme.fontMono,
                  }}
                >
                  {a.voyage.code}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: theme.textSecondary }}>
              {port(a.voyage.portFrom)} → {port(a.voyage.portTo)}
            </div>

            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: theme.info }}>
                {a.containersAssigned}
              </span>
              <span style={{ fontSize: 10, color: theme.textMuted, marginLeft: 3 }}>ctrs</span>
            </div>

            <div
              style={{
                fontSize: 11,
                textAlign: "center",
                color: theme.textSecondary,
                fontFamily: theme.fontMono,
              }}
            >
              {fmtDate(a.voyage.depart)}
            </div>

            <div
              style={{
                fontSize: 11,
                textAlign: "center",
                color: theme.textSecondary,
                fontFamily: theme.fontMono,
              }}
            >
              {fmtDate(a.voyage.arrive)}
            </div>

            <div style={{ textAlign: "right" }}>
              <StatusPill status={a.status}>{a.teuPctAfter}%</StatusPill>
            </div>
          </div>
        );
      })}
    </div>
  );
}
