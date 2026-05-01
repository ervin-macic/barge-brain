import { legsToScatterPoints, STAGES, ISSUE_MAP } from "./scatterDataTransform";

// Minimal valid leg that passes all filters and has no issues.
function makeLeg(overrides = {}) {
  return {
    code: "TST0001",
    barge: "DEC",
    ie: "E",
    portFrom: "VEGHE",
    portTo: "ROTTE",
    depart: "2026-02-10T08:00:00",
    arrive: "2026-02-10T18:00:00",
    teu: 40,
    teuPct: 50,
    expNok: 0,
    impNok: 0,
    expBlocked: 0,
    impBlocked: 0,
    impNotReleased: 0,
    appt: true,
    ...overrides,
  };
}

// ── STAGES / ISSUE_MAP exports ────────────────────────────────────────────────

describe("STAGES export", () => {
  test("has five entries in the expected order", () => {
    expect(STAGES).toEqual([
      "Ocean",
      "Port",
      "Inland terminal",
      "Out for pickup / final delivery",
      "Completed",
    ]);
  });
});

describe("ISSUE_MAP export", () => {
  test("maps all four status levels", () => {
    expect(ISSUE_MAP.ok).toBe("On Time");
    expect(ISSUE_MAP.warning).toBe("Minor Delay");
    expect(ISSUE_MAP.high).toBe("Major Delay");
    expect(ISSUE_MAP.critical).toBe("Critical");
  });
});

// ── Filtering ─────────────────────────────────────────────────────────────────

describe("legsToScatterPoints – filtering", () => {
  test("excludes legs with no code", () => {
    const result = legsToScatterPoints([makeLeg({ code: null })]);
    expect(result).toHaveLength(0);
  });

  test("excludes legs with no depart", () => {
    const result = legsToScatterPoints([makeLeg({ depart: null })]);
    expect(result).toHaveLength(0);
  });

  test("includes legs where teuPct is null but portFrom is set", () => {
    const result = legsToScatterPoints([makeLeg({ teuPct: null, portFrom: "VEGHE" })]);
    expect(result).toHaveLength(1);
  });

  test("excludes legs where both teuPct is null and portFrom is falsy", () => {
    const result = legsToScatterPoints([makeLeg({ teuPct: null, portFrom: null })]);
    expect(result).toHaveLength(0);
  });

  test("includes a valid leg with teuPct set", () => {
    const result = legsToScatterPoints([makeLeg()]);
    expect(result).toHaveLength(1);
  });
});

// ── Stage assignment ──────────────────────────────────────────────────────────

describe("legsToScatterPoints – stage (y / yLabel)", () => {
  test("stage 0 (Ocean): export FROM Rotterdam", () => {
    const [pt] = legsToScatterPoints([makeLeg({ portFrom: "ROTTE", portTo: "TIEL", ie: "E" })]);
    expect(pt.y).toBe(0);
    expect(pt.yLabel).toBe(STAGES[0]);
  });

  test("stage 4 (Completed): import TO Rotterdam", () => {
    const [pt] = legsToScatterPoints([makeLeg({ portFrom: "VEGHE", portTo: "ROTTE", ie: "I" })]);
    expect(pt.y).toBe(4);
    expect(pt.yLabel).toBe(STAGES[4]);
  });

  test("stage 1 (Port): export to Rotterdam (non-discharge direction)", () => {
    // portFrom !== ROTTE but portTo === ROTTE with ie: "E" falls into the generic fromRotte||toRotte branch
    const [pt] = legsToScatterPoints([makeLeg({ portFrom: "VEGHE", portTo: "ROTTE", ie: "E" })]);
    expect(pt.y).toBe(1);
    expect(pt.yLabel).toBe(STAGES[1]);
  });

  test("stage 3 (Out for pickup): import to inland terminal", () => {
    const [pt] = legsToScatterPoints([makeLeg({ portFrom: "OSS", portTo: "TIEL", ie: "I" })]);
    expect(pt.y).toBe(3);
    expect(pt.yLabel).toBe(STAGES[3]);
  });

  test("stage 2 (Inland terminal): default for inland-only export legs", () => {
    const [pt] = legsToScatterPoints([makeLeg({ portFrom: "OSS", portTo: "VEGHE", ie: "E" })]);
    expect(pt.y).toBe(2);
    expect(pt.yLabel).toBe(STAGES[2]);
  });
});

// ── Issue label ───────────────────────────────────────────────────────────────

describe("legsToScatterPoints – issue label", () => {
  test("On Time for a clean leg", () => {
    const [pt] = legsToScatterPoints([makeLeg()]);
    expect(pt.issue).toBe("On Time");
  });

  test("Minor Delay when nok is low (1–20)", () => {
    const [pt] = legsToScatterPoints([makeLeg({ expNok: 3 })]);
    expect(pt.issue).toBe("Minor Delay");
  });

  test("Critical when combined nok > 20", () => {
    const [pt] = legsToScatterPoints([makeLeg({ expNok: 15, impNok: 10 })]);
    expect(pt.issue).toBe("Critical");
  });

  test("Minor Delay when appt is missing", () => {
    const [pt] = legsToScatterPoints([makeLeg({ appt: false })]);
    expect(pt.issue).toBe("Minor Delay");
  });

  test("Major Delay when teuPct >= 90 with no other issues", () => {
    const [pt] = legsToScatterPoints([makeLeg({ teuPct: 92, appt: true })]);
    expect(pt.issue).toBe("Major Delay");
  });
});

// ── Output shape ──────────────────────────────────────────────────────────────

describe("legsToScatterPoints – output shape", () => {
  test("x is teuPct when available", () => {
    const [pt] = legsToScatterPoints([makeLeg({ teuPct: 73 })]);
    expect(pt.x).toBe(73);
  });

  test("x defaults to 50 when teuPct is null", () => {
    const [pt] = legsToScatterPoints([makeLeg({ teuPct: null })]);
    expect(pt.x).toBe(50);
  });

  test("id equals leg code", () => {
    const [pt] = legsToScatterPoints([makeLeg({ code: "DEC0074" })]);
    expect(pt.id).toBe("DEC0074");
  });

  test("released is true when impBlocked and impNotReleased are 0", () => {
    const [pt] = legsToScatterPoints([makeLeg({ impBlocked: 0, impNotReleased: 0 })]);
    expect(pt.released).toBe(true);
  });

  test("released is false when impBlocked > 0", () => {
    const [pt] = legsToScatterPoints([makeLeg({ impBlocked: 2 })]);
    expect(pt.released).toBe(false);
  });

  test("blocked is true when expBlocked > 0", () => {
    const [pt] = legsToScatterPoints([makeLeg({ expBlocked: 1 })]);
    expect(pt.blocked).toBe(true);
  });

  test("hasIssues is true when appt is missing", () => {
    const [pt] = legsToScatterPoints([makeLeg({ appt: false })]);
    expect(pt.hasIssues).toBe(true);
  });

  test("hasIssues is false for a clean leg with appt", () => {
    const [pt] = legsToScatterPoints([makeLeg()]);
    expect(pt.hasIssues).toBe(false);
  });

  test("unit type bucket based on teu count", () => {
    const [small] = legsToScatterPoints([makeLeg({ teu: 10 })]);
    expect(small.unitType).toBe("20ft Standard");

    const [medium] = legsToScatterPoints([makeLeg({ teu: 40 })]);
    expect(medium.unitType).toBe("40ft Standard");

    const [large] = legsToScatterPoints([makeLeg({ teu: 80 })]);
    expect(large.unitType).toBe("40ft High Cube");
  });

  test("processes multiple legs and preserves order", () => {
    const legs = [makeLeg({ code: "A001" }), makeLeg({ code: "B002" })];
    const result = legsToScatterPoints(legs);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("A001");
    expect(result[1].id).toBe("B002");
  });
});
