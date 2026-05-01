import { tPct, statusLevel, statusColor, barColor, barBgColor } from "./legHelpers";
import { START, END } from "../data/constants";

// ── tPct ──────────────────────────────────────────────────────────────────────

describe("tPct", () => {
  test("returns null for falsy input", () => {
    expect(tPct(null)).toBeNull();
    expect(tPct(undefined)).toBeNull();
    expect(tPct("")).toBeNull();
  });

  test("returns 0 for a date at START", () => {
    expect(tPct(START.toISOString())).toBe(0);
  });

  test("returns 100 for a date at END", () => {
    expect(tPct(END.toISOString())).toBeCloseTo(100, 5);
  });

  test("clamps to 0 for a date before START", () => {
    expect(tPct("2026-01-01T00:00:00")).toBe(0);
  });

  test("clamps to 100 for a date after END", () => {
    expect(tPct("2026-04-01T00:00:00")).toBe(100);
  });

  test("returns ~50 for the midpoint of the planning window", () => {
    // START = 2026-01-29T00:00:00, END = 2026-03-03T00:00:00 (33 days apart)
    // Midpoint: 2026-01-29 + 16.5 days = 2026-02-14T12:00:00
    const result = tPct("2026-02-14T12:00:00");
    expect(result).toBeCloseTo(50, 1);
  });

  test("returns a value between 0 and 100 for a date within the window", () => {
    const result = tPct("2026-02-10T00:00:00");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

// ── statusLevel ───────────────────────────────────────────────────────────────

describe("statusLevel", () => {
  test("critical when combined nok > 20", () => {
    expect(statusLevel({ expNok: 15, impNok: 10, appt: true, teuPct: 50 })).toBe("critical");
    expect(statusLevel({ expNok: 21, impNok: 0, appt: true, teuPct: 50 })).toBe("critical");
  });

  test("warning when combined nok is 1–20", () => {
    expect(statusLevel({ expNok: 1, impNok: 0, appt: true, teuPct: 50 })).toBe("warning");
    expect(statusLevel({ expNok: 10, impNok: 10, appt: true, teuPct: 50 })).toBe("warning");
  });

  test("warning when appt is falsy (regardless of nok=0)", () => {
    expect(statusLevel({ expNok: 0, impNok: 0, appt: false, teuPct: 50 })).toBe("warning");
    expect(statusLevel({ expNok: 0, impNok: 0, appt: null, teuPct: 50 })).toBe("warning");
  });

  test("high when teuPct >= 90 with no issues and appt set", () => {
    expect(statusLevel({ expNok: 0, impNok: 0, appt: true, teuPct: 90 })).toBe("high");
    expect(statusLevel({ expNok: 0, impNok: 0, appt: true, teuPct: 99 })).toBe("high");
  });

  test("ok for a clean leg below capacity", () => {
    expect(statusLevel({ expNok: 0, impNok: 0, appt: true, teuPct: 75 })).toBe("ok");
    expect(statusLevel({ expNok: 0, impNok: 0, appt: true, teuPct: null })).toBe("ok");
  });

  test("nok check takes priority over teuPct", () => {
    // nok > 0 → warning even if teuPct >= 90
    expect(statusLevel({ expNok: 5, impNok: 0, appt: true, teuPct: 95 })).toBe("warning");
  });

  test("critical takes priority over appt missing", () => {
    expect(statusLevel({ expNok: 25, impNok: 0, appt: false, teuPct: 95 })).toBe("critical");
  });

  test("treats missing nok fields as 0", () => {
    expect(statusLevel({ appt: true, teuPct: 50 })).toBe("ok");
  });
});

// ── statusColor ───────────────────────────────────────────────────────────────

describe("statusColor", () => {
  test("red (#ef4444) for nok > 20", () => {
    expect(statusColor({ expNok: 21, impNok: 0, appt: true, teuPct: 50 })).toBe("#ef4444");
  });

  test("orange (#f97316) for nok 1–20", () => {
    expect(statusColor({ expNok: 1, impNok: 0, appt: true, teuPct: 50 })).toBe("#f97316");
  });

  test("yellow (#f59e0b) when appt is falsy", () => {
    expect(statusColor({ expNok: 0, impNok: 0, appt: false, teuPct: 50 })).toBe("#f59e0b");
  });

  test("orange (#f97316) when teuPct >= 90", () => {
    expect(statusColor({ expNok: 0, impNok: 0, appt: true, teuPct: 90 })).toBe("#f97316");
  });

  test("null (use barge colour) for clean leg", () => {
    expect(statusColor({ expNok: 0, impNok: 0, appt: true, teuPct: 80 })).toBeNull();
    expect(statusColor({ expNok: 0, impNok: 0, appt: true, teuPct: null })).toBeNull();
  });
});

// ── barColor ──────────────────────────────────────────────────────────────────

describe("barColor", () => {
  test("green below 50%", () => {
    expect(barColor(0)).toBe("#22c55e");
    expect(barColor(49)).toBe("#22c55e");
  });

  test("yellow at 50–74%", () => {
    expect(barColor(50)).toBe("#f59e0b");
    expect(barColor(74)).toBe("#f59e0b");
  });

  test("orange at 75–89%", () => {
    expect(barColor(75)).toBe("#f97316");
    expect(barColor(89)).toBe("#f97316");
  });

  test("red at 90%+", () => {
    expect(barColor(90)).toBe("#ef4444");
    expect(barColor(100)).toBe("#ef4444");
  });
});

// ── barBgColor ────────────────────────────────────────────────────────────────

describe("barBgColor", () => {
  test("dark green below 50%", () => {
    expect(barBgColor(0)).toBe("#14532d");
    expect(barBgColor(49)).toBe("#14532d");
  });

  test("dark amber at 50–74%", () => {
    expect(barBgColor(50)).toBe("#451a03");
    expect(barBgColor(74)).toBe("#451a03");
  });

  test("dark orange at 75–89%", () => {
    expect(barBgColor(75)).toBe("#431407");
    expect(barBgColor(89)).toBe("#431407");
  });

  test("dark red at 90%+", () => {
    expect(barBgColor(90)).toBe("#7f1d1d");
    expect(barBgColor(100)).toBe("#7f1d1d");
  });
});
