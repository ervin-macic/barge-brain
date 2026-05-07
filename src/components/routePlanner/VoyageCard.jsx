import { useState } from "react";
import { theme } from "../../data/theme";
import { BARGE_COLORS } from "../../data/constants";
import { port, fmtDT, fmtDate } from "./format";
import StatusPill from "./StatusPill";
import TeuBar from "./TeuBar";

export default function VoyageCard({ assignment, index }) {
  const {
    voyage: v,
    containersAssigned,
    teuAssigned,
    teuAfter,
    teuPctAfter,
    weightAssigned,
    weightAfter,
    weightPctAfter,
    status,
  } = assignment;

  const fmtWeight = (kg) =>
    kg != null && kg > 0 ? (kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`) : null;
  const bc = BARGE_COLORS[v.barge] || theme.textSecondary;
  const [open, setOpen] = useState(false);
  const isLate = status === "late";

  const borderColor =
    isLate || status === "critical"
      ? theme.error
      : status === "warning"
      ? theme.warning
      : theme.borderMuted;

  return (
    <div
      style={{
        border: `1.5px solid ${borderColor}`,
        borderRadius: theme.radius.lg,
        background: isLate ? theme.errorBg : theme.bgSecondary,
        overflow: "hidden",
        transition: "all 0.2s",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {/* Assignment number */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: theme.infoBg,
            color: theme.info,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>

        {/* Barge dot + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: bc,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary }}>
            {v.barge}
          </span>
          <span style={{ fontSize: 11, color: theme.textMuted }}>· {v.bargeName}</span>
          <span
            style={{
              fontSize: 11,
              color: theme.textSecondary,
              marginLeft: 4,
              fontFamily: theme.fontMono,
              background: theme.bgTertiary,
              padding: "1px 6px",
              borderRadius: theme.radius.sm,
            }}
          >
            {v.code}
          </span>
        </div>

        {/* Route arrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: theme.textSecondary,
          }}
        >
          <span style={{ fontWeight: 600, color: theme.textPrimary }}>{port(v.portFrom)}</span>
          <span style={{ color: theme.textMuted }}>→</span>
          <span style={{ fontWeight: 600, color: theme.textPrimary }}>{port(v.portTo)}</span>
        </div>

        {/* Containers assigned + pill + chevron */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: theme.info, lineHeight: 1 }}>
              {containersAssigned}
            </div>
            <div style={{ fontSize: 10, color: theme.textMuted }}>containers</div>
          </div>

          <StatusPill status={status}>
            {status === "late" ? "LATE" : `${teuPctAfter}%`}
          </StatusPill>
          <span style={{ color: theme.textMuted, fontSize: 14 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* TEU bar always visible */}
      <div style={{ padding: "0 16px 10px" }}>
        <TeuBar used={v.teuUsed} max={v.bargeMaxTeu} extra={teuAssigned} />
      </div>

      {/* Expanded detail */}
      {open && (
        <div
          style={{
            borderTop: `1px solid ${theme.borderMuted}`,
            padding: "14px 16px",
            background: theme.bgPrimary,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {/* Schedule */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: theme.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Schedule
            </div>
            {[
              ["Departs", v.depart],
              ["Arrives", v.arrive],
            ].map(([l, d]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  padding: "3px 0",
                  borderBottom: `1px solid ${theme.borderMuted}`,
                }}
              >
                <span style={{ color: theme.textSecondary }}>{l}</span>
                <span style={{ fontFamily: theme.fontMono, color: theme.textPrimary }}>
                  {fmtDT(d)}
                </span>
              </div>
            ))}
          </div>

          {/* Capacity after assignment */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: theme.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              TEU capacity
            </div>
            {[
              ["Currently used",  `${v.teuUsed} TEU`],
              ["Your containers", `+${teuAssigned} TEU (${containersAssigned} × ${teuAssigned / containersAssigned})`],
              ["Total after",     `${teuAfter} / ${v.bargeMaxTeu} TEU`],
              ["Remaining",       `${v.bargeMaxTeu - teuAfter} TEU`],
            ].map(([l, val]) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  padding: "3px 0",
                  borderBottom: `1px solid ${theme.borderMuted}`,
                }}
              >
                <span style={{ color: theme.textSecondary }}>{l}</span>
                <span style={{ fontFamily: theme.fontMono, color: theme.textPrimary }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Weight capacity after assignment */}
          {v.bargeMaxWeight && fmtWeight(weightAssigned) && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                Weight capacity
              </div>
              {[
                ["Max barge weight",  fmtWeight(v.bargeMaxWeight)],
                ["Your containers",   `+${fmtWeight(weightAssigned)} (${containersAssigned} × ${fmtWeight(weightAssigned / containersAssigned)})`],
                ["Total after",       `${fmtWeight(weightAfter)} / ${fmtWeight(v.bargeMaxWeight)} (${weightPctAfter}%)`],
                ["Remaining",         fmtWeight(v.bargeMaxWeight - weightAfter)],
              ].map(([l, val]) => (
                <div
                  key={l}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    padding: "3px 0",
                    borderBottom: `1px solid ${theme.borderMuted}`,
                  }}
                >
                  <span style={{ color: theme.textSecondary }}>{l}</span>
                  <span style={{ fontFamily: theme.fontMono, color: theme.textPrimary }}>{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Terminal stops */}
          {v.stops && v.stops.length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                Terminal stops on this voyage
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {v.stops.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: theme.bgSecondary,
                      border: `1px solid ${theme.borderMuted}`,
                      borderRadius: theme.radius.md,
                      padding: "6px 10px",
                      fontSize: 11,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: theme.textPrimary }}>
                      {port(s.address)}
                    </div>
                    <div style={{ color: theme.textMuted, fontSize: 10 }}>
                      ETA {fmtDate(s.eta)} · {s.ld === "L" ? "Load" : "Discharge"}
                    </div>
                    {s.cargoClose && (
                      <div style={{ color: theme.warning, fontSize: 10 }}>
                        Closes {fmtDate(s.cargoClose)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
