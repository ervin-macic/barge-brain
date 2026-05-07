import { useState } from "react";
import { theme } from "../../data/theme";
import { port, fmtDate } from "./format";
import StatusPill from "./StatusPill";

/**
 * Displays committed plans stored in localStorage with download/clear options.
 *
 * Props:
 *   plans      — array of committed plan objects
 *   onDownload — () => void  triggers CSV download
 *   onClear    — () => void  clears all committed plans
 */
export default function CommittedPlansPanel({ plans, onDownload, onClear }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);

  if (!plans || plans.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 24,
        background: theme.bgSecondary,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.border}`,
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: expanded ? `1px solid ${theme.borderMuted}` : "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary, flex: 1 }}>
          Committed plans
        </span>
        <span
          style={{
            background: theme.successBg,
            color: theme.success,
            borderRadius: theme.radius.sm,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {plans.length} plan{plans.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          style={actionBtnStyle(theme.info)}
          title="Download all as CSV"
        >
          ↓ CSV
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("Clear all committed plans? This cannot be undone.")) onClear();
          }}
          style={actionBtnStyle(theme.error)}
          title="Clear all committed plans"
        >
          Clear
        </button>
        <span style={{ color: theme.textMuted, fontSize: 14 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div>
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              style={{
                borderBottom: i < plans.length - 1 ? `1px solid ${theme.borderMuted}` : "none",
              }}
            >
              {/* Plan row */}
              <div
                style={{
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  background: expandedPlan === i ? theme.bgTertiary : "transparent",
                  userSelect: "none",
                }}
                onClick={() => setExpandedPlan(expandedPlan === i ? null : i)}
              >
                <span
                  style={{
                    fontFamily: theme.fontMono,
                    fontSize: 10,
                    color: theme.textMuted,
                    background: theme.bgTertiary,
                    padding: "2px 6px",
                    borderRadius: theme.radius.sm,
                  }}
                >
                  #{plan.id.slice(-6)}
                </span>
                <span style={{ fontSize: 12, color: theme.textPrimary, fontWeight: 600 }}>
                  {port(plan.inputs.origin)} → {port(plan.inputs.destination)}
                </span>
                <span style={{ fontSize: 11, color: theme.textSecondary }}>
                  {plan.inputs.count} × {plan.inputs.unitType} · {plan.inputs.importExport === "E" ? "Export" : "Import"}
                </span>
                <span style={{ fontSize: 11, color: theme.textMuted, marginLeft: "auto" }}>
                  {new Date(plan.committedAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span style={{ color: theme.textMuted, fontSize: 12 }}>
                  {expandedPlan === i ? "▲" : "▼"}
                </span>
              </div>

              {/* Expanded plan detail */}
              {expandedPlan === i && (
                <div
                  style={{
                    padding: "10px 16px 14px",
                    background: theme.bgPrimary,
                    borderTop: `1px solid ${theme.borderMuted}`,
                  }}
                >
                  {plan.assignments.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: theme.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          marginBottom: 6,
                        }}
                      >
                        Barge assignments
                      </div>
                      {plan.assignments.map((a, ai) => (
                        <div
                          key={ai}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                            padding: "4px 0",
                            borderBottom: `1px solid ${theme.borderMuted}`,
                          }}
                        >
                          <span style={{ fontWeight: 700, color: theme.textPrimary }}>
                            {a.voyage.barge}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: theme.fontMono,
                              color: theme.textMuted,
                            }}
                          >
                            {a.voyage.code}
                          </span>
                          <span style={{ color: theme.textSecondary }}>
                            {port(a.voyage.portFrom)} → {port(a.voyage.portTo)}
                          </span>
                          <span style={{ color: theme.textMuted, fontSize: 11 }}>
                            dep. {fmtDate(a.voyage.depart)}
                          </span>
                          <span style={{ marginLeft: "auto" }}>
                            <StatusPill status={a.status}>
                              {a.containersAssigned} ctrs
                            </StatusPill>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {plan.truckFallback && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: theme.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          marginBottom: 6,
                        }}
                      >
                        Truck
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          color: theme.textSecondary,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: theme.textPrimary, fontFamily: theme.fontMono }}>
                          {plan.truckFallback.truck}
                        </span>
                        <span>
                          {plan.truckFallback.addressFrom} → {plan.truckFallback.addressTo}
                        </span>
                        <span>{plan.truckFallback.transportDate} {plan.truckFallback.transportTime}</span>
                        <span>{plan.truckFallback.transportUser}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function actionBtnStyle(color) {
  return {
    padding: "4px 10px",
    borderRadius: 6,
    border: `1px solid ${color}44`,
    background: "transparent",
    color,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };
}
