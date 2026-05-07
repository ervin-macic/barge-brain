/**
 * Route planning algorithm for inland barge logistics.
 *
 * Standalone module — no React dependency — so it can be imported
 * by both UI components and unit tests.
 */

/** TEU equivalent per container unit type. */
export const UNIT_TEU = {
  "20DV": 1,
  "20HC": 1,
  "40DV": 2,
  "40HC": 2,
  "40RH": 2,
  "45HC": 2,
};

/** Default gross weight in kg per container unit type. */
export const UNIT_WEIGHT_KG = {
  "20DV": 18000,
  "20HC": 18000,
  "40DV": 24000,
  "40HC": 24000,
  "40RH": 26000,
  "45HC": 24000,
};

/** Ordered list of container unit type keys (for dropdowns). */
export const UNIT_TYPES = ["20DV", "20HC", "40DV", "40HC", "40RH", "45HC"];

/** Human-readable label for each unit type key. */
export const UNIT_LABELS = {
  "20DV": "20DV",
  "20HC": "20HC",
  "40DV": "40DV",
  "40HC": "40HC",
  "40RH": "40RH",
  "45HC": "45HC",
};

/** Integer utilisation percentage (0 if max is falsy). */
export function pct(used, max) {
  return max ? Math.round((used / max) * 100) : 0;
}

/**
 * Maximum weight currently loaded across all legs of a voyage.
 * Uses the peak leg weight as the binding capacity constraint.
 * Adds any extra weight recorded from committed plans (_extraWeight).
 */
export function voyageWeightUsed(v) {
  const legMax =
    v.legs && v.legs.length > 0
      ? Math.max(...v.legs.map((l) => l.weight || 0))
      : 0;
  return legMax + (v._extraWeight || 0);
}

/**
 * Returns all voyages that serve the requested corridor and depart on or after
 * currDate. Does NOT filter by remaining capacity — call-sites that need only
 * capacity-positive voyages should filter the returned list themselves.
 *
 * @param {object} params
 * @param {Array}  params.voyages      - Full voyage list
 * @param {string} params.origin       - Port code
 * @param {string} params.destination  - Port code
 * @param {string} params.currDate     - ISO date string
 * @returns {Array} filtered voyages
 */
export function getEligibleVoyages({ voyages, origin, destination, currDate }) {
  const now = new Date(currDate);
  return voyages.filter((v) => {
    if (!v.depart || !v.arrive) return false;
    if (new Date(v.depart) < now) return false;

    const direct = v.portFrom === origin && v.portTo === destination;
    const viaHub =
      origin !== "ROTTE" &&
      destination !== "ROTTE" &&
      ((v.portFrom === origin && v.portTo === "ROTTE") ||
        (v.portFrom === "ROTTE" && v.portTo === destination));

    return direct || viaHub;
  });
}

/**
 * Compute the number of containers a voyage can absorb given both TEU and
 * weight constraints.
 *
 * @param {object} v             - Voyage (may include _extraWeight from committed sessions)
 * @param {number} teuPerCntr    - TEU per container
 * @param {number} weightPerCntr - Weight (kg) per container; 0 means no weight check
 * @returns {number}
 */
function availableContainers(v, teuPerCntr, weightPerCntr) {
  const availTeu = Math.max(0, v.bargeMaxTeu - v.teuUsed);
  const byTeu = Math.floor(availTeu / teuPerCntr);

  if (!weightPerCntr || !v.bargeMaxWeight) return byTeu;

  const wUsed = voyageWeightUsed(v);
  const availWeight = Math.max(0, v.bargeMaxWeight - wUsed);
  const byWeight = Math.floor(availWeight / weightPerCntr);

  return Math.min(byTeu, byWeight);
}

/**
 * Given user inputs, find viable voyages and spread containers across them.
 *
 * @param {object} params
 * @param {Array}   params.voyages         - All candidate voyages with shape:
 *                                           { portFrom, portTo, depart, arrive,
 *                                             bargeMaxTeu, teuUsed, bargeMaxWeight,
 *                                             legs, barge, _extraWeight? }
 * @param {string}  params.origin          - Port code for the origin terminal
 * @param {string}  params.destination     - Port code for the destination terminal
 * @param {number}  params.containerCount  - Number of containers to ship
 * @param {string}  params.containerType   - Unit type key from UNIT_TEU
 * @param {number}  [params.weightPerCntr] - Weight (kg) per container; 0 = no weight check
 * @param {string}  [params.importExport]  - "I" | "E"; exports cannot use late voyages
 * @param {string}  params.currDate        - ISO date: ignore voyages departing before this
 * @param {string}  params.dueDate         - ISO date: voyages arriving after this are "late"
 *
 * Rules:
 *  1. Voyage must go from origin to destination (direct or via ROTTE hub)
 *  2. Voyage must depart on or after currDate
 *  3. Capacity = min(availTEU / teuPerCntr, availWeight / weightPerCntr)
 *  4. Exports: ONLY on-time voyages used; if none → error "export_late"
 *  5. Imports: on-time first, late used as overflow fallback
 *  6. Sort: on-time < late, then earlier departure, then most capacity
 *
 * @returns {{ assignments, totalTeu, teuPerCntr, weightPerCntr, unassigned, error }}
 */
export function planRoute({
  voyages,
  origin,
  destination,
  containerCount,
  containerType,
  weightPerCntr = 0,
  importExport = "I",
  currDate,
  dueDate,
}) {
  const due = new Date(dueDate);
  const teuPerCntr = UNIT_TEU[containerType] || 2;

  // 1. Keep voyages that serve the requested corridor (direct or via Rotterdam hub)
  const eligible = getEligibleVoyages({ voyages, origin, destination, currDate });

  if (eligible.length === 0) {
    return {
      assignments: [],
      totalTeu: 0,
      unassigned: containerCount,
      error: "no_voyages",
    };
  }

  // 2. Compute available capacity and late flag per voyage
  const candidates = eligible
    .map((v) => {
      const availCntrs = availableContainers(v, teuPerCntr, weightPerCntr);
      return {
        ...v,
        availCntrs,
        availTeu: Math.max(0, v.bargeMaxTeu - v.teuUsed),
        isLate: new Date(v.arrive) > due,
      };
    })
    .filter((v) => v.availCntrs > 0);

  // 3. For exports, hard-exclude late voyages
  const usableCandidates =
    importExport === "E" ? candidates.filter((v) => !v.isLate) : candidates;

  if (usableCandidates.length === 0) {
    // Distinguish: export with only-late options vs genuinely no capacity
    const error =
      importExport === "E" && candidates.length > 0 ? "export_late" : "no_capacity";
    return {
      assignments: [],
      totalTeu: 0,
      unassigned: containerCount,
      error,
    };
  }

  // 4. Sort: on-time first, then earlier departure, then most capacity
  usableCandidates.sort((a, b) => {
    if (a.isLate !== b.isLate) return a.isLate ? 1 : -1;
    const depDiff = new Date(a.depart) - new Date(b.depart);
    if (depDiff !== 0) return depDiff;
    return b.availCntrs - a.availCntrs;
  });

  // 5. Greedy assignment
  let remaining = containerCount;
  const assignments = [];

  for (const v of usableCandidates) {
    if (remaining <= 0) break;

    const assign = Math.min(remaining, v.availCntrs);
    const teuAssigned = assign * teuPerCntr;
    const teuAfter = v.teuUsed + teuAssigned;
    const teuPctAfter = pct(teuAfter, v.bargeMaxTeu);

    const wUsed = voyageWeightUsed(v);
    const weightAssigned = assign * weightPerCntr;
    const weightAfter = wUsed + weightAssigned;
    const weightPctAfter = v.bargeMaxWeight ? pct(weightAfter, v.bargeMaxWeight) : 0;

    assignments.push({
      voyage: v,
      containersAssigned: assign,
      teuAssigned,
      teuAfter,
      teuPctAfter,
      weightAssigned,
      weightAfter,
      weightPctAfter,
      isLate: v.isLate,
      status: v.isLate
        ? "late"
        : teuPctAfter >= 95 || weightPctAfter >= 95
        ? "critical"
        : teuPctAfter >= 80 || weightPctAfter >= 80
        ? "warning"
        : "ok",
    });

    remaining -= assign;
  }

  return {
    assignments,
    totalTeu: containerCount * teuPerCntr,
    teuPerCntr,
    weightPerCntr,
    unassigned: remaining,
    error: null,
  };
}

/**
 * Find single-voyage (or connected hub-pair) alternatives that can carry ALL
 * containers without splitting them across multiple voyages.
 *
 * Returns up to the top 5 alternatives ranked on-time first, then earliest
 * arrival. Each result item has:
 *   { type: "direct"|"hub", voyages: Voyage[], arriveDate, isLate }
 *
 * @param {object} params
 * @param {Array}   params.voyages
 * @param {string}  params.origin
 * @param {string}  params.destination
 * @param {number}  params.containerCount
 * @param {string}  params.containerType
 * @param {number}  [params.weightPerCntr]
 * @param {string}  params.currDate
 * @param {string}  params.dueDate
 * @returns {Array}
 */
export function findNoSplitAlternatives({
  voyages,
  origin,
  destination,
  containerCount,
  containerType,
  weightPerCntr = 0,
  currDate,
  dueDate,
}) {
  const teuPerCntr = UNIT_TEU[containerType] || 2;
  const due = new Date(dueDate);

  const eligible = getEligibleVoyages({ voyages, origin, destination, currDate });

  const canHoldAll = (v) =>
    availableContainers(v, teuPerCntr, weightPerCntr) >= containerCount;

  // Direct alternatives: single voyage with enough capacity
  const directAlts = eligible
    .filter((v) => v.portFrom === origin && v.portTo === destination && canHoldAll(v))
    .map((v) => ({
      type: "direct",
      voyages: [v],
      arriveDate: v.arrive,
      isLate: new Date(v.arrive) > due,
    }));

  // Hub alternatives: a pair of connecting voyages both with enough capacity
  let hubAlts = [];
  if (origin !== "ROTTE" && destination !== "ROTTE") {
    const toHub = eligible.filter(
      (v) => v.portFrom === origin && v.portTo === "ROTTE" && canHoldAll(v)
    );
    const fromHub = eligible.filter(
      (v) => v.portFrom === "ROTTE" && v.portTo === destination && canHoldAll(v)
    );

    for (const leg1 of toHub) {
      for (const leg2 of fromHub) {
        // leg2 must depart after leg1 arrives
        if (new Date(leg2.depart) >= new Date(leg1.arrive)) {
          hubAlts.push({
            type: "hub",
            voyages: [leg1, leg2],
            arriveDate: leg2.arrive,
            isLate: new Date(leg2.arrive) > due,
          });
        }
      }
    }
  }

  const all = [...directAlts, ...hubAlts];
  all.sort((a, b) => {
    if (a.isLate !== b.isLate) return a.isLate ? 1 : -1;
    return new Date(a.arriveDate) - new Date(b.arriveDate);
  });

  return all.slice(0, 5);
}
