import { theme } from "../../data/theme";

const STATUS_MAP = {
  ok:       { bg: theme.successBg, color: theme.success },
  warning:  { bg: theme.warningBg, color: theme.warning },
  critical: { bg: theme.errorBg,   color: theme.error },
  late:     { bg: "#FFE4E6",       color: "#BE123C" },
  info:     { bg: theme.infoBg,    color: theme.info },
};

export default function StatusPill({ status, children }) {
  const s = STATUS_MAP[status] || STATUS_MAP.info;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: theme.radius.sm,
        padding: "2px 7px",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}
