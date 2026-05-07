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
 * Given user inputs, find viable voyages and spread containers across them.
 *
 * @param {object} params
 * @param {Array}   params.voyages         - All candidate voyages with shape:
 *                                           { portFrom, portTo, depart, arrive,
 *                                             bargeMaxTeu, teuUsed, barge }
 * @param {string}  params.origin          - Port code for the origin terminal
 * @param {string}  params.destination     - Port code for the destination terminal
 * @param {number}  params.containerCount  - Number of containers to ship
 * @param {string}  params.containerType   - Unit type key from UNIT_TEU
 * @param {string}  params.currDate        - ISO date: ignore voyages departing before this
 * @param {string}  params.dueDate         - ISO date: voyages arriving after this are "late"
 *
 * Rules:
 *  1. Voyage must go from origin to destination (direct or via ROTTE hub)
 *  2. Voyage must depart on or after currDate
 *  3. Spread containers greedily across on-time voyages first, then late
 *  4. Sort order: on-time < late, then earlier departure, then more capacity
 *  5. Never assign more TEU than bargeMaxTeu minus teuUsed allows
 *
 * @returns {{ assignments, totalTeu, teuPerCntr, unassigned, error }}
 */
export function planRoute({
  voyages,
  origin,
  destination,
  containerCount,
  containerType,
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
      const availTeu = Math.max(0, v.bargeMaxTeu - v.teuUsed);
      const availCntrs = Math.floor(availTeu / teuPerCntr);
      return {
        ...v,
        availTeu,
        availCntrs,
        isLate: new Date(v.arrive) > due,
      };
    })
    .filter((v) => v.availCntrs > 0);

  if (candidates.length === 0) {
    return {
      assignments: [],
      totalTeu: 0,
      unassigned: containerCount,
      error: "no_capacity",
    };
  }

  // 3. Sort: on-time first, then earlier departure, then most capacity
  candidates.sort((a, b) => {
    if (a.isLate !== b.isLate) return a.isLate ? 1 : -1;
    const depDiff = new Date(a.depart) - new Date(b.depart);
    if (depDiff !== 0) return depDiff;
    return b.availTeu - a.availTeu;
  });

  // 4. Greedy assignment
  let remaining = containerCount;
  const assignments = [];

  for (const v of candidates) {
    if (remaining <= 0) break;

    const assign = Math.min(remaining, v.availCntrs);
    const teuAssigned = assign * teuPerCntr;
    const teuAfter = v.teuUsed + teuAssigned;
    const teuPctAfter = pct(teuAfter, v.bargeMaxTeu);

    assignments.push({
      voyage: v,
      containersAssigned: assign,
      teuAssigned,
      teuAfter,
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
