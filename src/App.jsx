import { useState } from "react";
import { RAW } from "./data/rawData";
import { theme } from "./data/theme";
import BargeView from "./views/BargeView";
import WeeklyBargeView from "./views/WeeklyBargeView";
import CapacityView from "./views/CapacityView";
import ScatterPlotView from "./views/ScatterPlotView";
import RoutePlanner from './views/RoutePlanner';
import plannerData from './data/plannerData.json';

export default function App() {
  const [view, setView] = useState("barge");
  const legs = RAW.legs.filter((l) => l.depart);

  return (
    <div
      style={{
        background: theme.bgPrimary,
        minHeight: "100vh",
        fontFamily: theme.fontSans,
        color: theme.textPrimary,
        padding: 0,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${theme.bgTertiary}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.textMuted}; }
        button:hover { opacity: 0.9; }
      `}</style>

      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${theme.border}`,
          padding: "16px 24px",
          background: theme.bgSecondary,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: theme.shadowSm,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: theme.textPrimary,
            }}
          >
            Barge Planner
          </h1>
          <div
            style={{
              fontSize: 11,
              color: theme.textSecondary,
              marginTop: 4,
              fontFamily: theme.fontMono,
            }}
          >
            {Object.keys(RAW.barges).length} barges · {legs.length} legs · Planning horizon: 29 Jan – 3 Mar 2026
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {[
              { id: "barge", label: "Barge View" },
              { id: "weekly", label: "Weekly Barge View" },
              { id: "capacity", label: "Transport Capacity" },
              { id: "scatter", label: "Scatter Plot" },
              { id: "planner", label: "Route Planner" },
            ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                padding: "8px 16px",
                borderRadius: theme.radius.md,
                border: `1px solid ${
                  view === v.id ? theme.accent : theme.border
                }`,
                background: view === v.id ? theme.accentMuted : theme.bgPrimary,
                color: view === v.id ? theme.accentHover : theme.textSecondary,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                fontWeight: view === v.id ? 600 : 500,
                transition: "all 0.15s",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 24, overflowX: "auto" }}>
        <div style={{ minWidth: view === "barge" || view === "weekly" ? 960 : 600 }}>
            {view === "barge" && <BargeView legs={legs} />}
            {view === "weekly" && <WeeklyBargeView legs={legs} />}
            {view === "capacity" && <CapacityView legs={legs} />}
            {view === "scatter" && <ScatterPlotView legs={legs} />}
            {view === "planner" && <RoutePlanner data={plannerData} />}
        </div>
      </div>
    </div>
  );
}
