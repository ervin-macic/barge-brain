import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { legsToScatterPoints, STAGES } from "../utils/scatterDataTransform";
import { theme } from "../data/theme";
import SummaryBar from "../components/SummaryBar";

const ISSUE_TYPES = ["On Time", "Minor Delay", "Major Delay", "Critical"];
const ISSUE_COLORS = {
  "On Time": theme.statusOnTime,
  "Minor Delay": theme.statusMinorDelay,
  "Major Delay": theme.statusMajorDelay,
  Critical: theme.statusCritical,
};

export default function ScatterPlotView({ legs }) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [filters, setFilters] = useState({
    issues: [...ISSUE_TYPES],
    stages: [...STAGES],
  });

  const data = useMemo(() => legsToScatterPoints(legs), [legs]);

  const toggleIssueFilter = (issue) => {
    setFilters((prev) => ({
      ...prev,
      issues: prev.issues.includes(issue)
        ? prev.issues.filter((i) => i !== issue)
        : [...prev.issues, issue],
    }));
  };

  const toggleStageFilter = (stage) => {
    setFilters((prev) => ({
      ...prev,
      stages: prev.stages.includes(stage)
        ? prev.stages.filter((s) => s !== stage)
        : [...prev.stages, stage],
    }));
  };

  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        filters.issues.includes(item.issue) && filters.stages.includes(item.category)
    );
  }, [data, filters]);

  const handleClick = (entry) => {
    setSelectedPoint(entry);
  };

  return (
    <div>
      <SummaryBar legs={legs} />
      <div
        style={{
          display: "flex",
          minHeight: 420,
          background: theme.bgPrimary,
          border: `1px solid ${theme.borderMuted}`,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          boxShadow: theme.shadowSm,
        }}
      >
        {/* Left - Filters */}
        <div
          style={{
            width: 288,
            flexShrink: 0,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            borderRight: `1px solid ${theme.borderMuted}`,
            background: theme.bgSecondary,
            overflowY: "auto",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: 18,
              fontWeight: 600,
              color: theme.textPrimary,
            }}
          >
            Filters
          </h2>

          <section style={{ marginBottom: 20 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.textSecondary,
                margin: "0 0 12px",
              }}
            >
              Issue Status
            </h3>
            {ISSUE_TYPES.map((issue) => (
              <label
                key={issue}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.issues.includes(issue)}
                  onChange={() => toggleIssueFilter(issue)}
                  style={{ accentColor: theme.accent, width: 16, height: 16 }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: ISSUE_COLORS[issue],
                    }}
                  />
                  <span style={{ color: theme.textPrimary }}>{issue}</span>
                </div>
              </label>
            ))}
          </section>

          <section
            style={{
              marginBottom: 20,
              paddingTop: 16,
              borderTop: `1px solid ${theme.borderMuted}`,
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.textSecondary,
                margin: "0 0 12px",
              }}
            >
              Stage
            </h3>
            {STAGES.map((stage) => (
              <label
                key={stage}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.stages.includes(stage)}
                  onChange={() => toggleStageFilter(stage)}
                  style={{ accentColor: theme.accent, width: 16, height: 16 }}
                />
                <span style={{ color: theme.textPrimary }}>{stage}</span>
              </label>
            ))}
          </section>

          <div
            style={{
              marginTop: "auto",
              paddingTop: 16,
              borderTop: `1px solid ${theme.borderMuted}`,
              fontSize: 13,
              color: theme.textSecondary,
            }}
          >
            Showing {filteredData.length} of {data.length} shipments
          </div>
        </div>

        {/* Middle - Scatter Plot */}
        <div
          style={{
            flex: 1,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <h1
            style={{
              margin: "0 0 20px",
              fontSize: 18,
              fontWeight: 600,
              color: theme.textPrimary,
            }}
          >
            Interactive Scatter Plot
          </h1>
          <div
            style={{
              flex: 1,
              minHeight: 320,
              background: theme.bgSecondary,
              borderRadius: theme.radius.md,
              padding: 16,
              border: `1px solid ${theme.borderMuted}`,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.borderMuted} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Time in Stage"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: theme.textSecondary }}
                  label={{
                    value: "Time in Stage (hours)",
                    position: "insideBottom",
                    offset: -10,
                    fontSize: 11,
                    fill: theme.textSecondary,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Category"
                  domain={[0, 4]}
                  ticks={[0, 1, 2, 3, 4]}
                  tickFormatter={(v) => STAGES[v] || ""}
                  tick={{ fontSize: 10, fill: theme.textSecondary }}
                  width={110}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: theme.borderMuted }}
                  contentStyle={{
                    background: theme.bgSecondary,
                    border: `1px solid ${theme.borderMuted}`,
                    borderRadius: theme.radius.md,
                  }}
                />
                <Scatter data={filteredData} onClick={handleClick}>
                  {filteredData.map((entry, idx) => (
                    <Cell
                      key={`cell-${entry.id}-${idx}`}
                      fill={ISSUE_COLORS[entry.issue]}
                      style={{ cursor: "pointer" }}
                      opacity={selectedPoint?.id === entry.id ? 1 : 0.7}
                      stroke={selectedPoint?.id === entry.id ? theme.textPrimary : "none"}
                      strokeWidth={selectedPoint?.id === entry.id ? 2 : 0}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              justifyContent: "center",
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            {ISSUE_TYPES.map((issue) => (
              <div
                key={issue}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: ISSUE_COLORS[issue],
                  }}
                />
                <span style={{ fontSize: 12, color: theme.textSecondary }}>
                  {issue}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Point Details */}
        <div
          style={{
            width: 384,
            flexShrink: 0,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            borderLeft: `1px solid ${theme.borderMuted}`,
            background: theme.bgSecondary,
          }}
        >
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: 18,
              fontWeight: 600,
              color: theme.textPrimary,
            }}
          >
            Point Details
          </h2>
          {selectedPoint ? (
            <div
              style={{
                background: theme.bgPrimary,
                borderRadius: theme.radius.md,
                padding: 20,
                border: `1px solid ${theme.borderMuted}`,
              }}
            >
              <DetailRow label="ID" value={selectedPoint.id} />
              <DetailRow label="Booking Number" value={selectedPoint.bookingNumber} />
              <DetailRow label="Rotterdam Port" value={selectedPoint.rotterdamPort} />
              <DetailRow label="Voyage on" value={selectedPoint.voyageOn || "N/A"} />
              <DetailRow label="Inland Terminal" value={selectedPoint.inlandTerminal} />
              <DetailRow label="Unit type" value={selectedPoint.unitType} />
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: theme.bgPrimary,
                borderRadius: theme.radius.md,
                border: `1px solid ${theme.borderMuted}`,
                color: theme.textMuted,
                fontSize: 14,
              }}
            >
              Click on a point to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 12,
          color: theme.textSecondary,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.textPrimary,
        }}
      >
        {value}
      </div>
    </div>
  );
}
