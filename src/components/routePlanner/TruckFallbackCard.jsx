import { theme } from "../../data/theme";
import { port } from "./format";

/**
 * Displays a recommended truck alternative when barge voyages cannot be used.
 *
 * Props:
 *   truckFallback — {
 *     truck, transportUser, addressFrom, addressTo,
 *     unitType, nett, transportDate, transportTime
 *   }
 *   containerCount — number of containers to ship
 */
export default function TruckFallbackCard({ truckFallback, containerCount }) {
  if (!truckFallback) return null;

  const { truck, transportUser, addressFrom, addressTo, unitType, nett, transportDate, transportTime } =
    truckFallback;

  const fmtTime = (t) => {
    const s = String(t || "0000").padStart(4, "0");
    return `${s.slice(0, 2)}:${s.slice(2)}`;
  };

  const fmtDateLocal = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

  return (
    <div
      style={{
        background: theme.bgSecondary,
        borderRadius: theme.radius.lg,
        border: `1.5px solid ${theme.warning}`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: theme.warningBg,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: `1px solid ${theme.warning}44`,
        }}
      >
        <span style={{ fontSize: 18 }}>🚚</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
            Truck recommended — export cannot be shipped by barge on time
          </div>
          <div style={{ fontSize: 11, color: "#B45309", marginTop: 2 }}>
            {containerCount} container{containerCount !== 1 ? "s" : ""} · {unitType}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          padding: "14px 16px",
        }}
      >
        {[
          ["Truck", truck],
          ["Driver / User", transportUser],
          ["From", port(addressFrom) || addressFrom],
          ["To", port(addressTo) || addressTo],
          ["Transport date", fmtDateLocal(transportDate)],
          ["Departure time", fmtTime(transportTime)],
          ["Container type", unitType],
          ["Est. weight / cntr", nett ? `${nett.toLocaleString()} kg` : "—"],
        ].map(([label, value], i) => (
          <div
            key={label}
            style={{
              padding: "6px 0",
              borderBottom:
                i < 6 ? `1px solid ${theme.borderMuted}` : "none",
              paddingRight: i % 2 === 0 ? 16 : 0,
              paddingLeft: i % 2 === 1 ? 16 : 0,
              borderLeft: i % 2 === 1 ? `1px solid ${theme.borderMuted}` : "none",
            }}
          >
            <div style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {label}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: theme.textPrimary,
                fontFamily: ["Truck", "Driver / User"].includes(label)
                  ? theme.fontMono
                  : undefined,
                marginTop: 2,
              }}
            >
              {value || "—"}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "10px 16px",
          borderTop: `1px solid ${theme.borderMuted}`,
          fontSize: 11,
          color: theme.textMuted,
          background: theme.bgTertiary,
        }}
      >
        This is a suggested truck slot. Confirm availability with the transport desk before committing.
      </div>
    </div>
  );
}
