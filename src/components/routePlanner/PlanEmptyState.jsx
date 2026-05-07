import { theme } from "../../data/theme";

export default function PlanEmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 20px",
        color: theme.textMuted,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800 }}>Route Planner</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>
        Set your parameters and click "Suggest route"
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        Indicate origin, destination, current date, due date, containers and container types.
      </div>
    </div>
  );
}
