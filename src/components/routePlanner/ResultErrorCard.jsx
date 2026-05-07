import { theme } from "../../data/theme";
import { port, fmtDate } from "./format";

/**
 * Shown when the planner finds no results.
 *
 * Props:
 *   error       — "no_voyages" | "no_capacity"
 *   origin      — port code
 *   destination — port code
 *   dueDate     — ISO date string
 */
export default function ResultErrorCard({ error, origin, destination, dueDate }) {
  if (error === "no_voyages") {
    return (
      <div
        style={{
          background: theme.bgSecondary,
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.error}`,
          padding: 40,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontWeight: 700, color: theme.error, fontSize: 14 }}>
          No voyages found
        </div>
        <div style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
          No scheduled voyages match {port(origin)} → {port(destination)} arriving before{" "}
          {fmtDate(dueDate)}. Try extending the due date or check the route.
        </div>
      </div>
    );
  }

  if (error === "no_capacity") {
    return (
      <div
        style={{
          background: theme.bgSecondary,
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.warning}`,
          padding: 40,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 8 }}>📦</div>
        <div style={{ fontWeight: 700, color: theme.warning, fontSize: 14 }}>
          No capacity available
        </div>
        <div style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
          Voyages exist on this route but are all at or near full capacity. Try a later due date
          to include more voyages.
        </div>
      </div>
    );
  }

  return null;
}
