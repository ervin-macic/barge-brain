import { theme } from "../../data/theme";
import { START, END } from "../../data/constants";
import { UNIT_TYPES, UNIT_TEU, UNIT_LABELS } from "../../utils/routePlanner";
import { port } from "./format";

const startStr = START.toISOString().slice(0, 10);
const endStr   = END.toISOString().slice(0, 10);

function Label({ children }) {
  return (
    <label
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: theme.textSecondary,
        display: "block",
        marginBottom: 5,
      }}
    >
      {children}
    </label>
  );
}

function Input({ style, ...props }) {
  return (
    <input
      style={{
        width: "100%",
        padding: "8px 10px",
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.borderMuted}`,
        fontSize: 13,
        background: theme.bgSecondary,
        color: theme.textPrimary,
        boxSizing: "border-box",
        outline: "none",
        ...style,
      }}
      {...props}
    />
  );
}

function Select({ style, children, ...props }) {
  return (
    <select
      style={{
        width: "100%",
        padding: "8px 10px",
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.borderMuted}`,
        fontSize: 13,
        background: theme.bgSecondary,
        color: theme.textPrimary,
        boxSizing: "border-box",
        outline: "none",
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  );
}

/**
 * Left-side planning form card.
 *
 * Props:
 *   value    — { origin, destination, count, unitType, currDate, dueDate }
 *   onChange — (patch: Partial<value>) => void  (caller also clears result)
 *   ports    — string[]
 *   summary  — { teuNeeded, voyageCount, totalAvailTeu }
 *   canPlan  — boolean
 *   onPlan   — () => void
 */
export default function PlanInputs({ value, onChange, ports, summary, canPlan, onPlan }) {
  const { origin, destination, count, unitType, currDate, dueDate } = value;
  const { teuNeeded, voyageCount, totalAvailTeu } = summary;

  const field = (patch) => onChange(patch);

  return (
    <div
      style={{
        background: theme.bgSecondary,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.border}`,
        padding: "18px 20px",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.textPrimary, marginBottom: 16 }}>
        Planning inputs
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Origin</Label>
        <Select value={origin} onChange={(e) => field({ origin: e.target.value })}>
          {ports.map((p) => (
            <option key={p} value={p}>{port(p)}</option>
          ))}
        </Select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Destination</Label>
        <Select value={destination} onChange={(e) => field({ destination: e.target.value })}>
          {ports.filter((p) => p !== origin).map((p) => (
            <option key={p} value={p}>{port(p)}</option>
          ))}
        </Select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Number of containers</Label>
        <Input
          type="number"
          min={-1}
          max={500}
          value={count}
          onChange={(e) => field({ count: parseInt(e.target.value) })}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Container type</Label>
        <Select value={unitType} onChange={(e) => field({ unitType: e.target.value })}>
          {UNIT_TYPES.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u]} ({UNIT_TEU[u]} TEU)
            </option>
          ))}
        </Select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Current date (planning starts from)</Label>
        <Input
          type="date"
          value={currDate}
          min={startStr}
          max={endStr}
          onChange={(e) => field({ currDate: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <Label>Due date (must arrive by)</Label>
        <Input
          type="date"
          value={dueDate}
          min={startStr}
          max="2027-03-03"
          onChange={(e) => field({ dueDate: e.target.value })}
        />
      </div>

      {/* Pre-plan summary */}
      <div
        style={{
          background: theme.bgTertiary,
          borderRadius: theme.radius.md,
          padding: "10px 12px",
          marginBottom: 16,
          fontSize: 12,
        }}
      >
        {[
          ["TEU required",        `${teuNeeded} TEU`],
          ["Matching voyages",    `${voyageCount}`],
          ["Available TEU (total)", `${Math.round(totalAvailTeu)} TEU`],
        ].map(([label, val], i) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: i < 2 ? 4 : 0,
            }}
          >
            <span style={{ color: theme.textSecondary }}>{label}</span>
            <span
              style={{
                fontWeight: 700,
                fontFamily: theme.fontMono,
                color:
                  label === "Available TEU (total)"
                    ? totalAvailTeu >= teuNeeded
                      ? theme.success
                      : theme.error
                    : theme.textPrimary,
              }}
            >
              {val}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onPlan}
        disabled={!canPlan}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: theme.radius.md,
          background: canPlan ? theme.info : theme.borderMuted,
          color: canPlan ? "#fff" : theme.textMuted,
          border: "none",
          fontSize: 14,
          fontWeight: 700,
          cursor: canPlan ? "pointer" : "not-allowed",
          transition: "background 0.15s",
        }}
      >
        Suggest route →
      </button>

      {origin === destination && (
        <p
          style={{
            fontSize: 11,
            color: theme.error,
            margin: "8px 0 0",
            textAlign: "center",
          }}
        >
          Origin and destination must be different
        </p>
      )}
    </div>
  );
}
