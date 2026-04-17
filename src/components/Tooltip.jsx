import { statusLevel } from "../utils/legHelpers";
import { theme } from "../data/theme";

const PENDING_FIX_COLOR = theme.pendingFixColour;

function formatDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("nl-NL", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatValue(value, fractionDigits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(fractionDigits).replace(/\.0$/, "");
}

function getDisplayStatus(leg) {
  return leg?.statusOverride || statusLevel(leg);
}

function getStatusLabel(status) {
  switch (status) {
    case "critical":
      return "Critical";
    case "warning":
    case "high":
      return "Warning";
    case "pending fix":
      return "Pending fix";
    default:
      return "On time";
  }
}

function getStatusColor(status) {
  switch (status) {
    case "critical":
      return theme.statusMajorDelay;
    case "warning":
    case "high":
      return theme.statusMinorDelay;
    case "pending fix":
      return PENDING_FIX_COLOR;
    default:
      return theme.statusOnTime;
  }
}

function LegendChip({ color, label }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginRight: 10,
        marginBottom: 6,
        fontSize: 11,
        color: theme.textSecondary,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

export default function Tooltip({
  leg,
  x,
  y,
  onMouseEnter,
  onMouseLeave,
  onMarkPendingFix,
}) {
  if (!leg) return null;

  const status = getDisplayStatus(leg);
  const nok = (leg.expNok || 0) + (leg.impNok || 0);

  const left =
    typeof window !== "undefined"
      ? Math.min(x + 12, Math.max(12, window.innerWidth - 352))
      : x + 12;

  const top =
    typeof window !== "undefined"
      ? Math.min(y + 14, Math.max(12, window.innerHeight - 340))
      : y + 14;

  const teuCurrent =
    leg.teu != null
      ? leg.teu
      : leg.teuLoaded != null
      ? leg.teuLoaded
      : leg.teuUsed != null
      ? leg.teuUsed
      : null;

  const teuCapacity =
    leg.maxTeu != null
      ? leg.maxTeu
      : leg.teuCap != null
      ? leg.teuCap
      : leg.teuCapacity != null
      ? leg.teuCapacity
      : null;

  const weightCurrent =
    leg.weight != null
      ? leg.weight
      : leg.weightLoaded != null
      ? leg.weightLoaded
      : leg.weightUsed != null
      ? leg.weightUsed
      : null;

  const weightCapacity =
    leg.maxWeight != null
      ? leg.maxWeight
      : leg.weightCap != null
      ? leg.weightCap
      : leg.weightCapacity != null
      ? leg.weightCapacity
      : null;

  const teuPct =
    leg.teuPct != null
      ? leg.teuPct
      : teuCurrent != null && teuCapacity
      ? Math.round((Number(teuCurrent) / Number(teuCapacity)) * 100)
      : null;

  const weightPct =
    leg.weightPct != null
      ? leg.weightPct
      : weightCurrent != null && weightCapacity
      ? ((Number(weightCurrent) / Number(weightCapacity)) * 100).toFixed(1)
      : null;

  const isExport = leg.ie === "E" || leg.ie === "Export" || leg.ie === "export";
  const routeFrom = leg.portFrom || "—";
  const routeTo = leg.portTo || "—";

  const headerId = leg.code || "—";
  const headerBarge = leg.barge || "—";

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        left,
        top,
        width: 340,
        background: theme.bgSecondary,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius.md,
        padding: "12px 14px",
        zIndex: 9999,
        minWidth: 240,
        boxShadow: theme.shadowLg,
        fontSize: 12,
        lineHeight: 1.6,
        color: theme.textPrimary,
        fontFamily: theme.fontMono,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: theme.textPrimary,
              marginBottom: 6,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {headerId} · {headerBarge}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (status !== "pending fix") {
              onMarkPendingFix?.(leg);
            }
          }}
          disabled={status === "pending fix"}
          style={{
            border: "none",
            borderRadius: 999,
            background: PENDING_FIX_COLOR,
            color: "#111827",
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 800,
            lineHeight: 1,
            cursor: status === "pending fix" ? "default" : "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            opacity: status === "pending fix" ? 0.7 : 1,
          }}
          title={
            status === "pending fix"
              ? "This leg is already marked pending fix"
              : "Mark this leg as pending fix"
          }
        >
          {status === "pending fix" ? "Pending fix" : "Mark pending fix"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
          color: theme.textPrimary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        <span>{isExport ? "⬆ Export" : "⬇ Import"}</span>
        <span style={{ fontWeight: 700 }}>
          {routeFrom} → {routeTo}
        </span>
      </div>

      <div style={{ color: theme.textSecondary }}>
        Dep: {formatDateTime(leg.depart)}
        <br />
        Arr: {formatDateTime(leg.arrive)}
      </div>

      <div style={{ marginTop: 6 }}>
        <span
          style={{
            color:
              teuPct != null && Number(teuPct) >= 90 ? theme.warning : theme.success,
          }}
        >
          TEU: {formatValue(teuCurrent)} / {formatValue(teuCapacity)}{" "}
          {teuPct != null ? `(${teuPct}%)` : ""}
        </span>
      </div>

      <div>
        <span style={{ color: theme.textSecondary }}>
          Weight: {weightCurrent != null ? `${formatValue(weightCurrent, 0)}t` : "—"} /{" "}
          {weightCapacity != null ? `${formatValue(weightCapacity, 0)}t` : "—"}{" "}
          {weightPct != null ? `(${weightPct}%)` : ""}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          marginBottom: 10,
          fontWeight: 700,
          color: theme.textPrimary,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: getStatusColor(status),
            flexShrink: 0,
          }}
        />
        <span>{getStatusLabel(status)}</span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginTop: 4,
          paddingTop: 8,
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              background: leg.appt ? theme.successBg : theme.errorBg,
              padding: "2px 8px",
              borderRadius: theme.radius.sm,
              color: leg.appt ? theme.success : theme.error,
            }}
          >
            {leg.appt ? "✓ Appt" : "✗ No Appt"}
          </span>
          {nok > 0 && (
            <span
              style={{
                background: theme.errorBg,
                padding: "2px 8px",
                borderRadius: theme.radius.sm,
                color: theme.error,
              }}
            >
              {nok} NOK
            </span>
          )}
        </span>

        {leg.scopeIn && (
          <span
            style={{
              background: theme.bgTertiary,
              padding: "2px 8px",
              borderRadius: theme.radius.sm,
              color: theme.textSecondary,
              fontSize: 10,
              whiteSpace: "nowrap",
            }}
          >
            🚧 {leg.scopeIn}
          </span>
        )}
      </div>
    </div>
  );
}