import { useState } from "react";
import { useRaw } from "../context/RawDataContext";
import { BARGE_COLORS, PORT_LABELS } from "../data/constants";
import { barColor, barBgColor } from "../utils/legHelpers";
import { theme } from "../data/theme";
import SummaryBar from "../components/SummaryBar";

export default function CapacityView({ legs }) {
  const raw = useRaw();
  const [bargeFilter, setBargeFilter] = useState("ALL");
  const barges = ["ALL", ...Object.keys(raw.barges).sort()];

  const filtered = bargeFilter === "ALL" ? legs : legs.filter((l) => l.barge === bargeFilter);

  const segMap = {};
  filtered
    .filter((l) => l.portFrom && l.portTo && l.teu !== null)
    .forEach((leg) => {
      const key = `${leg.portFrom}→${leg.portTo}`;
      if (!segMap[key]) segMap[key] = { portFrom: leg.portFrom, portTo: leg.portTo, legs: [] };
      segMap[key].legs.push(leg);
    });

  const segments = Object.entries(segMap)
    .map(([key, s]) => {
      const n = s.legs.length;
      const withTeu = s.legs.filter((l) => l.teuPct != null);
      const avgTeuPct = withTeu.reduce((a, l) => a + l.teuPct, 0) / (withTeu.length || 1);
      const maxTeuPct = Math.max(...s.legs.map((l) => l.teuPct || 0));
      const withWt = s.legs.filter((l) => l.weightPct != null);
      const avgWtPct = withWt.reduce((a, l) => a + l.weightPct, 0) / (withWt.length || 1);
      const totalTeu = s.legs.reduce((a, l) => a + (l.teu || 0), 0);
      const totalCap = s.legs.reduce((a, l) => a + (l.maxTeu || 0), 0);
      const freeTeu = totalCap - totalTeu;
      return { key, ...s, n, avgTeuPct, maxTeuPct, avgWtPct, totalTeu, totalCap, freeTeu };
    })
    .sort((a, b) => b.avgTeuPct - a.avgTeuPct);

  const bargeStats = Object.entries(raw.barges).map(([code, info]) => {
    const bLegs = legs.filter((l) => l.barge === code && l.teuPct !== null);
    const avgUtil = bLegs.length ? bLegs.reduce((a, l) => a + l.teuPct, 0) / bLegs.length : null;
    const maxUtil = bLegs.length ? Math.max(...bLegs.map((l) => l.teuPct)) : null;
    const totalLegs = legs.filter((l) => l.barge === code && l.depart).length;
    return { code, info, bLegs: bLegs.length, totalLegs, avgUtil, maxUtil };
  })
    .filter((b) => b.totalLegs > 0)
    .sort((a, b) => (b.avgUtil || 0) - (a.avgUtil || 0));

  return (
    <div>
      <SummaryBar legs={legs} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {barges.map((b) => (
          <button
            key={b}
            onClick={() => setBargeFilter(b)}
            style={{
              padding: "6px 14px",
              borderRadius: theme.radius.md,
              border: `1px solid ${bargeFilter === b ? BARGE_COLORS[b] || theme.accent : theme.border}`,
              background: bargeFilter === b ? `${BARGE_COLORS[b] || theme.accent}15` : theme.bgSecondary,
              color: bargeFilter === b ? BARGE_COLORS[b] || theme.accent : theme.textSecondary,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: bargeFilter === b ? 600 : 500,
            }}
          >
            {b}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div
          style={{
            background: theme.bgSecondary,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius.lg,
            padding: 20,
            boxShadow: theme.shadowSm,
          }}
        >
          <h3
            style={{
              color: theme.textSecondary,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              margin: "0 0 16px",
            }}
          >
            Segments — TEU Load
          </h3>
          {segments.length === 0 && (
            <div style={{ color: theme.textMuted, fontSize: 13 }}>No capacity data for selection.</div>
          )}
          {segments.map((seg) => (
            <div
              key={seg.key}
              style={{
                background: theme.bgPrimary,
                border: `1px solid ${theme.borderMuted}`,
                borderRadius: theme.radius.md,
                padding: "14px 16px",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, color: theme.textPrimary, fontSize: 13 }}>
                  {PORT_LABELS[seg.portFrom] || seg.portFrom} → {PORT_LABELS[seg.portTo] || seg.portTo}
                </div>
                <div style={{ fontSize: 11, color: theme.textSecondary }}>{seg.n} {seg.n === 1 ? "trip" : "trips"}</div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                  <span>Avg TEU load</span>
                  <span style={{ color: barColor(seg.avgTeuPct), fontWeight: 600 }}>{seg.avgTeuPct.toFixed(1)}%</span>
                </div>
                <div style={{ height: 8, background: theme.bgTertiary, borderRadius: theme.radius.sm, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, seg.avgTeuPct)}%`,
                      height: "100%",
                      background: `linear-gradient(90deg,${barBgColor(seg.avgTeuPct)},${barColor(seg.avgTeuPct)})`,
                      borderRadius: theme.radius.sm,
                    }}
                  />
                </div>
              </div>

              {seg.avgWtPct > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                    <span>Avg weight load</span>
                    <span>{seg.avgWtPct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: theme.bgTertiary, borderRadius: theme.radius.sm, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, seg.avgWtPct)}%`,
                        height: "100%",
                        background: theme.textMuted,
                        borderRadius: theme.radius.sm,
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: theme.successBg,
                    color: theme.success,
                    padding: "3px 10px",
                    borderRadius: theme.radius.sm,
                    fontSize: 11,
                  }}
                >
                  Free: ~{seg.freeTeu.toFixed(0)} TEU avg
                </span>
                {seg.maxTeuPct >= 90 && (
                  <span
                    style={{
                      background: theme.errorBg,
                      color: theme.error,
                      padding: "3px 10px",
                      borderRadius: theme.radius.sm,
                      fontSize: 11,
                    }}
                  >
                    ⚠ Peak {seg.maxTeuPct.toFixed(0)}%
                  </span>
                )}
                <span
                  style={{
                    background: theme.bgTertiary,
                    color: theme.textSecondary,
                    padding: "3px 10px",
                    borderRadius: theme.radius.sm,
                    fontSize: 11,
                  }}
                >
                  {seg.totalTeu.toFixed(0)}/{seg.totalCap} TEU total
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: theme.bgSecondary,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius.lg,
            padding: 20,
            boxShadow: theme.shadowSm,
          }}
        >
          <h3
            style={{
              color: theme.textSecondary,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              margin: "0 0 16px",
            }}
          >
            Barge Utilisation Summary
          </h3>
          {bargeStats.map(({ code, info, totalLegs, avgUtil, maxUtil }) => (
            <div
              key={code}
              style={{
                background: theme.bgPrimary,
                border: `1px solid ${theme.borderMuted}`,
                borderRadius: theme.radius.md,
                padding: "14px 16px",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <span style={{ fontWeight: 700, color: BARGE_COLORS[code] || theme.accent, fontSize: 14 }}>{code}</span>
                  <span style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 8 }}>{info.descr}</span>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: theme.textSecondary }}>
                  <div>{totalLegs} legs</div>
                  <div>Cap: {info.maxTeu} TEU</div>
                </div>
              </div>

              {avgUtil !== null ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                      <span>Avg utilisation</span>
                      <span style={{ color: barColor(avgUtil), fontWeight: 600 }}>{avgUtil.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 8, background: theme.bgTertiary, borderRadius: theme.radius.sm, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(100, avgUtil)}%`,
                          height: "100%",
                          background: `linear-gradient(90deg,${barBgColor(avgUtil)},${barColor(avgUtil)})`,
                          borderRadius: theme.radius.sm,
                        }}
                      />
                    </div>
                  </div>
                  {maxUtil && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                        <span>Peak</span>
                        <span style={{ color: barColor(maxUtil), fontWeight: 600 }}>{maxUtil.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 5, background: theme.bgTertiary, borderRadius: theme.radius.sm, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(100, maxUtil)}%`,
                            height: "100%",
                            background: barColor(maxUtil),
                            borderRadius: theme.radius.sm,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 11, color: theme.textMuted, fontStyle: "italic" }}>No TEU data available</div>
              )}

              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { k: "max20", l: "20ft" },
                  { k: "max40", l: "40ft" },
                  { k: "max45", l: "45ft" },
                ].map(
                  (x) =>
                    info[x.k] && (
                      <span
                        key={x.k}
                        style={{
                          background: theme.bgTertiary,
                          color: theme.textSecondary,
                          padding: "2px 8px",
                          borderRadius: theme.radius.sm,
                          fontSize: 10,
                        }}
                      >
                        {x.l}: {info[x.k]}
                      </span>
                    )
                )}
              </div>
            </div>
          ))}

          <div
            style={{
              background: theme.bgPrimary,
              border: `1px solid ${theme.borderMuted}`,
              borderRadius: theme.radius.md,
              padding: "14px 16px",
              marginTop: 12,
            }}
          >
            <h4
              style={{
                color: theme.textSecondary,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                margin: "0 0 12px",
              }}
            >
              Network — Port Connections
            </h4>
            {["ROTTE", "VEGHE", "OSS", "TIEL", "KAT"].map((port) => {
              const from = legs.filter((l) => l.portFrom === port && l.depart).length;
              const to = legs.filter((l) => l.portTo === port && l.depart).length;
              const connections = [
                ...new Set(
                  legs
                    .filter((l) => l.portFrom === port || l.portTo === port)
                    .flatMap((l) => [l.portFrom, l.portTo])
                    .filter((p) => p && p !== port)
                ),
              ];
              return (
                <div key={port} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: theme.textPrimary, fontSize: 12 }}>{PORT_LABELS[port] || port}</span>
                    <span style={{ fontSize: 11, color: theme.textSecondary }}>↑{from} ↓{to}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {connections.map((c) => (
                      <span
                        key={c}
                        style={{
                          background: theme.bgTertiary,
                          color: theme.textSecondary,
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 10,
                        }}
                      >
                        ↔ {PORT_LABELS[c] || c}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
