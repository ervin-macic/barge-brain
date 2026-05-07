import {
  planRoute,
  getEligibleVoyages,
  findNoSplitAlternatives,
  UNIT_TEU,
  UNIT_WEIGHT_KG,
  voyageWeightUsed,
  pct,
} from "./routePlanner";

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

// ── UNIT_WEIGHT_KG ────────────────────────────────────────────────────────────

describe("UNIT_WEIGHT_KG", () => {
  test("all unit types have a positive default weight", () => {
    for (const k of Object.keys(UNIT_TEU)) {
      expect(UNIT_WEIGHT_KG[k]).toBeGreaterThan(0);
    }
  });

  test("40RH is heavier than 40HC (reefer penalty)", () => {
    expect(UNIT_WEIGHT_KG["40RH"]).toBeGreaterThan(UNIT_WEIGHT_KG["40HC"]);
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

// ── voyageWeightUsed ──────────────────────────────────────────────────────────

describe("voyageWeightUsed", () => {
  test("returns 0 for voyage with no legs", () => {
    expect(voyageWeightUsed({ legs: [] })).toBe(0);
    expect(voyageWeightUsed({})).toBe(0);
  });

  test("returns max leg weight across all legs", () => {
    const v = {
      legs: [
        { weight: 100000 },
        { weight: 250000 },
        { weight: 180000 },
      ],
    };
    expect(voyageWeightUsed(v)).toBe(250000);
  });

  test("adds _extraWeight from committed session capacity", () => {
    const v = {
      legs: [{ weight: 100000 }],
      _extraWeight: 50000,
    };
    expect(voyageWeightUsed(v)).toBe(150000);
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
    bargeMaxWeight: 2000000,
    teuUsed: 0,
    legs: [{ weight: 0, maxWeight: 2000000 }],
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

// ── Weight capacity ───────────────────────────────────────────────────────────

describe("planRoute – weight capacity", () => {
  test("weight constraint limits assignment when TEU is ample but weight is tight", () => {
    // 40 TEU free (enough for 20 × 40DV) but weight allows only 2 containers
    const v = makeVoyage({
      bargeMaxTeu: 80,
      teuUsed: 40,
      bargeMaxWeight: 1000000,
      legs: [{ weight: 950000, maxWeight: 1000000 }],
    });
    const result = planRoute({
      voyages: [v],
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 10,
      containerType: "40DV",
      weightPerCntr: 24000,
      currDate: NOW,
      dueDate: DUE,
    });
    // availWeight = 1000000 - 950000 = 50000; floor(50000/24000) = 2
    expect(result.error).toBeNull();
    expect(result.assignments[0].containersAssigned).toBe(2);
    expect(result.unassigned).toBe(8);
  });

  test("TEU constraint limits assignment when weight is ample but TEU is tight", () => {
    const v = makeVoyage({
      bargeMaxTeu: 10,
      teuUsed: 6,
      bargeMaxWeight: 5000000,
      legs: [{ weight: 0, maxWeight: 5000000 }],
    });
    // TEU: 4 free → floor(4/2) = 2 × 40DV; weight: way more than enough
    const result = planRoute({
      voyages: [v],
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 10,
      containerType: "40DV",
      weightPerCntr: 24000,
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.assignments[0].containersAssigned).toBe(2);
  });

  test("weight=0 disables weight constraint (backward compatible)", () => {
    const v = makeVoyage({
      bargeMaxTeu: 80,
      teuUsed: 0,
      bargeMaxWeight: 1, // impossibly low, should not block if weightPerCntr=0
      legs: [{ weight: 0, maxWeight: 1 }],
    });
    const result = planRoute({
      voyages: [v],
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      weightPerCntr: 0,
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBeNull();
    expect(result.assignments[0].containersAssigned).toBe(5);
  });

  test("assignment includes weightAssigned and weightPctAfter", () => {
    const v = makeVoyage({
      bargeMaxTeu: 80,
      teuUsed: 0,
      bargeMaxWeight: 1000000,
      legs: [{ weight: 0, maxWeight: 1000000 }],
    });
    const result = planRoute({
      voyages: [v],
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      weightPerCntr: 24000,
      currDate: NOW,
      dueDate: DUE,
    });
    const a = result.assignments[0];
    expect(a.weightAssigned).toBe(5 * 24000);
    expect(a.weightAfter).toBe(120000);
    expect(a.weightPctAfter).toBe(12); // 120000/1000000 = 12%
  });

  test("status upgrades to critical when weight pct >= 95%", () => {
    // Weight: 900000 used, 1000000 max → add 96000 (4 × 24000) → 996000/1000000 = 99.6%
    const v = makeVoyage({
      bargeMaxTeu: 200,
      teuUsed: 0,
      bargeMaxWeight: 1000000,
      legs: [{ weight: 900000, maxWeight: 1000000 }],
    });
    const result = planRoute({
      voyages: [v],
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 4,
      containerType: "40DV",
      weightPerCntr: 24000,
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.assignments[0].status).toBe("critical");
  });

  test("status upgrades to warning when weight pct >= 80%", () => {
    // Weight: 750000 used, 1000000 max → add 3 × 24000 = 72000 → 822000/1000000 = 82%
    const v = makeVoyage({
      bargeMaxTeu: 200,
      teuUsed: 0,
      bargeMaxWeight: 1000000,
      legs: [{ weight: 750000, maxWeight: 1000000 }],
    });
    const result = planRoute({
      voyages: [v],
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 3,
      containerType: "40DV",
      weightPerCntr: 24000,
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.assignments[0].status).toBe("warning");
  });
});

// ── Export-late hard fail ─────────────────────────────────────────────────────

describe("planRoute – export late hard fail", () => {
  test("error: export_late when all voyages arrive after dueDate and importExport=E", () => {
    const voyages = [
      makeVoyage({
        arrive: "2026-04-01T00:00:00", // after DUE (2026-03-05)
        bargeMaxTeu: 80,
        teuUsed: 0,
      }),
    ];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      importExport: "E",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBe("export_late");
    expect(result.assignments).toHaveLength(0);
    expect(result.unassigned).toBe(5);
  });

  test("export with on-time capacity succeeds normally", () => {
    const voyages = [
      makeVoyage({ arrive: "2026-03-03T00:00:00", bargeMaxTeu: 80, teuUsed: 0 }),
    ];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      importExport: "E",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBeNull();
    expect(result.assignments[0].containersAssigned).toBe(5);
  });

  test("export does NOT use late voyages even as overflow", () => {
    const voyages = [
      makeVoyage({
        code: "ONTIME",
        arrive: "2026-03-03T00:00:00",
        bargeMaxTeu: 10,
        teuUsed: 8, // only 1 × 40DV slot
      }),
      makeVoyage({
        code: "LATE",
        arrive: "2026-04-01T00:00:00",
        bargeMaxTeu: 80,
        teuUsed: 0,
        depart: "2026-03-02T08:00:00",
      }),
    ];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      importExport: "E",
      currDate: NOW,
      dueDate: DUE,
    });
    // Only 1 container fits on-time; LATE voyage must NOT be used
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].voyage.code).toBe("ONTIME");
    expect(result.unassigned).toBe(4);
    expect(result.error).toBeNull();
  });

  test("import CAN use late voyages as overflow (unchanged behaviour)", () => {
    const voyages = [
      makeVoyage({
        code: "ONTIME",
        arrive: "2026-03-03T00:00:00",
        bargeMaxTeu: 4,
        teuUsed: 2,
        depart: "2026-03-01T08:00:00",
      }),
      makeVoyage({
        code: "LATE",
        arrive: "2026-04-01T00:00:00",
        bargeMaxTeu: 80,
        teuUsed: 0,
        depart: "2026-03-02T08:00:00",
      }),
    ];
    const result = planRoute({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "20DV",
      importExport: "I",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(result.error).toBeNull();
    expect(result.unassigned).toBe(0);
    const codes = result.assignments.map((a) => a.voyage.code);
    expect(codes).toContain("LATE");
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
      makeVoyage({ code: "V_HUB1", portFrom: "VEGHE", portTo: "ROTTE", bargeMaxTeu: 2, teuUsed: 1 }),
      makeVoyage({ code: "V_HUB2", portFrom: "ROTTE", portTo: "OSS", bargeMaxTeu: 20, teuUsed: 0, depart: "2026-03-02T08:00:00", arrive: "2026-03-02T18:00:00" }),
      makeVoyage({ code: "V_SKIP", portFrom: "TIEL", portTo: "KAT" }),
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
      makeVoyage({
        code: "LATE",
        bargeMaxTeu: 80,
        teuUsed: 0,
        depart: "2026-03-01T08:00:00",
        arrive: "2026-03-10T00:00:00",
      }),
      makeVoyage({
        code: "ONTIME",
        bargeMaxTeu: 80,
        teuUsed: 0,
        depart: "2026-03-02T08:00:00",
        arrive: "2026-03-03T00:00:00",
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
    expect(result.assignments[0].voyage.code).toBe("ONTIME");
    expect(result.assignments[0].isLate).toBe(false);
  });

  test("late voyages are assigned when on-time capacity is exhausted", () => {
    const voyages = [
      makeVoyage({
        code: "ONTIME",
        bargeMaxTeu: 4,
        teuUsed: 2,
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

// ── Partial assignment ────────────────────────────────────────────────────────

describe("planRoute – partial assignment", () => {
  test("unassigned > 0 when total capacity is less than containerCount", () => {
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

// ── getEligibleVoyages ────────────────────────────────────────────────────────

describe("getEligibleVoyages", () => {
  test("includes direct and hub legs, excludes unrelated corridors", () => {
    const voyages = [
      makeVoyage({ code: "DIRECT", portFrom: "VEGHE", portTo: "ROTTE" }),
      makeVoyage({ code: "HUB_OUT", portFrom: "VEGHE", portTo: "ROTTE", depart: "2026-03-02T08:00:00", arrive: "2026-03-02T18:00:00" }),
      makeVoyage({ code: "HUB_IN", portFrom: "ROTTE", portTo: "OSS", depart: "2026-03-02T08:00:00", arrive: "2026-03-02T18:00:00" }),
      makeVoyage({ code: "SKIP", portFrom: "TIEL", portTo: "KAT" }),
    ];
    const eligible = getEligibleVoyages({ voyages, origin: "VEGHE", destination: "OSS", currDate: NOW });
    const codes = eligible.map((v) => v.code);
    expect(codes).toContain("DIRECT");
    expect(codes).toContain("HUB_OUT");
    expect(codes).toContain("HUB_IN");
    expect(codes).not.toContain("SKIP");
  });

  test("excludes voyages departing before currDate", () => {
    const voyages = [
      makeVoyage({ code: "OLD", depart: "2026-02-01T08:00:00", arrive: "2026-02-01T18:00:00" }),
      makeVoyage({ code: "NEW", depart: "2026-03-01T08:00:00", arrive: "2026-03-01T18:00:00" }),
    ];
    const eligible = getEligibleVoyages({ voyages, origin: "VEGHE", destination: "ROTTE", currDate: NOW });
    const codes = eligible.map((v) => v.code);
    expect(codes).not.toContain("OLD");
    expect(codes).toContain("NEW");
  });

  test("excludes voyages missing depart or arrive", () => {
    const voyages = [
      makeVoyage({ code: "NO_DEP", depart: null }),
      makeVoyage({ code: "NO_ARR", arrive: null }),
      makeVoyage({ code: "OK" }),
    ];
    const eligible = getEligibleVoyages({ voyages, origin: "VEGHE", destination: "ROTTE", currDate: NOW });
    const codes = eligible.map((v) => v.code);
    expect(codes).not.toContain("NO_DEP");
    expect(codes).not.toContain("NO_ARR");
    expect(codes).toContain("OK");
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

// ── findNoSplitAlternatives ───────────────────────────────────────────────────

describe("findNoSplitAlternatives", () => {
  test("returns empty when no single voyage can hold all containers", () => {
    const voyages = [
      makeVoyage({ bargeMaxTeu: 4, teuUsed: 0 }), // only 2 × 40DV
    ];
    const alts = findNoSplitAlternatives({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(alts).toHaveLength(0);
  });

  test("returns a direct alternative when a single voyage has enough capacity", () => {
    const voyages = [
      makeVoyage({ bargeMaxTeu: 80, teuUsed: 0 }),
    ];
    const alts = findNoSplitAlternatives({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 10,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(alts).toHaveLength(1);
    expect(alts[0].type).toBe("direct");
    expect(alts[0].isLate).toBe(false);
  });

  test("on-time alternatives are ranked before late ones", () => {
    const voyages = [
      makeVoyage({
        code: "LATE_ALT",
        bargeMaxTeu: 80,
        teuUsed: 0,
        arrive: "2026-03-10T00:00:00",
      }),
      makeVoyage({
        code: "ONTIME_ALT",
        bargeMaxTeu: 80,
        teuUsed: 0,
        depart: "2026-03-02T08:00:00",
        arrive: "2026-03-03T00:00:00",
      }),
    ];
    const alts = findNoSplitAlternatives({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 5,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(alts[0].isLate).toBe(false);
    expect(alts[0].voyages[0].code).toBe("ONTIME_ALT");
  });

  test("weight constraint applied when finding no-split alternatives", () => {
    const voyages = [
      makeVoyage({
        bargeMaxTeu: 80,
        teuUsed: 0,
        bargeMaxWeight: 100000,
        legs: [{ weight: 95000, maxWeight: 100000 }],
      }),
    ];
    // availWeight = 5000; floor(5000/24000) = 0 → cannot hold any 40DV containers
    const alts = findNoSplitAlternatives({
      voyages,
      origin: "VEGHE",
      destination: "ROTTE",
      containerCount: 1,
      containerType: "40DV",
      weightPerCntr: 24000,
      currDate: NOW,
      dueDate: DUE,
    });
    expect(alts).toHaveLength(0);
  });

  test("hub pair included when both legs have enough capacity", () => {
    const voyages = [
      makeVoyage({ code: "HUB1", portFrom: "VEGHE", portTo: "ROTTE", bargeMaxTeu: 80, teuUsed: 0, depart: "2026-03-01T08:00:00", arrive: "2026-03-02T08:00:00" }),
      makeVoyage({ code: "HUB2", portFrom: "ROTTE", portTo: "OSS", bargeMaxTeu: 80, teuUsed: 0, depart: "2026-03-02T10:00:00", arrive: "2026-03-03T10:00:00" }),
    ];
    const alts = findNoSplitAlternatives({
      voyages,
      origin: "VEGHE",
      destination: "OSS",
      containerCount: 5,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    expect(alts.length).toBeGreaterThan(0);
    expect(alts[0].type).toBe("hub");
    expect(alts[0].voyages).toHaveLength(2);
  });

  test("hub pair NOT included when leg2 departs before leg1 arrives", () => {
    const voyages = [
      makeVoyage({ code: "HUB1", portFrom: "VEGHE", portTo: "ROTTE", bargeMaxTeu: 80, teuUsed: 0, depart: "2026-03-01T08:00:00", arrive: "2026-03-03T08:00:00" }),
      // leg2 departs 2026-03-02 — before leg1 arrives on 2026-03-03 → invalid
      makeVoyage({ code: "HUB2", portFrom: "ROTTE", portTo: "OSS", bargeMaxTeu: 80, teuUsed: 0, depart: "2026-03-02T06:00:00", arrive: "2026-03-02T18:00:00" }),
    ];
    const alts = findNoSplitAlternatives({
      voyages,
      origin: "VEGHE",
      destination: "OSS",
      containerCount: 5,
      containerType: "40DV",
      currDate: NOW,
      dueDate: DUE,
    });
    const hubAlts = alts.filter((a) => a.type === "hub");
    expect(hubAlts).toHaveLength(0);
  });
});
