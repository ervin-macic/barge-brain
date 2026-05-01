import { planRoute, UNIT_TEU, pct } from "./routePlanner";

// ── UNIT_TEU ──────────────────────────────────────────────────────────────────

describe("UNIT_TEU", () => {
  test("20ft types count as 1 TEU", () => {
    expect(UNIT_TEU["20DV"]).toBe(1);
    expect(UNIT_TEU["20HC"]).toBe(1);
  });

  test("40ft and 45ft types count as 2 TEU", () => {
    expect(UNIT_TEU["40DV"]).toBe(2);
    expect(UNIT_TEU["40HC"]).toBe(2);
    expect(UNIT_TEU["40RH"]).toBe(2);
    expect(UNIT_TEU["45HC"]).toBe(2);
  });
});

// ── pct ───────────────────────────────────────────────────────────────────────

describe("pct", () => {
  test("rounds to nearest integer", () => {
    expect(pct(50, 100)).toBe(50);
    expect(pct(1, 3)).toBe(33); // 33.33… → 33
  });

  test("returns 0 when max is 0 or falsy", () => {
    expect(pct(10, 0)).toBe(0);
    expect(pct(10, null)).toBe(0);
  });
});

// ── Synthetic voyage helpers ──────────────────────────────────────────────────

function makeVoyage(overrides) {
  return {
    code: "V001",
    barge: "DEC",
    portFrom: "VEGHE",
    portTo: "ROTTE",
    depart: "2026-03-01T08:00:00",
    arrive: "2026-03-01T18:00:00",
    bargeMaxTeu: 80,
    teuUsed: 0,
    ...overrides,
  };
}

const NOW = "2026-02-28T00:00:00";
const DUE = "2026-03-05T00:00:00";

// ── Error paths ───────────────────────────────────────────────────────────────

describe("planRoute – no eligible voyages", () => {
  test("error: no_voyages when no voyage matches the corridor", () => {
    const voyages = [makeVoyage({ portFrom: "OSS", portTo: "TIEL" })];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 2,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBe("no_voyages");
    expect(result.unassigned).toBe(2);
    expect(result.assignments).toHaveLength(0);
  });

  test("error: no_voyages when all matching voyages departed before currDate", () => {
    const voyages = [makeVoyage({ depart: "2026-02-01T08:00:00", arrive: "2026-02-01T18:00:00" })];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 1,
      containerType: "20DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBe("no_voyages");
  });

  test("error: no_voyages for voyages missing depart or arrive", () => {
    const voyages = [makeVoyage({ depart: null }), makeVoyage({ arrive: null })];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 1,
      containerType: "20DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBe("no_voyages");
  });
});

describe("planRoute – no capacity", () => {
  test("error: no_capacity when all matching voyages are full", () => {
    // bargeMaxTeu === teuUsed → 0 available TEU
    const voyages = [makeVoyage({ bargeMaxTeu: 80, teuUsed: 80 })];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 2,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBe("no_capacity");
    expect(result.assignments).toHaveLength(0);
  });

  test("error: no_capacity when available TEU is less than 1 container's worth", () => {
    // 1 TEU free but container type needs 2 → floor(1/2) = 0 availCntrs
    const voyages = [makeVoyage({ bargeMaxTeu: 81, teuUsed: 80 })];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 1,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBe("no_capacity");
  });
});

// ── Direct assignment ─────────────────────────────────────────────────────────

describe("planRoute – direct lane", () => {
  test("assigns all containers to a single voyage with sufficient capacity", () => {
    const voyages = [makeVoyage({ bargeMaxTeu: 80, teuUsed: 0 })];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBeNull();
    expect(result.unassigned).toBe(0);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].containersAssigned).toBe(5);
    expect(result.assignments[0].teuAssigned).toBe(10); // 5 × 2 TEU
    expect(result.teuPerCntr).toBe(UNIT_TEU["40DV"]);
    expect(result.totalTeu).toBe(10);
  });

  test("spreads containers across two voyages when first is partially full", () => {
    const voyages = [
      makeVoyage({ code: "V001", bargeMaxTeu: 10, teuUsed: 6 }), // 4 TEU free → 2 × 40DV
      makeVoyage({ code: "V002", bargeMaxTeu: 20, teuUsed: 0, depart: "2026-03-02T08:00:00", arrive: "2026-03-02T18:00:00" }),
    ];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBeNull();
    expect(result.unassigned).toBe(0);
    expect(result.assignments).toHaveLength(2);
    expect(result.assignments[0].containersAssigned).toBe(2);
    expect(result.assignments[1].containersAssigned).toBe(3);
  });

  test("totalTeu equals containerCount × teuPerCntr regardless of capacity", () => {
    const voyages = [makeVoyage({ bargeMaxTeu: 100, teuUsed: 0 })];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 4,
      containerType: "20DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.totalTeu).toBe(4 * UNIT_TEU["20DV"]); // 4
    expect(result.teuPerCntr).toBe(1);
  });
});

// ── Rotterdam hub routing ─────────────────────────────────────────────────────

describe("planRoute – hub routing via Rotterdam", () => {
  test("includes VEGHE→ROTTE legs when routing VEGHE→OSS", () => {
    const voyages = [
      // Only 1 TEU free → absorbs exactly 1 × 20DV
      makeVoyage({ code: "V_HUB1", portFrom: "VEGHE", portTo: "ROTTE", bargeMaxTeu: 2, teuUsed: 1 }),
      // Handles the remainder
      makeVoyage({ code: "V_HUB2", portFrom: "ROTTE", portTo: "OSS", bargeMaxTeu: 20, teuUsed: 0, depart: "2026-03-02T08:00:00", arrive: "2026-03-02T18:00:00" }),
      makeVoyage({ code: "V_SKIP", portFrom: "TIEL", portTo: "KAT" }), // unrelated — excluded
    ];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "OSS",
      containerCount: 2,
      containerType: "20DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBeNull();
    const usedCodes = result.assignments.map((a) => a.voyage.code);
    expect(usedCodes).toContain("V_HUB1");
    expect(usedCodes).toContain("V_HUB2");
    expect(usedCodes).not.toContain("V_SKIP");
  });

  test("does not apply hub routing when origin or destination is already ROTTE", () => {
    // ROTTE→ROTTE is neither direct nor valid hub — should yield no_voyages
    const voyages = [makeVoyage({ portFrom: "VEGHE", portTo: "OSS" })];
    const result = planRoute({
      voyages,
      origin: "ROTTE",
      destination: "ROTTE",
      containerCount: 1,
      containerType: "20DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBe("no_voyages");
  });
});

// ── On-time vs late ordering ──────────────────────────────────────────────────

describe("planRoute – on-time vs late ordering", () => {
  test("on-time voyage appears first in assignments even if it departs later", () => {
    const voyages = [
      // Departs earlier but arrives AFTER dueDate → late
      makeVoyage({
        code: "LATE",
        bargeMaxTeu: 80,
        teuUsed: 0,
        depart: "2026-03-01T08:00:00",
        arrive: "2026-03-10T00:00:00", // after DUE
      }),
      // Departs later but arrives BEFORE dueDate → on-time
      makeVoyage({
        code: "ONTIME",
        bargeMaxTeu: 80,
        teuUsed: 0,
        depart: "2026-03-02T08:00:00",
        arrive: "2026-03-03T00:00:00", // before DUE
      }),
    ];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 2,
      containerType: "20DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBeNull();
    // All containers should land on the on-time voyage (enough capacity)
    expect(result.assignments[0].voyage.code).toBe("ONTIME");
    expect(result.assignments[0].isLate).toBe(false);
  });

  test("late voyages are assigned when on-time capacity is exhausted", () => {
    const voyages = [
      makeVoyage({
        code: "ONTIME",
        bargeMaxTeu: 4,
        teuUsed: 2,  // only 1 × 20DV slot free
        depart: "2026-03-01T08:00:00",
        arrive: "2026-03-03T00:00:00",
      }),
      makeVoyage({
        code: "LATE",
        bargeMaxTeu: 40,
        teuUsed: 0,
        depart: "2026-03-01T08:00:00",
        arrive: "2026-03-10T00:00:00",
      }),
    ];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "20DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBeNull();
    expect(result.unassigned).toBe(0);
    expect(result.assignments.length).toBeGreaterThanOrEqual(2);
    expect(result.assignments[0].isLate).toBe(false);
    expect(result.assignments[1].isLate).toBe(true);
    expect(result.assignments[1].status).toBe("late");
  });
});

// ── Partial assignment (more containers than capacity) ────────────────────────

describe("planRoute – partial assignment", () => {
  test("unassigned > 0 when total capacity is less than containerCount", () => {
    // Only 4 TEU free → 2 × 40DV; we request 5
    const voyages = [makeVoyage({ bargeMaxTeu: 4, teuUsed: 0 })];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.unassigned).toBe(3);
    expect(result.assignments[0].containersAssigned).toBe(2);
  });
});

// ── Assignment status labels ──────────────────────────────────────────────────

describe("planRoute – assignment status", () => {
  test("status ok when teuPct after assignment is below 80%", () => {
    const voyages = [makeVoyage({ bargeMaxTeu: 100, teuUsed: 0 })];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 10,
      containerType: "40DV", // 20 TEU → 20% of 100
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.assignments[0].status).toBe("ok");
  });

  test("status warning when teuPct is 80–94%", () => {
    const voyages = [makeVoyage({ bargeMaxTeu: 100, teuUsed: 60 })];
    // Adding 10 × 40DV = 20 TEU → 80 / 100 = 80%
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 10,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.assignments[0].status).toBe("warning");
    expect(result.assignments[0].teuPctAfter).toBe(80);
  });

  test("status critical when teuPct >= 95%", () => {
    const voyages = [makeVoyage({ bargeMaxTeu: 20, teuUsed: 17 })];
    // 3 TEU free, assign 1 × 20DV (1 TEU) → 18/20 = 90% ... add more
    // 2 TEU free, assign 1 × 40DV (2 TEU) → 19/20 = 95%
    const v = makeVoyage({ bargeMaxTeu: 20, teuUsed: 17 });
    // 3 TEU free → floor(3/2) = 1 × 40DV, 17+2=19, 19/20 = 95%
    const result = planRoute({
      voyages: [v],
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 1,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.assignments[0].teuPctAfter).toBe(95);
    expect(result.assignments[0].status).toBe("critical");
  });
});
