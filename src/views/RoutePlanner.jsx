import { useState, useMemo } from "react";

const T = {
  bg:         "#F8FAFC",
  surface:    "#FFFFFF",
  surfaceAlt: "#F3F3F5",
  border:     "rgba(0,0,0,0.09)",
  borderMid:  "#E2E8F0",
  text:       "#030213",
  textSub:    "#64748B",
  textMuted:  "#94A3B8",
  accent:     "#0EA5E9",
  success:    "#10B981",
  successBg:  "#D1FAE5",
  warning:    "#F59E0B",
  warningBg:  "#FEF3C7",
  error:      "#EF4444",
  errorBg:    "#FEE2E2",
  info:       "#6366F1",
  infoBg:     "#E0E7FF",
  radius:     10,
  radiusSm:   6,
};

const BARGE_COLORS = {
  AFS:"#6366f1", ALF:"#22c55e", ALL:"#f59e0b", AMI:"#14b8a6",
  AMO:"#a78bfa", ANT:"#f97316", DEC:"#06b6d4", FRS:"#64748b",
  LEE:"#ec4899", LEH:"#84cc16", LRD:"#fb923c", MEY:"#e879f9", VIC:"#38bdf8"
};

const PORT_LABELS = {
  ROTTE:"Rotterdam", VEGHE:"Veghel", OSS:"Oss",
  TIEL:"Tiel", KAT:"Katendrecht"
};

const UNIT_TYPES = ["20DV","20HC","40DV","40HC","40RH","45HC"];
const UNIT_TEU   = { "20DV":1,"20HC":1,"40DV":2,"40HC":2,"40RH":2,"45HC":2 };
const UNIT_LABELS= {
  "20DV":"20ft Dry","20HC":"20ft Hi-Cube",
  "40DV":"40ft Dry","40HC":"40ft Hi-Cube","40RH":"40ft Reefer","45HC":"45ft Hi-Cube"
};

const port = p => PORT_LABELS[p] || p || "—";
const fmtDT = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}) : "—";
const pct = (u,m) => m ? Math.round(u/m*100) : 0;

// ── Planner algorithm ────────────────────────────────────────────────────────
/**
 * Given user inputs (origin, destination, containerCount, containerType,
 * dueDate), find all viable voyages and spread containers across them.
 *
 * Rules:
 * 1. Voyage must go from origin → destination (direct or via ROTTE hub)
 * 2. Voyage must depart after currDate and arrive before dueDate
 * 3. Spread containers across voyages by available capacity (largest-first)
 * 4. Never exceed bargeMaxTeu per voyage leg
 * 5. Return list of assignments: { voyage, containersAssigned, teuNeeded, ... }
 */
function planRoute({ voyages, origin, destination, containerCount, containerType, currDate, dueDate}) {
  const now = new Date(currDate);
  const due = new Date(dueDate);
  const teuPerCntr = UNIT_TEU[containerType] || 2;

  // 1. Get ALL future voyages (don’t filter by due date)
  const eligible = voyages.filter(v => {
    if (!v.depart || !v.arrive) return false;

    const dep = new Date(v.depart);
    if (dep < now) return false;

    const direct = v.portFrom === origin && v.portTo === destination;
    const viaHub =
      origin !== "ROTTE" &&
      destination !== "ROTTE" &&
      (
        (v.portFrom === origin && v.portTo === "ROTTE") ||
        (v.portFrom === "ROTTE" && v.portTo === destination)
      );

    return direct || viaHub;
  });

  if (eligible.length === 0) {
    return { assignments: [], totalTeu: 0, unassigned: containerCount, error: "no_voyages" };
  }

  // 2. Split into on-time vs late
  const candidates = eligible
    .map(v => {
      const arr = new Date(v.arrive);
      const availTeu = Math.max(0, v.bargeMaxTeu - v.teuUsed);
      const availCntrs = Math.floor(availTeu / teuPerCntr);

      return {
        ...v,
        availTeu,
        availCntrs,
        isLate: arr > due,
      };
    })
    .filter(v => v.availCntrs > 0);

  if (candidates.length === 0) {
    return { assignments: [], totalTeu: 0, unassigned: containerCount, error: "no_capacity" };
  }

  // 3. Sort:
  // - On-time first
  // - Then by departure
  // - Then by capacity
  candidates.sort((a, b) => {
    if (a.isLate !== b.isLate) return a.isLate ? 1 : -1;
    const depDiff = new Date(a.depart) - new Date(b.depart);
    if (depDiff !== 0) return depDiff;
    return b.availTeu - a.availTeu;
  });

  // 4. Assign containers
  let remaining = containerCount;
  const assignments = [];

  for (const v of candidates) {
    if (remaining <= 0) break;

    const assign = Math.min(remaining, v.availCntrs);
    const teuAssigned = assign * teuPerCntr;
    const newTeu = v.teuUsed + teuAssigned;
    const teuPctAfter = pct(newTeu, v.bargeMaxTeu);

    assignments.push({
      voyage: v,
      containersAssigned: assign,
      teuAssigned,
      teuAfter: newTeu,
      teuPctAfter,
      isLate: v.isLate,
      status: v.isLate
        ? "late"
        : teuPctAfter >= 95
        ? "critical"
        : teuPctAfter >= 80
        ? "warning"
        : "ok",
    });

    remaining -= assign;
  }

  return {
    assignments,
    totalTeu: containerCount * teuPerCntr,
    teuPerCntr,
    unassigned: remaining,
    error: null,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Label({ children, ...p }) {
  return <label style={{ fontSize:12, fontWeight:600, color:T.textSub,
    display:"block", marginBottom:5, ...p }}>{children}</label>;
}

function Input({ style, ...p }) {
  return <input style={{
    width:"100%", padding:"8px 10px", borderRadius:T.radiusSm,
    border:`1px solid ${T.borderMid}`, fontSize:13, background:T.surface,
    color:T.text, boxSizing:"border-box", outline:"none", ...style
  }} {...p} />;
}

function Select({ style, children, ...p }) {
  return <select style={{
    width:"100%", padding:"8px 10px", borderRadius:T.radiusSm,
    border:`1px solid ${T.borderMid}`, fontSize:13, background:T.surface,
    color:T.text, boxSizing:"border-box", outline:"none", ...style
  }} {...p}>{children}</select>;
}

function Card({ children, style }) {
  return <div style={{
    background:T.surface, borderRadius:T.radius,
    border:`1px solid ${T.border}`, padding:"18px 20px", ...style
  }}>{children}</div>;
}

function TeuBar({ used, max, extra=0, showLabel=true }) {
  const usedPct  = Math.min(100, pct(used, max));
  const extraPct = Math.min(100 - usedPct, pct(extra, max));
  const totalPct = usedPct + extraPct;
  const color = totalPct >= 95 ? T.error : totalPct >= 80 ? T.warning : T.success;

  return (
    <div>
      <div style={{ height:8, background:T.surfaceAlt, borderRadius:4, overflow:"hidden", position:"relative" }}>
        <div style={{ position:"absolute", left:0, top:0, height:"100%",
          width:`${usedPct}%`, background:T.textMuted, borderRadius:4, transition:"width 0.3s" }} />
        <div style={{ position:"absolute", left:`${usedPct}%`, top:0, height:"100%",
          width:`${extraPct}%`, background:color, borderRadius:4, opacity:0.85, transition:"all 0.3s" }} />
      </div>
      {showLabel && (
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
          <span style={{ fontSize:10, color:T.textMuted }}>
            {used} used {extra > 0 ? `+ ${extra} planned` : ""}
          </span>
          <span style={{ fontSize:10, color: totalPct >= 95 ? T.error : T.textSub, fontWeight:600 }}>
            {totalPct}% / {max} TEU
          </span>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, children }) {
  const map = {
  ok:       { bg:T.successBg, color:T.success },
  warning:  { bg:T.warningBg, color:T.warning },
  critical: { bg:T.errorBg,   color:T.error },
  late:     { bg:"#FFE4E6",   color:"#BE123C" },
  info:     { bg:T.infoBg,    color:T.info },
};
  const s = map[status] || map.info;
  return (
    <span style={{ background:s.bg, color:s.color, borderRadius:4,
      padding:"2px 7px", fontSize:11, fontWeight:700 }}>
      {children}
    </span>
  );
}

function VoyageCard({ assignment, index }) {
  const { voyage: v, containersAssigned, teuAssigned, teuAfter, teuPctAfter, status } = assignment;
  const bc = BARGE_COLORS[v.barge] || "#64748b";
  const [open, setOpen] = useState(false);
  const isLate = status === "late";

  return (
      <div style={{
        border: `1.5px solid ${
          isLate ? T.error :
          status === "critical" ? T.error :
          status === "warning" ? T.warning :
          T.borderMid
        }`,
        borderRadius: T.radius,
        background: isLate ? T.errorBg : T.surface,
        overflow: "hidden",
        transition: "all 0.2s"
      }}>
      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
        cursor:"pointer", userSelect:"none" }}
        onClick={() => setOpen(o => !o)}>

        {/* Assignment number */}
        <div style={{ width:28, height:28, borderRadius:"50%", background:T.infoBg,
          color:T.info, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, fontWeight:700, flexShrink:0 }}>
          {index + 1}
        </div>

        {/* Barge dot + name */}
        <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
          <span style={{ width:10, height:10, borderRadius:"50%", background:bc, flexShrink:0 }}/>
          <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{v.barge}</span>
          <span style={{ fontSize:11, color:T.textMuted }}>· {v.bargeName}</span>
          <span style={{ fontSize:11, color:T.textSub, marginLeft:4,
            fontFamily:"monospace", background:T.surfaceAlt,
            padding:"1px 6px", borderRadius:3 }}>{v.code}</span>
        </div>

        {/* Route arrow */}
        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:T.textSub }}>
          <span style={{ fontWeight:600, color:T.text }}>{port(v.portFrom)}</span>
          <span style={{ color:T.textMuted }}>→</span>
          <span style={{ fontWeight:600, color:T.text }}>{port(v.portTo)}</span>
        </div>

        {/* Containers assigned */}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:18, fontWeight:700, color:T.info, lineHeight:1 }}>
              {containersAssigned}
            </div>
            <div style={{ fontSize:10, color:T.textMuted }}>containers</div>
          </div>

          <StatusPill status={status}>{status === "late" ? "LATE" : `${teuPctAfter}%`}</StatusPill>
          <span style={{ color:T.textMuted, fontSize:14 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* TEU bar always visible */}
      <div style={{ padding:"0 16px 10px" }}>
        <TeuBar used={v.teuUsed} max={v.bargeMaxTeu} extra={teuAssigned} />
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop:`1px solid ${T.borderMid}`, padding:"14px 16px",
          background:T.bg, display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
              letterSpacing:1, marginBottom:8 }}>Schedule</div>
            {[
              ["Departs", v.depart],
              ["Arrives", v.arrive],
            ].map(([l,d]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between",
                fontSize:12, padding:"3px 0", borderBottom:`1px solid ${T.borderMid}` }}>
                <span style={{ color:T.textSub }}>{l}</span>
                <span style={{ fontFamily:"monospace", color:T.text }}>{fmtDT(d)}</span>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
              letterSpacing:1, marginBottom:8 }}>Capacity after assignment</div>
            {[
              ["Currently used",  `${v.teuUsed} TEU`],
              ["Your containers", `+${teuAssigned} TEU (${containersAssigned} × ${teuAssigned/containersAssigned})`],
              ["Total after",     `${teuAfter} / ${v.bargeMaxTeu} TEU`],
              ["Remaining space", `${v.bargeMaxTeu - teuAfter} TEU`],
            ].map(([l,val]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between",
                fontSize:12, padding:"3px 0", borderBottom:`1px solid ${T.borderMid}` }}>
                <span style={{ color:T.textSub }}>{l}</span>
                <span style={{ fontFamily:"monospace", color:T.text }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Stops */}
          {v.stops && v.stops.length > 0 && (
            <div style={{ gridColumn:"1/-1" }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
                letterSpacing:1, marginBottom:8 }}>Terminal stops on this voyage</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {v.stops.map((s, i) => (
                  <div key={i} style={{ background:T.surface, border:`1px solid ${T.borderMid}`,
                    borderRadius:T.radiusSm, padding:"6px 10px", fontSize:11 }}>
                    <div style={{ fontWeight:600, color:T.text }}>{port(s.address)}</div>
                    <div style={{ color:T.textMuted, fontSize:10 }}>
                      ETA {fmtDate(s.eta)} · {s.ld === "L" ? "Load" : "Discharge"}
                    </div>
                    {s.cargoClose && <div style={{ color:T.warning, fontSize:10 }}>
                      Closes {fmtDate(s.cargoClose)}
                    </div>}
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

// ── Timeline visualisation ────────────────────────────────────────────────────
function PlanTimeline({ assignments, dueDate }) {
  if (!assignments.length) return null;

  const allDates = assignments.flatMap(a => [a.voyage.depart, a.voyage.arrive].filter(Boolean));
  const minD = new Date(Math.min(...allDates.map(d => new Date(d))));
  const maxD = dueDate ? new Date(dueDate) : new Date(Math.max(...allDates.map(d => new Date(d))));
  const span = maxD - minD;
  const toX = d => ((new Date(d) - minD) / span) * 100;

  return (
    <div style={{ overflowX:"auto" }}>
      <div style={{ minWidth:500, position:"relative", paddingTop:8 }}>
        {/* Track */}
        <div style={{ height:2, background:T.borderMid, margin:"20px 0 8px", position:"relative" }}>
          {/* Due date marker */}
          {dueDate && (
            <div style={{ position:"absolute", left:`${toX(dueDate)}%`, top:-20, transform:"translateX(-50%)" }}>
              <div style={{ fontSize:9, color:T.error, fontWeight:700, whiteSpace:"nowrap" }}>DUE</div>
              <div style={{ width:1, height:24, background:T.error, margin:"0 auto" }} />
            </div>
          )}
        </div>

        {/* Voyage bars */}
        {assignments.map((a, i) => {
          const bc = BARGE_COLORS[a.voyage.barge] || "#64748b";
          const x1 = toX(a.voyage.depart);
          const x2 = toX(a.voyage.arrive);
          const w = Math.max(1, x2 - x1);
          return (
            <div key={i} style={{ position:"relative", height:34, marginBottom:4 }}>
              <div style={{
                position:"absolute", left:`${x1}%`, width:`${w}%`,
                height:24, borderRadius:4,
                background: bc + "33",
                border:`1.5px solid ${bc}`,
                display:"flex", alignItems:"center", padding:"0 6px", overflow:"hidden",
                minWidth:32
              }}>
                <span style={{ fontSize:10, fontWeight:700, color:bc, whiteSpace:"nowrap" }}>
                  {a.voyage.barge} · {a.containersAssigned} ctrs
                </span>
              </div>
              {/* Depart label */}
              <div style={{ position:"absolute", left:`${x1}%`, top:26,
                fontSize:9, color:T.textMuted, transform:"translateX(-50%)", whiteSpace:"nowrap" }}>
                {fmtDate(a.voyage.depart)}
              </div>
              {/* Arrive label */}
              <div style={{ position:"absolute", left:`${Math.min(99, x2)}%`, top:26,
                fontSize:9, color:T.textMuted, transform:"translateX(-50%)", whiteSpace:"nowrap" }}>
                {fmtDate(a.voyage.arrive)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RoutePlanner({ data }) {
  const voyages = data?.voyages || [];
  const ports   = data?.ports   || [];

  // Form state
  const [origin,      setOrigin]      = useState("ROTTE");
  const [destination, setDestination] = useState("VEGHE");
  const [count,       setCount]       = useState(30);
  const [unitType,    setUnitType]    = useState("40HC");
  const [currDate,     setCurrentDate]     = useState("2026-01-29");
  const [dueDate,     setDueDate]     = useState("2026-03-01");
  const [result,      setResult]      = useState(null);
  const [hasPlanned,  setHasPlanned]  = useState(false);

  const teuNeeded = count * (UNIT_TEU[unitType] || 2);

  // Summary stats for the input panel
  const routeVoyages = useMemo(() =>
    voyages.filter(v =>
      (v.portFrom === origin && v.portTo === destination) ||
      (v.portFrom === origin && v.portTo === "ROTTE") ||
      (v.portFrom === "ROTTE" && v.portTo === destination)
    ), [voyages, origin, destination]);

  const totalAvailTeu = useMemo(() =>
    routeVoyages.reduce((s, v) => s + Math.max(0, v.teuAvail), 0),
  [routeVoyages]);

  function handlePlan() {
    const r = planRoute({ voyages, origin, destination, containerCount: count, containerType: unitType, currDate, dueDate });
    setResult(r);
    setHasPlanned(true);
  }

  const canPlan = origin !== destination && count >= 0 && dueDate && dueDate > currDate;
  const assignedTotal = result?.assignments.reduce((s, a) => s + a.containersAssigned, 0) || 0;

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",
      background:T.bg, minHeight:"100vh", padding:"24px" }}>

      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:T.text, letterSpacing:-0.4 }}>
          Route Planner
        </h1>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20, alignItems:"start" }}>

        {/* ── LEFT: Input panel ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:16 }}>
              Planning inputs
            </div>

            <div style={{ marginBottom:14 }}>
              <Label>Origin</Label>
              <Select value={origin} onChange={e => { setOrigin(e.target.value); setResult(null); }}>
                {ports.map(p => <option key={p} value={p}>{port(p)}</option>)}
              </Select>
            </div>

            <div style={{ marginBottom:14 }}>
              <Label>Destination</Label>
              <Select value={destination} onChange={e => { setDestination(e.target.value); setResult(null); }}>
                {ports.filter(p => p !== origin).map(p => <option key={p} value={p}>{port(p)}</option>)}
              </Select>
            </div>

            <div style={{ marginBottom:14 }}>
              <Label>Number of containers</Label>
              <Input type="number" min={-1} max={500} value={count}
                onChange={e => { setCount(parseInt(e.target.value)); setResult(null); }} />
            </div>

            <div style={{ marginBottom:14 }}>
              <Label>Container type</Label>
              <Select value={unitType} onChange={e => { setUnitType(e.target.value); setResult(null); }}>
                {UNIT_TYPES.map(u => (
                  <option key={u} value={u}>{UNIT_LABELS[u]} ({UNIT_TEU[u]} TEU)</option>
                ))}
              </Select>
            </div>
            <div style={{ marginBottom:14 }}>
              <Label>Current date (planning starts from)</Label>
              <Input
                type="date"
                value={currDate}
                min="2026-01-29"
                max="2026-03-03"
                onChange={e => {
                  setCurrentDate(e.target.value);
                  setResult(null);
                }}
              />
            </div>
            <div style={{ marginBottom:20 }}>
              <Label>Due date (must arrive by)</Label>
              <Input type="date" value={dueDate} min="2026-01-29" max="2027-03-03"
                onChange={e => { setDueDate(e.target.value); setResult(null); }} />
            </div>

            {/* Pre-plan summary */}
            <div style={{ background:T.surfaceAlt, borderRadius:T.radiusSm,
              padding:"10px 12px", marginBottom:16, fontSize:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:T.textSub }}>TEU required</span>
                <span style={{ fontWeight:700, fontFamily:"monospace" }}>{teuNeeded} TEU</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:T.textSub }}>Matching voyages</span>
                <span style={{ fontWeight:700, fontFamily:"monospace" }}>{routeVoyages.length}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:T.textSub }}>Available TEU (total)</span>
                <span style={{ fontWeight:700, fontFamily:"monospace",
                  color: totalAvailTeu >= teuNeeded ? T.success : T.error }}>
                  {Math.round(totalAvailTeu)} TEU
                </span>
              </div>
            </div>

            <button onClick={handlePlan} disabled={!canPlan} style={{
              width:"100%", padding:"10px", borderRadius:T.radiusSm,
              background: canPlan ? T.info : T.borderMid,
              color: canPlan ? "#fff" : T.textMuted,
              border:"none", fontSize:14, fontWeight:700, cursor: canPlan ? "pointer" : "not-allowed",
              transition:"background 0.15s"
            }}>
              Suggest route →
            </button>

            {origin === destination && (
              <p style={{ fontSize:11, color:T.error, margin:"8px 0 0", textAlign:"center" }}>
                Origin and destination must be different
              </p>
            )}
          </Card>

        </div>
        <div>
          {!hasPlanned && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", padding:"80px 20px", color:T.textMuted }}>
              <div style={{ fontSize:18, fontWeight:800 }}>Route Planner</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Set your parameters and click "Suggest route"</div>
              <div style={{ fontSize:12, marginTop:4 }}>
              Indicate origin, destination, current date, due date, containters and container types.
              </div>
            </div>
          )}
          {hasPlanned && result?.assignments.length === 0 && (
            <Card style={{ borderColor:T.error, textAlign:"center", padding:40 }}>
              <div style={{ fontSize:24, marginBottom:8 }}>⚠️</div>
              <div style={{ fontWeight:700, color:T.error, fontSize:14 }}>No voyages found</div>
              <div style={{ color:T.textSub, fontSize:12, marginTop:4 }}>
                No scheduled voyages match {port(origin)} → {port(destination)} arriving before {fmtDate(dueDate)}.
                Try extending the due date or check the route.
              </div>
            </Card>
          )}

          {hasPlanned && result?.error === "no_capacity" && (
            <Card style={{ borderColor:T.warning, textAlign:"center", padding:40 }}>
              <div style={{ fontSize:24, marginBottom:8 }}>📦</div>
              <div style={{ fontWeight:700, color:T.warning, fontSize:14 }}>No capacity available</div>
              <div style={{ color:T.textSub, fontSize:12, marginTop:4 }}>
                Voyages exist on this route but are all at or near full capacity.
                Try a later due date to include more voyages.
              </div>
            </Card>
          )}

          {hasPlanned && result?.assignments.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* Summary banner */}
              <Card style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0,
                padding:0, overflow:"hidden" }}>
                {[
                  { label:"Containers", value: assignedTotal, sub: `of ${count} requested`,
                    color: assignedTotal === count ? T.success : T.warning },
                  { label:"Unassigned",  value: result.unassigned, sub:"need manual planning",
                    color: result.unassigned > 0 ? T.error : T.textMuted },
                  { label:"Voyages used", value: result.assignments.length, sub:"across schedule", color:T.info },
                  { label:"TEU needed",   value: result.totalTeu, sub:`${count} × ${result.teuPerCntr} TEU`, color:T.text },
                ].map(({ label, value, sub, color }, i) => (
                  <div key={label} style={{
                    padding:"16px 20px", textAlign:"center",
                    borderRight: i < 3 ? `1px solid ${T.borderMid}` : "none"
                  }}>
                    <div style={{ fontSize:26, fontWeight:700, color, lineHeight:1 }}>{value}</div>
                    <div style={{ fontSize:11, fontWeight:600, color:T.text, marginTop:3 }}>{label}</div>
                    <div style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>{sub}</div>
                  </div>
                ))}
              </Card>

              {/* Unassigned warning */}
              {result.unassigned > 0 && (
                <div style={{ background:T.errorBg, border:`1px solid ${T.error}44`,
                  borderRadius:T.radiusSm, padding:"10px 14px", fontSize:12, color:T.error }}>
                  <strong>{result.unassigned} containers</strong> could not be assigned —
                  insufficient capacity on scheduled voyages before {fmtDate(dueDate)}.
                  Consider splitting the shipment across a wider time window.
                </div>
              )}

              {/* Timeline */}
              <Card>
                <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:12 }}>
                  Voyage timeline
                </div>
                <PlanTimeline assignments={result.assignments} dueDate={dueDate} />
              </Card>

              {/* Route summary table */}
              <Card style={{ padding:0, overflow:"hidden" }}>
                <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.borderMid}`,
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text }}>
                    Assignment breakdown
                  </span>
                  <span style={{ fontSize:11, color:T.textMuted }}>
                    {port(origin)} → {port(destination)} · by {fmtDate(dueDate)}
                  </span>
                </div>
                {/* Column headers */}
                <div style={{ display:"grid", gridTemplateColumns:"36px 1fr 120px 90px 100px 90px 90px",
                  padding:"8px 16px", background:T.surfaceAlt,
                  fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:0.5 }}>
                  <div>#</div>
                  <div>Barge / Voyage</div>
                  <div>Route</div>
                  <div style={{textAlign:"center"}}>Containers</div>
                  <div style={{textAlign:"center"}}>Departs</div>
                  <div style={{textAlign:"center"}}>Arrives</div>
                  <div style={{textAlign:"right"}}>Load after</div>
                </div>
                {result.assignments.map((a, i) => {
                  const bc = BARGE_COLORS[a.voyage.barge] || "#64748b";
                  const isLate = a.status === "late";

                  const rowBg = isLate
                    ? T.errorBg
                    : i % 2 === 0
                    ? T.surface
                    : T.bg;
                  return (
                    <div key={i} style={{ display:"grid",
                      gridTemplateColumns:"36px 1fr 120px 90px 100px 90px 90px",
                      padding:"10px 16px", background:rowBg,
                      borderBottom:`1px solid ${T.borderMid}`, alignItems:"center",
                      borderLeft:`3px solid ${a.status === "critical" ? T.error : a.status === "warning" ? T.warning : T.success}` }}>
                      <div style={{ fontSize:11, color:T.textMuted, fontWeight:600 }}>{i+1}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ width:8, height:8, borderRadius:"50%", background:bc, flexShrink:0 }}/>
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{a.voyage.barge}</div>
                          <div style={{ fontSize:10, color:T.textMuted, fontFamily:"monospace" }}>{a.voyage.code}</div>
                        </div>
                      </div>
                      <div style={{ fontSize:11, color:T.textSub }}>
                        {port(a.voyage.portFrom)} → {port(a.voyage.portTo)}
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <span style={{ fontSize:16, fontWeight:700, color:T.info }}>{a.containersAssigned}</span>
                        <span style={{ fontSize:10, color:T.textMuted, marginLeft:3 }}>ctrs</span>
                      </div>
                      <div style={{ fontSize:11, textAlign:"center", color:T.textSub, fontFamily:"monospace" }}>
                        {fmtDate(a.voyage.depart)}
                      </div>
                      <div style={{ fontSize:11, textAlign:"center", color:T.textSub, fontFamily:"monospace" }}>
                        {fmtDate(a.voyage.arrive)}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <StatusPill status={a.status}>{a.teuPctAfter}%</StatusPill>
                      </div>
                    </div>
                  );
                })}
              </Card>

              {/* Expanded voyage cards */}
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginTop:4 }}>
                Voyage details
              </div>
              {result.assignments.map((a, i) => (
                <VoyageCard key={i} assignment={a} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
