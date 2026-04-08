import { START, TOTAL_MS } from "../data/constants";

export function tPct(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  return Math.max(0, Math.min(100, ((d - START) / TOTAL_MS) * 100));
}

export function statusColor(leg) {
  const nok = (leg.expNok || 0) + (leg.impNok || 0);
  if (nok > 20) return "#ef4444";
  if (nok > 0) return "#f97316";
  if (!leg.appt) return "#f59e0b";
  if (leg.teuPct !== null && leg.teuPct >= 90) return "#f97316";
  return null; // use barge color
}

export function statusLevel(leg) {
  const nok = (leg.expNok || 0) + (leg.impNok || 0);
  if (nok > 20) return "critical";
  if (nok > 0) return "warning";
  if (!leg.appt) return "warning";
  if (leg.teuPct !== null && leg.teuPct >= 90) return "high";
  return "ok";
}

export function barColor(pct) {
  if (pct >= 90) return "#ef4444";
  if (pct >= 75) return "#f97316";
  if (pct >= 50) return "#f59e0b";
  return "#22c55e";
}

export function barBgColor(pct) {
  if (pct >= 90) return "#7f1d1d";
  if (pct >= 75) return "#431407";
  if (pct >= 50) return "#451a03";
  return "#14532d";
}
