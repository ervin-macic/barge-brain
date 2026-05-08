// Used only in static/dev mode (no REACT_APP_API_URL). In production the
// server verifies credentials; these values never reach the production bundle.
export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "BargeBrain";
export const AUTH_SESSION_KEY = "barge-brain-authenticated";

export const TODAY = new Date("2026-02-26T12:00:00");
export const START = new Date("2026-01-29T00:00:00");
export const END   = new Date("2026-03-03T00:00:00");
export const TOTAL_MS = END - START;

export const BARGE_COLORS = {
  AFS:"#6366f1", ALF:"#22c55e", ALL:"#f59e0b", AMI:"#14b8a6",
  AMO:"#a78bfa", ANT:"#f97316", DEC:"#06b6d4", FRS:"#64748b",
  LEE:"#ec4899", LEH:"#84cc16", LRD:"#fb923c", MEY:"#e879f9", VIC:"#38bdf8"
};

export const PORT_LABELS = {
  ROTTE: "Rotterdam",
  VEGHE: "Veghel",
  OSS:   "Oss",
  TIEL:  "Tiel",
  KAT:   "Katendrecht",
};
