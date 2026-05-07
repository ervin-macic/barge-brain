import { useState, useMemo } from "react";
import { theme } from "../data/theme";
import { TODAY, START } from "../data/constants";
import { planRoute, getEligibleVoyages, UNIT_TEU } from "../utils/routePlanner";
import PlanInputs from "../components/routePlanner/PlanInputs";
import PlanEmptyState from "../components/routePlanner/PlanEmptyState";
import ResultErrorCard from "../components/routePlanner/ResultErrorCard";
import PlanSummaryBanner from "../components/routePlanner/PlanSummaryBanner";
import PlanTimeline from "../components/routePlanner/PlanTimeline";
import AssignmentsTable from "../components/routePlanner/AssignmentsTable";
import VoyageCard from "../components/routePlanner/VoyageCard";

const todayStr = TODAY.toISOString().slice(0, 10);
const startStr = START.toISOString().slice(0, 10);

export default function RoutePlanner({ data }) {
  const voyages = data?.voyages || [];
  const ports   = data?.ports   || [];

  const [origin,      setOrigin]      = useState("ROTTE");
  const [destination, setDestination] = useState("VEGHE");
  const [count,       setCount]       = useState(30);
  const [unitType,    setUnitType]    = useState("40HC");
  const [currDate,    setCurrDate]    = useState(todayStr > startStr ? todayStr : startStr);
  const [dueDate,     setDueDate]     = useState("2026-03-01");
  const [result,      setResult]      = useState(null);
  const [hasPlanned,  setHasPlanned]  = useState(false);

  const teuNeeded = count * (UNIT_TEU[unitType] || 2);

  const routeVoyages = useMemo(
    () => getEligibleVoyages({ voyages, origin, destination, currDate }),
    [voyages, origin, destination, currDate]
  );

  const totalAvailTeu = useMemo(
    () => routeVoyages.reduce((s, v) => s + Math.max(0, v.bargeMaxTeu - v.teuUsed), 0),
    [routeVoyages]
  );

  function handlePlan() {
    const r = planRoute({
      voyages,
      origin,
      destination,
      containerCount: count,
      containerType: unitType,
      currDate,
      dueDate,
    });
    setResult(r);
    setHasPlanned(true);
  }

  function handleFormChange(patch) {
    if ("origin" in patch)      setOrigin(patch.origin);
    if ("destination" in patch) setDestination(patch.destination);
    if ("count" in patch)       setCount(patch.count);
    if ("unitType" in patch)    setUnitType(patch.unitType);
    if ("currDate" in patch)    setCurrDate(patch.currDate);
    if ("dueDate" in patch)     setDueDate(patch.dueDate);
    setResult(null);
  }

  const canPlan = origin !== destination && count >= 0 && dueDate && dueDate > currDate;
  const assignedTotal = result?.assignments.reduce((s, a) => s + a.containersAssigned, 0) ?? 0;

  const showError =
    hasPlanned &&
    result &&
    (result.assignments.length === 0 || result.error === "no_capacity");

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
          value={{ origin, destination, count, unitType, currDate, dueDate }}
          onChange={handleFormChange}
          ports={ports}
          summary={{ teuNeeded, voyageCount: routeVoyages.length, totalAvailTeu }}
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

          {hasPlanned && result?.assignments.length > 0 && (
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
        </div>
      </div>
    </div>
  );
}
