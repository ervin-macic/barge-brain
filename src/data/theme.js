/**
 * Design system tokens matching Figma Container View theme
 */
export const theme = {
  // Surfaces (Figma theme.css)
  bgPrimary: "#F8FAFC",
  bgSecondary: "#FFFFFF",
  bgTertiary: "#F3F3F5",
  bgMuted: "#ECECF0",

  // Borders
  border: "rgba(0, 0, 0, 0.1)",
  borderMuted: "#E2E8F0",

  // Text
  textPrimary: "#030213",
  textSecondary: "#64748B",
  textMuted: "#717182",

  // Accents
  accent: "#0EA5E9",
  accentHover: "#0284C7",
  accentMuted: "#E9EBEF",

  // Status (Figma scatter plot issue colors)
  success: "#10B981",
  successBg: "#D1FAE5",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  error: "#EF4444",
  errorBg: "#FEE2E2",
  destructive: "#D4183D",
  info: "#6366F1",
  infoBg: "#E0E7FF",

  // Issue Status colors (Figma ScatterPlot)
  statusOnTime: "#10B981",
  statusMinorDelay: "#F59E0B",
  statusMajorDelay: "#EF4444",
  statusCritical: "#7F1D1D",

  // Spacing
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  // Typography
  fontSans: "'Inter', 'Segoe UI', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'IBM Plex Mono', monospace",

  // Radius (Figma --radius: 0.625rem = 10px)
  radius: {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 14,
  },

  // Shadows
  shadowSm: "0 1px 2px rgba(0,0,0,.05)",
  shadowMd: "0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.05)",
  shadowLg: "0 10px 15px -3px rgba(0,0,0,.07), 0 4px 6px -4px rgba(0,0,0,.05)",
};

export default theme;
