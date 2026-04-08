import { PORT_LABELS } from "../data/constants";
import { statusLevel } from "./legHelpers";

const INLAND_PORTS = ["VEGHE", "OSS", "TIEL", "KAT"];
const STAGES = ["Ocean", "Port", "Inland terminal", "Out for pickup / final delivery", "Completed"];
const ISSUE_MAP = {
  ok: "On Time",
  warning: "Minor Delay",
  high: "Major Delay",
  critical: "Critical",
};

function getStage(leg) {
  const fromRotte = leg.portFrom === "ROTTE";
  const toRotte = leg.portTo === "ROTTE";
  const toInland = INLAND_PORTS.includes(leg.portTo);

  if (fromRotte && leg.ie === "E") return 0; // Ocean - discharge from vessel
  if (toRotte && leg.ie === "I") return 4; // Completed - arrived at port
  if (fromRotte || toRotte) return 1; // Port - at Rotterdam
  if (leg.ie === "I" && toInland) return 3; // Out for pickup
  return 2; // Inland terminal
}

function getUnitType(leg) {
  const teu = leg.teu ?? 0;
  if (teu < 40) return "20ft Standard";
  if (teu < 80) return "40ft Standard";
  return "40ft High Cube";
}

function getRotterdamPort(leg) {
  if (leg.portFrom === "ROTTE" || leg.portTo === "ROTTE") {
    return PORT_LABELS.ROTTE || "Rotterdam";
  }
  return PORT_LABELS[leg.portFrom] || leg.portFrom;
}

/**
 * Transform legs from rawData into scatter plot point format (Figma-like).
 * Each leg becomes one point. Keeps rawData.js unchanged.
 */
export function legsToScatterPoints(legs) {
  return legs
    .filter((l) => l.code && l.depart && (l.teuPct != null || l.portFrom))
    .map((leg, idx) => {
      const level = statusLevel(leg);
      const stage = getStage(leg);
      const nok = (leg.expNok || 0) + (leg.impNok || 0);

      return {
        id: leg.code,
        x: leg.teuPct != null ? leg.teuPct : 50,
        y: stage,
        yLabel: STAGES[stage],
        category: STAGES[stage],
        issue: ISSUE_MAP[level] || "On Time",
        bookingNumber: leg.code?.replace(/\D/g, "").slice(-6) || String(idx + 100000),
        rotterdamPort: getRotterdamPort(leg),
        voyageOn: leg.code,
        inlandTerminal: PORT_LABELS[leg.portTo] || leg.portTo || "—",
        unitType: getUnitType(leg),
        customs: false,
        released: (leg.impBlocked || 0) === 0 && (leg.impNotReleased || 0) === 0,
        blocked: (leg.expBlocked || 0) > 0 || (leg.impBlocked || 0) > 0,
        hasIssues: nok > 0 || !leg.appt,
        date: leg.depart
          ? new Date(leg.depart).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
        barge: leg.barge,
        portFrom: leg.portFrom,
        portTo: leg.portTo,
        ie: leg.ie,
      };
    });
}

export { STAGES, ISSUE_MAP };
