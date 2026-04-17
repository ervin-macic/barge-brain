import { useState, useRef } from "react";
import { RAW } from "../data/rawData";
import { TODAY, PORT_LABELS } from "../data/constants";
import { statusLevel } from "../utils/legHelpers";
import { theme } from "../data/theme";
import Tooltip from "../components/Tooltip";
import FiltersSidebar from "../components/FiltersSidebar";
import SummaryBar from "../components/SummaryBar";

const ROW_H = 52;
const MS_PER_DAY = 86400000;
const NODE_RADIUS = 9;
const PROJECTION_DAYS = 7;

const PORT_GRAPH = {
  ROTTE: { x: 10, y: 50, name: "Rott" },
  TIEL: { x: 50, y: 50, name: "Tiel" },
  VEGHE: { x: 50, y: 88, name: "Veg" },
  OSS: { x: 50, y: 12, name: "Oss" },
  KAT: { x: 90, y: 50, name: "Kat" },
};

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addLocalDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function isSameLocalDay(a, b) {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

function getProjectionRange() {
  const start = startOfLocalDay(addLocalDays(TODAY, -1));
  const end = endOfLocalDay(addLocalDays(TODAY, 5));
  return { start, end };
}

function tPctInProjection(dt, projectionStart, projectionEnd) {
  if (!dt) return null;
  const d = new Date(dt);
  const total = projectionEnd - projectionStart;
  const pos = d - projectionStart;
  return Math.max(0, Math.min(100, (pos / total) * 100));
}

function buildProjectionDayMarkers(projectionStart) {
  const days = [];
  for (let i = 0; i < PROJECTION_DAYS; i += 1) {
    const d = addLocalDays(projectionStart, i);
    days.push({
      pct: (i / PROJECTION_DAYS) * 100,
      label: d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" }),
      day: d.getDay(),
      date: d,
      isToday: isSameLocalDay(d, TODAY),
    });
  }
  return days;
}

function getLegKey(leg) {
  return (
    leg?.code ||
    leg?.id ||
    leg?.legId ||
    `${leg?.barge || ""}__${leg?.depart || ""}__${leg?.portFrom || ""}__${
      leg?.portTo || ""
    }`
  );
}

function getDisplayStatus(leg) {
  return leg?.statusOverride || statusLevel(leg);
}

function filterLegs(legs, filters) {
  let result = legs;
  if (filters.status !== "all") {
    result = result.filter((l) => getDisplayStatus(l) === filters.status);
  }
  if (filters.terminal !== "all") {
    result = result.filter(
      (l) => l.portFrom === filters.terminal || l.portTo === filters.terminal
    );
  }
  return result;
}

function getUtilizationColor(pct) {
  if (pct == null) return theme.textMuted;
  if (pct >= 85) return "#059669";
  if (pct >= 70) return theme.statusOnTime;
  if (pct >= 50) return "#3b82f6";
  if (pct >= 30) return theme.statusMinorDelay;
  return theme.statusMajorDelay;
}

function getLegLineColor(leg) {
  const lvl = getDisplayStatus(leg);
  if (lvl === "critical") return theme.error;
  if (lvl === "warning" || lvl === "high") return theme.warning;
  if (lvl === "pending fix") return theme.pendingFixColour;
  return theme.success;
}

function getPortDisplayName(portCode) {
  return PORT_LABELS[portCode] || portCode || "—";
}

function buildBargeRotation(bLegs) {
  const sorted = [...bLegs].sort(
    (a, b) => new Date(a.depart) - new Date(b.depart)
  );
  if (sorted.length === 0) return null;

  const withTeu = sorted.filter((l) => l.teuPct != null);
  const utilization =
    withTeu.length > 0
      ? withTeu.reduce((a, l) => a + l.teuPct, 0) / withTeu.length
      : null;

  const bargeStatus =
    getDisplayStatus(sorted[sorted.length - 1]) === "critical"
      ? "Late"
      : sorted.some((l) => getDisplayStatus(l) !== "ok")
      ? "At risk"
      : "On time";

  return {
    legs: sorted,
    utilization,
    bargeStatus,
    totalTeu: sorted.reduce((a, l) => a + (l.teu || 0), 0),
  };
}

function getTodayJourneyStatus(bLegs) {
  const todayStart = startOfLocalDay(TODAY).getTime();
  const todayEnd = endOfLocalDay(TODAY).getTime();

  const todayLegs = bLegs.filter((leg) => {
    if (!leg.depart || !leg.arrive) return false;
    const dep = new Date(leg.depart).getTime();
    const arr = new Date(leg.arrive).getTime();
    return dep <= todayEnd && arr >= todayStart;
  });

  if (todayLegs.length === 0) return "on-time";
  if (todayLegs.some((leg) => getDisplayStatus(leg) === "critical")) return "critical";
  if (todayLegs.some((leg) => getDisplayStatus(leg) === "warning" || getDisplayStatus(leg) === "high")) {
    return "warning";
  }
  if (todayLegs.some((leg) => getDisplayStatus(leg) === "pending fix")) {
    return "pending fix";
  }
  return "on-time";
}

function getCurrentBargePosition(allLegs) {
  const now = TODAY.getTime();

  const sorted = [...allLegs]
    .filter((l) => l.depart && l.arrive)
    .sort((a, b) => new Date(a.depart) - new Date(b.depart));

  if (sorted.length === 0) return null;

  for (const leg of sorted) {
    const dep = new Date(leg.depart).getTime();
    const arr = new Date(leg.arrive).getTime();

    if (dep <= now && now <= arr) {
      const progress = arr > dep ? (now - dep) / (arr - dep) : 0;
      return {
        type: "leg",
        from: leg.portFrom,
        to: leg.portTo,
        progress: Math.min(Math.max(progress, 0), 1),
      };
    }
  }

  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const arr = new Date(sorted[i].arrive).getTime();
    if (arr <= now) {
      return { type: "port", port: sorted[i].portTo };
    }
  }

  return { type: "port", port: sorted[0].portFrom };
}

function getAdjustedLinePoints(from, to, radius = NODE_RADIUS) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;

  const ux = dx / len;
  const uy = dy / len;

  return {
    x1: from.x + ux * radius,
    y1: from.y + uy * radius,
    x2: to.x - ux * radius,
    y2: to.y - uy * radius,
    angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

function ShipIcon({ color, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M4 15h16l-2 4H6l-2-4z" />
      <path d="M8 15V8l4-2v9" />
      <path d="M12 6v8" />
      <path d="M14 8h4l2 7" />
      <path d="M3 19h18" />
    </svg>
  );
}

function BargePositionGraph({ position }) {
  const shipCoords = (() => {
    if (!position) return null;

    if (position.type === "port") {
      return PORT_GRAPH[position.port] || null;
    }

    if (position.type === "leg") {
      const from = PORT_GRAPH[position.from];
      const to = PORT_GRAPH[position.to];
      if (!from || !to) return null;

      return {
        x: from.x + (to.x - from.x) * position.progress,
        y: from.y + (to.y - from.y) * position.progress,
      };
    }

    return null;
  })();

  const activeLine =
    position?.type === "leg" &&
    PORT_GRAPH[position.from] &&
    PORT_GRAPH[position.to]
      ? getAdjustedLinePoints(
          PORT_GRAPH[position.from],
          PORT_GRAPH[position.to],
          NODE_RADIUS
        )
      : null;

  const shipAngle =
    position?.type === "leg" &&
    PORT_GRAPH[position.from] &&
    PORT_GRAPH[position.to]
      ? (Math.atan2(
          PORT_GRAPH[position.to].y - PORT_GRAPH[position.from].y,
          PORT_GRAPH[position.to].x - PORT_GRAPH[position.from].x
        ) *
          180) /
        Math.PI
      : 0;

  return (
    <div
      style={{
        position: "relative",
        height: 210,
        border: `1px solid ${theme.borderMuted}`,
        borderRadius: theme.radius.md,
        background: theme.bgPrimary,
        overflow: "hidden",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {activeLine && (
          <line
            x1={activeLine.x1}
            y1={activeLine.y1}
            x2={activeLine.x2}
            y2={activeLine.y2}
            stroke={theme.accent}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.95"
          />
        )}
      </svg>

      {activeLine && (
        <div
          style={{
            position: "absolute",
            left: `${(activeLine.x1 + activeLine.x2) / 2}%`,
            top: `${(activeLine.y1 + activeLine.y2) / 2}%`,
            transform: `translate(-50%, -50%) rotate(${shipAngle}deg)`,
            zIndex: 4,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: "5px solid transparent",
              borderBottom: "5px solid transparent",
              borderLeft: `8px solid ${theme.accent}`,
            }}
          />
        </div>
      )}

      {Object.entries(PORT_GRAPH).map(([code, port]) => {
        const activePort = position?.type === "port" && position.port === code;
        const onLegEndpoint =
          position?.type === "leg" &&
          (position.from === code || position.to === code);

        return (
          <div
            key={code}
            style={{
              position: "absolute",
              left: `${port.x}%`,
              top: `${port.y}%`,
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              minWidth: 70,
              textAlign: "center",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: activePort || onLegEndpoint ? theme.bgPrimary : "#fff",
                border: `2px solid ${activePort ? theme.accent : theme.borderMuted}`,
                boxSizing: "border-box",
                boxShadow: activePort ? `0 0 0 3px ${theme.accentMuted}` : "none",
              }}
            />
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: theme.textSecondary,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              {port.name}
            </div>
          </div>
        );
      })}

      {shipCoords && (
        <div
          style={{
            position: "absolute",
            left: `${shipCoords.x}%`,
            top: `${shipCoords.y}%`,
            transform: `translate(-50%, -50%) rotate(${shipAngle}deg)`,
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <ShipIcon color={theme.textPrimary} size={18} />
        </div>
      )}
    </div>
  );
}

export default function WeeklyBargeView({ legs }) {
  const [tooltip, setTooltip] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hideTimeoutRef = useRef(null);
  const [selectedBarge, setSelectedBarge] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    terminal: "all",
  });
  const [legStatusOverrides, setLegStatusOverrides] = useState({});

  const legsWithOverrides = legs.map((leg) => {
    const key = getLegKey(leg);
    const statusOverride = legStatusOverrides[key];
    return statusOverride ? { ...leg, statusOverride } : leg;
  });

  const { start: projectionStart, end: projectionEnd } = getProjectionRange();
  const filteredLegs = filterLegs(legsWithOverrides, filters);
  const barges = [...new Set(filteredLegs.map((l) => l.barge))].sort();
  const days = buildProjectionDayMarkers(projectionStart);
  const todayPct = tPctInProjection(
    startOfLocalDay(TODAY),
    projectionStart,
    projectionEnd
  );

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const handleMarkPendingFix = (leg) => {
    const key = getLegKey(leg);
    setLegStatusOverrides((prev) => ({
      ...prev,
      [key]: "pending fix",
    }));
  };

  const bargeRows = barges.map((b) => {
    const bLegs = filteredLegs.filter(
      (l) => l.barge === b && l.depart && l.arrive
    );
    const withTeu = bLegs.filter((l) => l.teuPct != null);
    const utilization =
      withTeu.length > 0
        ? withTeu.reduce((a, l) => a + l.teuPct, 0) / withTeu.length
        : null;
    const bargeStatus =
      getDisplayStatus(bLegs[bLegs.length - 1]) === "critical"
        ? "Late"
        : bLegs.some((l) => getDisplayStatus(l) !== "ok")
        ? "At risk"
        : "On time";

    const todayJourneyStatus = getTodayJourneyStatus(bLegs);

    const currentLeg = bLegs.find((leg) => {
      const dep = new Date(leg.depart).getTime();
      const arr = new Date(leg.arrive).getTime();
      const now = TODAY.getTime();
      return dep <= now && now <= arr;
    });

    const currentLegLabel = currentLeg
      ? `${PORT_LABELS[currentLeg.portFrom] || currentLeg.portFrom} → ${
          PORT_LABELS[currentLeg.portTo] || currentLeg.portTo
        }`
      : "";

    return {
      barge: b,
      info: RAW.barges[b] || {},
      bLegs,
      utilization,
      bargeStatus,
      todayJourneyStatus,
      currentLegLabel,
    };
  });

  const projectionLabel = `${projectionStart.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  })} – ${projectionEnd.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return (
    <div>
      <SummaryBar legs={legs} />
      <div
        style={{
          display: "flex",
          minHeight: 400,
          background: theme.bgSecondary,
          border: `1px solid ${theme.borderMuted}`,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          boxShadow: theme.shadowSm,
        }}
      >
        <FiltersSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          legs={legs}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${theme.borderMuted}`,
              alignItems: "center",
              gap: 12,
              padding: "8px 14px",
            }}
          >
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.textPrimary,
                  minWidth: 180,
                  textAlign: "center",
                }}
              >
                {projectionLabel}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: theme.textSecondary,
              }}
            >
              {filteredLegs.length} legs · {barges.length} barges
            </div>
          </div>

          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${theme.borderMuted}`,
            }}
          >
            <div
              style={{
                width: 140,
                flexShrink: 0,
                padding: "10px 14px",
                fontSize: 11,
                color: theme.textSecondary,
                borderRight: `1px solid ${theme.borderMuted}`,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Barge
            </div>
            <div
              style={{
                flex: 1,
                position: "relative",
                height: 32,
                overflowX: "hidden",
              }}
            >
              {days.map((d, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${d.pct}%`,
                    top: 0,
                    height: "100%",
                    borderLeft: d.isToday
                      ? `1px solid ${theme.accent}`
                      : `1px solid ${theme.borderMuted}`,
                    paddingLeft: 4,
                    fontSize: 10,
                    color: d.isToday ? theme.accent : theme.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.label}
                </div>
              ))}
            </div>
            <div
              style={{
                width: 60,
                flexShrink: 0,
                fontSize: 10,
                color: theme.textSecondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Status
            </div>
          </div>

          {bargeRows.map(
            ({
              barge,
              info,
              bLegs,
              utilization,
              bargeStatus,
              todayJourneyStatus,
              currentLegLabel,
            }) => {
              const utilizationColor = getUtilizationColor(utilization);
              const statusColorVal =
                todayJourneyStatus === "critical"
                  ? theme.statusMajorDelay
                  : todayJourneyStatus === "warning"
                  ? theme.statusMinorDelay
                  : todayJourneyStatus === "pending fix"
                  ? theme.pendingFixColour
                  : todayJourneyStatus === "high"
                  ? theme.accent
                  : theme.statusOnTime;

              return (
                <div
                  key={barge}
                  onClick={() =>
                    setSelectedBarge(selectedBarge === barge ? null : barge)
                  }
                  style={{
                    display: "flex",
                    borderBottom: `1px solid ${theme.borderMuted}`,
                    minHeight: ROW_H,
                    cursor: "pointer",
                    background:
                      selectedBarge === barge ? theme.bgPrimary : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 140,
                      flexShrink: 0,
                      padding: "8px 14px",
                      borderRight: `1px solid ${theme.borderMuted}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ShipIcon color={utilizationColor} size={18} />
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: theme.textPrimary,
                            fontSize: 13,
                          }}
                        >
                          {barge}
                        </div>
                        {currentLegLabel ? (
                          <div
                            style={{
                              fontSize: 11,
                              color: theme.textSecondary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {currentLegLabel}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      minHeight: ROW_H,
                      background: theme.bgPrimary,
                    }}
                  >
                    {days.map(
                      (d, i) =>
                        d.isToday && (
                          <div
                            key={i}
                            style={{
                              position: "absolute",
                              left: `${d.pct}%`,
                              top: 0,
                              bottom: 0,
                              borderLeft: `1px dashed ${theme.accentMuted}`,
                              pointerEvents: "none",
                            }}
                          />
                        )
                    )}

                    <div
                      style={{
                        position: "absolute",
                        left: `${todayPct}%`,
                        top: 0,
                        bottom: 0,
                        borderLeft: `2px solid ${theme.error}`,
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    />

                    {bLegs.map((leg, i) => {
                      const dep = new Date(leg.depart).getTime();
                      const arr = new Date(leg.arrive).getTime();
                      const projectionStartMs = projectionStart.getTime();
                      const projectionEndMs = projectionEnd.getTime();
                      const startCut = dep < projectionStartMs;
                      const endCut = arr > projectionEndMs;

                      const s = tPctInProjection(
                        leg.depart,
                        projectionStart,
                        projectionEnd
                      );
                      const e = tPctInProjection(
                        leg.arrive,
                        projectionStart,
                        projectionEnd
                      );
                      if (s === null || e === null) return null;

                      const w = Math.max(e - s, 0.5);
                      const color = getLegLineColor(leg);
                      const startLabel = (
                        PORT_LABELS[leg.portFrom] || leg.portFrom || ""
                      ).charAt(0);
                      const endLabel = (
                        PORT_LABELS[leg.portTo] || leg.portTo || ""
                      ).charAt(0);

                      return (
                        <div
                          key={i}
                          onMouseEnter={(e2) => {
                            if (hideTimeoutRef.current) {
                              clearTimeout(hideTimeoutRef.current);
                              hideTimeoutRef.current = null;
                            }
                            setTooltip(leg);
                            setMousePos({ x: e2.clientX, y: e2.clientY });
                          }}
                          onMouseLeave={() => {
                            hideTimeoutRef.current = setTimeout(
                              () => setTooltip(null),
                              150
                            );
                          }}
                          onMouseMove={(e2) =>
                            setMousePos({ x: e2.clientX, y: e2.clientY })
                          }
                          style={{
                            position: "absolute",
                            left: `${s}%`,
                            width: `${w}%`,
                            top: 23,
                            height: 6,
                            background: color,
                            cursor: "pointer",
                            overflow: "visible",
                            zIndex: 1,
                          }}
                        >
                          {!startCut && (
                            <div
                              style={{
                                position: "absolute",
                                left: -4,
                                top: -1,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#fff",
                                border: "1.5px solid #000",
                                boxSizing: "border-box",
                                zIndex: 3,
                              }}
                            />
                          )}
                          {!endCut && (
                            <div
                              style={{
                                position: "absolute",
                                right: -4,
                                top: -1,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#fff",
                                border: "1.5px solid #000",
                                boxSizing: "border-box",
                                zIndex: 3,
                              }}
                            />
                          )}
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: -18,
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#000",
                              whiteSpace: "nowrap",
                              padding: "0 4px",
                              background: theme.bgSecondary,
                              borderRadius: 3,
                              zIndex: 4,
                              lineHeight: 1.1,
                              transform: "translateX(-10px)",
                            }}
                          >
                            {startLabel}
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              top: -18,
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#000",
                              whiteSpace: "nowrap",
                              padding: "0 4px",
                              background: theme.bgSecondary,
                              borderRadius: 3,
                              transform: "translateX(calc(100% - 10px))",
                              zIndex: 4,
                              lineHeight: 1.1,
                            }}
                          >
                            {endLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      width: 60,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: statusColorVal,
                      }}
                    />
                  </div>
                </div>
              );
            }
          )}

          {bargeRows.length === 0 && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.textSecondary,
                fontSize: 14,
                padding: 40,
              }}
            >
              No legs match the current filters for this projection.
            </div>
          )}
        </div>

        {selectedBarge && (
          <div
            style={{
              width: 320,
              flexShrink: 0,
              padding: 24,
              borderLeft: `1px solid ${theme.borderMuted}`,
              background: theme.bgSecondary,
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px",
                fontSize: 14,
                fontWeight: 600,
                color: theme.textPrimary,
              }}
            >
              Barge Details
            </h3>
            {(() => {
              const row = bargeRows.find((r) => r.barge === selectedBarge);
              if (!row) return null;
              const { bLegs, bargeStatus } = row;
              const position = getCurrentBargePosition(
                legs.filter((l) => l.barge === selectedBarge)
              );

              const positionLabel =
                position == null
                  ? "No live position available"
                  : position.type === "port"
                  ? `At ${getPortDisplayName(position.port)}`
                  : `On leg ${getPortDisplayName(position.from)} → ${getPortDisplayName(
                      position.to
                    )} (${Math.round(position.progress * 100)}%)`;

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <DetailRow label="Barge ID" value={selectedBarge} />
                  <DetailRow
                    label="Status"
                    value={
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                              bargeStatus === "Late"
                                ? theme.statusMajorDelay
                                : bargeStatus === "At risk"
                                ? theme.statusMinorDelay
                                : theme.statusOnTime,
                          }}
                        />
                        {bargeStatus}
                      </span>
                    }
                  />

                  <div
                    style={{
                      paddingTop: 16,
                      borderTop: `1px solid ${theme.borderMuted}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: theme.textSecondary,
                        marginBottom: 8,
                      }}
                    >
                      Current Position
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: theme.textPrimary,
                        marginBottom: 12,
                      }}
                    >
                      {positionLabel}
                    </div>
                    <BargePositionGraph position={position} />
                  </div>

                  <div
                    style={{
                      paddingTop: 16,
                      borderTop: `1px solid ${theme.borderMuted}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: theme.textSecondary,
                        marginBottom: 12,
                      }}
                    >
                      Legs
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {bLegs.map((leg, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background:
                                getDisplayStatus(leg) === "critical"
                                  ? theme.statusMajorDelay
                                  : getDisplayStatus(leg) === "warning"
                                  ? theme.statusMinorDelay
                                  : getDisplayStatus(leg) === "pending fix"
                                  ? theme.pendingFixColour
                                  : theme.statusOnTime,
                              marginTop: 4,
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                color: theme.textPrimary,
                              }}
                            >
                              {PORT_LABELS[leg.portFrom] || leg.portFrom} →{" "}
                              {PORT_LABELS[leg.portTo] || leg.portTo}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: theme.textSecondary,
                              }}
                            >
                              {leg.depart &&
                                new Date(leg.depart).toLocaleString("nl-NL")}{" "}
                              –{" "}
                              {leg.arrive &&
                                new Date(leg.arrive).toLocaleString("nl-NL")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tooltip && (() => {
          const activeTooltipLeg =
            legsWithOverrides.find((leg) => getLegKey(leg) === getLegKey(tooltip)) ||
            tooltip;

          return (
            <Tooltip
              leg={activeTooltipLeg}
              x={mousePos.x}
              y={mousePos.y}
              onMouseEnter={() => {
                if (hideTimeoutRef.current) {
                  clearTimeout(hideTimeoutRef.current);
                  hideTimeoutRef.current = null;
                }
              }}
              onMouseLeave={() => setTooltip(null)}
              onMarkPendingFix={handleMarkPendingFix}
            />
          );
        })()}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
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