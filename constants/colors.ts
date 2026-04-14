export const Colors = {
  // Primary — rich forest green (medical, trustworthy)
  primary: "#16A34A",
  primaryLight: "#DCFCE7",
  primaryDark: "#15803D",

  // Semantic
  success: "#22C55E",
  successLight: "#DCFCE7",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  info: "#3B82F6",
  infoLight: "#EFF6FF",

  // Neutrals
  background: "#F8FAF8",
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

  // Dark mode
  dark: {
    background: "#0C1410",
    card: "#1A2620",
    border: "#2D3B34",
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
        pill: Colors.pill,
      };
}
