export const Colors = {
  // Primary — calm blue-purple (trust + health)
  primary: "#5B6EF5",
  primaryLight: "#EEF0FE",
  primaryDark: "#3D52D5",

  // Semantic
  success: "#22C55E",
  successLight: "#DCFCE7",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  info: "#3B82F6",
  infoLight: "#EFF6FF",

  // Health-specific
  sleep: "#8B5CF6",
  sleepLight: "#F5F3FF",
  heartRate: "#F43F5E",
  heartRateLight: "#FFF1F2",
  steps: "#10B981",

  // Neutrals
  background: "#F5F6FA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  divider: "#F3F4F6",

  // Text
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
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

  // Dark mode
  dark: {
    background: "#0F172A",
    card: "#1E293B",
    border: "#334155",
    textPrimary: "#F1F5F9",
    textSecondary: "#94A3B8",
  },
} as const;

export type ColorScheme = "light" | "dark";

export function getColors(scheme: ColorScheme) {
  return scheme === "dark"
    ? {
        ...Colors.dark,
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
        sleep: Colors.sleep,
        sleepLight: Colors.sleepLight,
        heartRate: Colors.heartRate,
        heartRateLight: Colors.heartRateLight,
        steps: Colors.steps,
        pill: Colors.pill,
        divider: "#334155",
        textTertiary: "#64748B",
        textInverse: Colors.textInverse,
      }
    : {
        background: Colors.background,
        card: Colors.card,
        border: Colors.border,
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
        sleep: Colors.sleep,
        sleepLight: Colors.sleepLight,
        heartRate: Colors.heartRate,
        heartRateLight: Colors.heartRateLight,
        steps: Colors.steps,
        pill: Colors.pill,
        divider: Colors.divider,
      };
}
