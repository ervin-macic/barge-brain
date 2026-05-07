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
 *   value    — { origin, destination, count, unitType, weightPerCntr, importExport, currDate, dueDate }
 *   onChange — (patch: Partial<value>) => void  (caller also clears result)
 *   ports    — string[]
 *   summary  — { teuNeeded, weightNeeded, voyageCount, totalAvailTeu, totalAvailWeight }
 *   canPlan  — boolean
 *   onPlan   — () => void
 */
export default function PlanInputs({ value, onChange, ports, summary, canPlan, onPlan }) {
  const { origin, destination, count, unitType, weightPerCntr, importExport, currDate, dueDate } = value;
  const { teuNeeded, weightNeeded, voyageCount, totalAvailTeu, totalAvailWeight } = summary;

  const field = (patch) => onChange(patch);

  const fmtWeight = (kg) =>
    kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`;

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

      {/* Import / Export */}
      <div style={{ marginBottom: 14 }}>
        <Label>Container flow</Label>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { v: "I", label: "Import" },
            { v: "E", label: "Export" },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => field({ importExport: v })}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: theme.radius.md,
                border: `1.5px solid ${importExport === v ? theme.info : theme.borderMuted}`,
                background: importExport === v ? theme.infoBg : theme.bgPrimary,
                color: importExport === v ? theme.info : theme.textSecondary,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {importExport === "E" && (
          <p
            style={{
              fontSize: 10,
              color: theme.warning,
              margin: "5px 0 0",
            }}
          >
            Exports cannot be late — only on-time voyages will be used.
          </p>
        )}
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
        <Label>Weight per container (kg)</Label>
        <Input
          type="number"
          min={1000}
          max={35000}
          step={500}
          value={weightPerCntr}
          onChange={(e) => field({ weightPerCntr: parseInt(e.target.value) || 0 })}
        />
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
          {
            label: "TEU required",
            val: `${teuNeeded} TEU`,
            color: theme.textPrimary,
          },
          {
            label: "Weight required",
            val: fmtWeight(weightNeeded),
            color: theme.textPrimary,
          },
          {
            label: "Matching voyages",
            val: `${voyageCount}`,
            color: theme.textPrimary,
          },
          {
            label: "Available TEU (total)",
            val: `${Math.round(totalAvailTeu)} TEU`,
            color: totalAvailTeu >= teuNeeded ? theme.success : theme.error,
          },
          {
            label: "Available weight (total)",
            val: fmtWeight(totalAvailWeight),
            color: totalAvailWeight >= weightNeeded ? theme.success : theme.error,
          },
        ].map(({ label, val, color }, i, arr) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: i < arr.length - 1 ? 4 : 0,
            }}
          >
            <span style={{ color: theme.textSecondary }}>{label}</span>
            <span
              style={{
                fontWeight: 700,
                fontFamily: theme.fontMono,
                color,
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
