import { useState, useMemo } from "react";
import { theme } from "../data/theme";
import { TODAY, START } from "../data/constants";
import {
  planRoute,
  getEligibleVoyages,
  findNoSplitAlternatives,
  UNIT_TEU,
  UNIT_WEIGHT_KG,
  voyageWeightUsed,
} from "../utils/routePlanner";
import trucksData from "../data/trucksData.json";
import PlanInputs from "../components/routePlanner/PlanInputs";
import PlanEmptyState from "../components/routePlanner/PlanEmptyState";
import ResultErrorCard from "../components/routePlanner/ResultErrorCard";
import PlanSummaryBanner from "../components/routePlanner/PlanSummaryBanner";
import PlanTimeline from "../components/routePlanner/PlanTimeline";
import AssignmentsTable from "../components/routePlanner/AssignmentsTable";
import VoyageCard from "../components/routePlanner/VoyageCard";
import TruckFallbackCard from "../components/routePlanner/TruckFallbackCard";
import NoSplitAlternatives from "../components/routePlanner/NoSplitAlternatives";
import CommittedPlansPanel from "../components/routePlanner/CommittedPlansPanel";

const COMMITTED_PLANS_KEY = "barge_brain_committed_plans";

const todayStr = TODAY.toISOString().slice(0, 10);
const startStr = START.toISOString().slice(0, 10);

/** Pick a random truck with a random date+time within [currDate, dueDate]. */
function generateTruckFallback(currDate, dueDate) {
  const truck = trucksData[Math.floor(Math.random() * trucksData.length)];
  const fromMs = new Date(currDate).getTime();
  const toMs = new Date(dueDate).getTime();
  const randMs = fromMs + Math.random() * (toMs - fromMs);
  const randDate = new Date(randMs);
  const dateStr = randDate.toISOString().slice(0, 10);
  const h = Math.floor(6 + Math.random() * 14);
  const m = Math.floor(Math.random() * 60);
  const timeStr = String(h).padStart(2, "0") + String(m).padStart(2, "0");
  return { ...truck, transportDate: dateStr, transportTime: timeStr };
}

/** Build CSV string from an array of committed plan objects. */
function buildCsv(plans) {
  const headers = [
    "Plan ID",
    "Committed At",
    "Origin",
    "Destination",
    "Count",
    "Unit Type",
    "Weight/Cntr (kg)",
    "Flow",
    "Curr Date",
    "Due Date",
    "Row Type",
    "Voyage Code",
    "Barge",
    "From",
    "To",
    "Departs",
    "Arrives",
    "Containers Assigned",
    "TEU Assigned",
    "Status",
    "Truck",
    "Transport User",
    "Transport Date",
    "Transport Time",
  ];

  const rows = [];
  for (const plan of plans) {
    const base = [
      plan.id,
      plan.committedAt,
      plan.inputs.origin,
      plan.inputs.destination,
      plan.inputs.count,
      plan.inputs.unitType,
      plan.inputs.weightPerCntr,
      plan.inputs.importExport === "E" ? "Export" : "Import",
      plan.inputs.currDate,
      plan.inputs.dueDate,
    ];
    for (const a of plan.assignments) {
      rows.push([
        ...base,
        "barge",
        a.voyage.code,
        a.voyage.barge,
        a.voyage.portFrom,
        a.voyage.portTo,
        a.voyage.depart,
        a.voyage.arrive,
        a.containersAssigned,
        a.teuAssigned,
        a.status,
        "",
        "",
        "",
        "",
      ]);
    }
    if (plan.truckFallback) {
      const t = plan.truckFallback;
      rows.push([
        ...base,
        "truck",
        "",
        "",
        t.addressFrom,
        t.addressTo,
        "",
        "",
        plan.inputs.count,
        "",
        "",
        t.truck,
        t.transportUser,
        t.transportDate,
        t.transportTime,
      ]);
    }
  }

  return [headers, ...rows]
    .map((r) =>
      r
        .map((cell) => `"${String(cell == null ? "" : cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
}

export default function RoutePlanner({ data }) {
  const voyages = useMemo(() => data?.voyages || [], [data]);
  const ports = useMemo(() => data?.ports || [], [data]);

  const [origin, setOrigin] = useState("ROTTE");
  const [destination, setDestination] = useState("VEGHE");
  const [count, setCount] = useState(30);
  const [unitType, setUnitType] = useState("40HC");
  const [weightPerCntr, setWeightPerCntr] = useState(UNIT_WEIGHT_KG["40HC"]);
  const [importExport, setImportExport] = useState("I");
  const [currDate, setCurrDate] = useState(todayStr > startStr ? todayStr : startStr);
  const [dueDate, setDueDate] = useState("2026-03-01");
  const [result, setResult] = useState(null);
  const [noSplitAlts, setNoSplitAlts] = useState(null);
  const [hasPlanned, setHasPlanned] = useState(false);

  // Session-only: tracks TEU + weight added to voyages by committed plans.
  // Resets on page reload — keeping plannerData baseline clean.
  const [committedCapacity, setCommittedCapacity] = useState({});
  // { [voyageCode]: { addedTeu: number, addedWeight: number } }

  // Persistent committed plan records for display and CSV export.
  const [committedPlans, setCommittedPlans] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(COMMITTED_PLANS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  // Apply committed capacity adjustments to voyage list so the planner
  // reflects containers already assigned in this session.
  const adjustedVoyages = useMemo(() => {
    if (!Object.keys(committedCapacity).length) return voyages;
    return voyages.map((v) => {
      const adj = committedCapacity[v.code];
      if (!adj) return v;
      return {
        ...v,
        teuUsed: v.teuUsed + adj.addedTeu,
        _extraWeight: (v._extraWeight || 0) + adj.addedWeight,
      };
    });
  }, [voyages, committedCapacity]);

  const teuNeeded = count * (UNIT_TEU[unitType] || 2);
  const weightNeeded = count * weightPerCntr;

  const routeVoyages = useMemo(
    () => getEligibleVoyages({ voyages: adjustedVoyages, origin, destination, currDate }),
    [adjustedVoyages, origin, destination, currDate]
  );

  const totalAvailTeu = useMemo(
    () => routeVoyages.reduce((s, v) => s + Math.max(0, v.bargeMaxTeu - v.teuUsed), 0),
    [routeVoyages]
  );

  const totalAvailWeight = useMemo(
    () =>
      routeVoyages.reduce((s, v) => {
        const wUsed = voyageWeightUsed(v);
        return s + Math.max(0, (v.bargeMaxWeight || 0) - wUsed);
      }, 0),
    [routeVoyages]
  );

  function handlePlan() {
    const r = planRoute({
      voyages: adjustedVoyages,
      origin,
      destination,
      containerCount: count,
      containerType: unitType,
      weightPerCntr,
      importExport,
      currDate,
      dueDate,
    });

    if (r.error === "export_late") {
      r.truckFallback = generateTruckFallback(currDate, dueDate);
    }

    setResult(r);

    const alts = findNoSplitAlternatives({
      voyages: adjustedVoyages,
      origin,
      destination,
      containerCount: count,
      containerType: unitType,
      weightPerCntr,
      currDate,
      dueDate,
    });
    setNoSplitAlts(alts);
    setHasPlanned(true);
  }

  function handleFormChange(patch) {
    if ("origin" in patch) setOrigin(patch.origin);
    if ("destination" in patch) setDestination(patch.destination);
    if ("count" in patch) setCount(patch.count);
    if ("unitType" in patch) {
      setUnitType(patch.unitType);
      // Reset weight default when unit type changes
      setWeightPerCntr(UNIT_WEIGHT_KG[patch.unitType] || 24000);
    }
    if ("weightPerCntr" in patch) setWeightPerCntr(patch.weightPerCntr);
    if ("importExport" in patch) setImportExport(patch.importExport);
    if ("currDate" in patch) setCurrDate(patch.currDate);
    if ("dueDate" in patch) setDueDate(patch.dueDate);
    setResult(null);
    setNoSplitAlts(null);
  }

  function handleCommit() {
    if (!result) return;
    const hasAssignments = result.assignments && result.assignments.length > 0;
    const hasTruck = Boolean(result.truckFallback);
    if (!hasAssignments && !hasTruck) return;

    // Update session-level capacity so subsequent plans reflect these containers
    if (hasAssignments) {
      setCommittedCapacity((prev) => {
        const next = { ...prev };
        for (const a of result.assignments) {
          const code = a.voyage.code;
          const existing = next[code] || { addedTeu: 0, addedWeight: 0 };
          next[code] = {
            addedTeu: existing.addedTeu + a.teuAssigned,
            addedWeight: existing.addedWeight + a.containersAssigned * weightPerCntr,
          };
        }
        return next;
      });
    }

    // Persist committed plan record for display/CSV
    const plan = {
      id: `plan_${Date.now()}`,
      committedAt: new Date().toISOString(),
      inputs: {
        origin,
        destination,
        count,
        unitType,
        weightPerCntr,
        importExport,
        currDate,
        dueDate,
      },
      assignments: result.assignments,
      truckFallback: result.truckFallback || null,
    };

    const updatedPlans = [...committedPlans, plan];
    setCommittedPlans(updatedPlans);
    try {
      localStorage.setItem(COMMITTED_PLANS_KEY, JSON.stringify(updatedPlans));
    } catch {
      // localStorage unavailable — plan still visible in this session
    }

    // Clear current result so the user can plan again with updated capacity
    setResult(null);
    setNoSplitAlts(null);
    setHasPlanned(false);
  }

  function handleDownloadCsv() {
    if (!committedPlans.length) return;
    const csv = buildCsv(committedPlans);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `committed_plans_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleClearPlans() {
    setCommittedPlans([]);
    try {
      localStorage.removeItem(COMMITTED_PLANS_KEY);
    } catch {
      // ignore
    }
  }

  const canPlan = origin !== destination && count >= 0 && dueDate && dueDate > currDate;
  const assignedTotal = result?.assignments.reduce((s, a) => s + a.containersAssigned, 0) ?? 0;

  const showError =
    hasPlanned &&
    result &&
    (result.assignments.length === 0 || result.error === "no_capacity");

  const showResults = hasPlanned && result?.assignments.length > 0;
  const showTruck = hasPlanned && result?.truckFallback;

  // Show no-split alts when the main plan splits across >1 voyage,
  // or when there's a truck fallback but alts exist on barge
  const showNoSplitAlts =
    noSplitAlts &&
    noSplitAlts.length > 0 &&
    (result?.assignments.length > 1 || result?.error === "export_late");

  const canCommit =
    hasPlanned &&
    result &&
    (result.assignments.length > 0 || result.truckFallback);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: theme.textPrimary,
            letterSpacing: -0.4,
          }}
        >
          Route Planner
        </h1>
        {Object.keys(committedCapacity).length > 0 && (
          <div
            style={{
              fontSize: 11,
              color: theme.success,
              marginTop: 4,
            }}
          >
            Session capacity adjusted — {Object.keys(committedCapacity).length} voyage
            {Object.keys(committedCapacity).length !== 1 ? "s" : ""} updated from committed plans
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: input panel */}
        <PlanInputs
          value={{ origin, destination, count, unitType, weightPerCntr, importExport, currDate, dueDate }}
          onChange={handleFormChange}
          ports={ports}
          summary={{ teuNeeded, weightNeeded, voyageCount: routeVoyages.length, totalAvailTeu, totalAvailWeight }}
          canPlan={canPlan}
          onPlan={handlePlan}
        />

        {/* Right: results */}
        <div>
          {!hasPlanned && <PlanEmptyState />}

          {showError && (
            <ResultErrorCard
              error={result.error}
              origin={origin}
              destination={destination}
              dueDate={dueDate}
            />
          )}

          {showTruck && (
            <div style={{ marginTop: showError ? 16 : 0 }}>
              <TruckFallbackCard
                truckFallback={result.truckFallback}
                containerCount={count}
              />
            </div>
          )}

          {showResults && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <PlanSummaryBanner
                assignedTotal={assignedTotal}
                result={result}
                count={count}
              />

              {/* Unassigned warning */}
              {result.unassigned > 0 && (
                <div
                  style={{
                    background: theme.errorBg,
                    border: `1px solid ${theme.error}44`,
                    borderRadius: theme.radius.md,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: theme.error,
                  }}
                >
                  <strong>{result.unassigned} containers</strong> could not be assigned —
                  insufficient capacity on scheduled voyages.
                </div>
              )}

              {/* Timeline */}
              <div
                style={{
                  background: theme.bgSecondary,
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.border}`,
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: theme.textPrimary,
                    marginBottom: 12,
                  }}
                >
                  Voyage timeline
                </div>
                <PlanTimeline assignments={result.assignments} dueDate={dueDate} currDate={currDate} />
              </div>

              <AssignmentsTable
                assignments={result.assignments}
                origin={origin}
                destination={destination}
                dueDate={dueDate}
              />

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: theme.textPrimary,
                  marginTop: 4,
                }}
              >
                Voyage details
              </div>
              {result.assignments.map((a, i) => (
                <VoyageCard key={i} assignment={a} index={i} />
              ))}
            </div>
          )}

          {/* No-split alternatives */}
          {showNoSplitAlts && (
            <div style={{ marginTop: showResults || showTruck ? 20 : 0 }}>
              <NoSplitAlternatives
                alternatives={noSplitAlts}
                containerCount={count}
              />
            </div>
          )}

          {/* Commit plan button */}
          {canCommit && (
            <div style={{ marginTop: 20 }}>
              <button
                onClick={handleCommit}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: theme.radius.md,
                  background: theme.success,
                  color: "#fff",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                ✓ Commit this plan
              </button>
              <p
                style={{
                  fontSize: 11,
                  color: theme.textMuted,
                  margin: "6px 0 0",
                  textAlign: "center",
                }}
              >
                Committing updates voyage capacity for this session and saves the plan for CSV export.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Committed plans panel — full width below the grid */}
      <CommittedPlansPanel
        plans={committedPlans}
        onDownload={handleDownloadCsv}
        onClear={handleClearPlans}
      />
    </div>
  );
}
