export const Colors = {
  // Primary — teal-green (clinical, trustworthy)
  primary: "#0D9668",
  primaryLight: "#D1FAE5",
  primaryDark: "#065F46",

  // Semantic
  success: "#10B981",
  successLight: "#D1FAE5",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  info: "#3B82F6",
  infoLight: "#EFF6FF",
  neutral: "#94A3B8",
  neutralLight: "#F1F5F9",

  // Neutrals — neutral gray tones
  background: "#F8F9FA",
  card: "#FFFFFF",
  border: "#E2E8F0",
  divider: "#F1F5F9",

  // Text
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textTertiary: "#94A3B8",
  textInverse: "#FFFFFF",

  // Drug form colors
  pill: {
    red: "#EF4444",
    orange: "#F97316",
    yellow: "#EAB308",
    green: "#22C55E",
    blue: "#3B82F6",
    purple: "#8B5CF6",
  },

  // Chart colors — distinct hues for multi-drug adherence charts
  chart: {
    teal: "#0D9488",
    blue: "#2563EB",
    indigo: "#6366F1",
    amber: "#D97706",
    rose: "#E11D48",
    emerald: "#059669",
    violet: "#7C3AED",
    slate: "#475569",
  },

  // Dark mode — neutral dark tones
  dark: {
    background: "#0F1117",
    card: "#1A1D27",
    border: "#2A2D37",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
  },
} as const;

export type ColorScheme = "light" | "dark";

export function getColors(scheme: ColorScheme) {
  return scheme === "dark"
    ? {
        background: Colors.dark.background,
        card: Colors.dark.card,
        border: Colors.dark.border,
        divider: "#1E2E26",
        textPrimary: Colors.dark.textPrimary,
        textSecondary: Colors.dark.textSecondary,
        textTertiary: "#64748B",
        textInverse: Colors.textInverse,
        primary: "#22C55E",
        primaryLight: "#14532D",
        primaryDark: "#16A34A",
        success: Colors.success,
        successLight: "#14532D",
        warning: "#FBBF24",
        warningLight: "#422006",
        danger: "#F87171",
        dangerLight: "#450A0A",
        info: "#60A5FA",
        infoLight: "#172554",
        neutral: "#64748B",
        neutralLight: "#1E293B",
        chart: Colors.chart,
        pill: Colors.pill,
      }
    : {
        background: Colors.background,
        card: Colors.card,
        border: Colors.border,
        divider: Colors.divider,
        textPrimary: Colors.textPrimary,
        textSecondary: Colors.textSecondary,
        textTertiary: Colors.textTertiary,
        textInverse: Colors.textInverse,
        primary: Colors.primary,
        primaryLight: Colors.primaryLight,
        primaryDark: Colors.primaryDark,
        success: Colors.success,
        successLight: Colors.successLight,
        warning: Colors.warning,
        warningLight: Colors.warningLight,
        danger: Colors.danger,
        dangerLight: Colors.dangerLight,
        info: Colors.info,
        infoLight: Colors.infoLight,
        neutral: Colors.neutral,
        neutralLight: Colors.neutralLight,
        chart: Colors.chart,
        pill: Colors.pill,
      };
}
