import { theme } from "../../data/theme";
import { BARGE_COLORS } from "../../data/constants";
import { fmtDate } from "./format";

export default function PlanTimeline({ assignments, dueDate, currDate }) {
  if (!assignments.length) return null;

  const allDates = assignments.flatMap((a) =>
    [a.voyage.depart, a.voyage.arrive].filter(Boolean)
  );
  const allMs = allDates.map((d) => new Date(d).getTime());
  const minD = currDate ? new Date(currDate) : new Date(Math.min(...allMs));
  const arrivalsMaxMs = Math.max(...allMs);
  const dueMs = dueDate ? new Date(dueDate).getTime() : -Infinity;
  const maxD = new Date(Math.max(arrivalsMaxMs, dueMs));
  const span = maxD - minD;
  const toX = (d) => ((new Date(d) - minD) / span) * 100;

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 500, position: "relative", paddingTop: 8 }}>
        {/* Track with due-date marker */}
        <div
          style={{
            height: 2,
            background: theme.borderMuted,
            margin: "20px 0 8px",
            position: "relative",
          }}
        >
          {dueDate && (
            <div
              style={{
                position: "absolute",
                left: `${toX(dueDate)}%`,
                top: -20,
                transform: "translateX(-50%)",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: theme.error,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                DUE
              </div>
              <div
                style={{ width: 1, height: 24, background: theme.error, margin: "0 auto" }}
              />
            </div>
          )}
        </div>

        {/* Voyage bars */}
        {assignments.map((a, i) => {
          const bc = BARGE_COLORS[a.voyage.barge] || theme.textSecondary;
          const x1 = toX(a.voyage.depart);
          const x2 = toX(a.voyage.arrive);
          const w = Math.max(1, x2 - x1);
          return (
            <div key={i} style={{ position: "relative", height: 34, marginBottom: 4 }}>
              <div
                style={{
                  position: "absolute",
                  left: `${x1}%`,
                  width: `${w}%`,
                  height: 24,
                  borderRadius: theme.radius.sm,
                  background: bc + "33",
                  border: `1.5px solid ${bc}`,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 6px",
                  overflow: "hidden",
                  minWidth: 32,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: bc,
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.voyage.barge} · {a.containersAssigned} ctrs
                </span>
              </div>
              {/* Depart label */}
              <div
                style={{
                  position: "absolute",
                  left: `${x1}%`,
                  top: 26,
                  fontSize: 9,
                  color: theme.textMuted,
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                }}
              >
                {fmtDate(a.voyage.depart)}
              </div>
              {/* Arrive label */}
              <div
                style={{
                  position: "absolute",
                  left: `${Math.min(99, x2)}%`,
                  top: 26,
                  fontSize: 9,
                  color: theme.textMuted,
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                }}
              >
                {fmtDate(a.voyage.arrive)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
