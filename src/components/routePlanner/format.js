import { PORT_LABELS } from "../../data/constants";

export const port = (p) => PORT_LABELS[p] || p || "—";

export const fmtDT = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })
    : "—";
