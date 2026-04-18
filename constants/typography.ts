import { Platform, type TextStyle } from "react-native";

export const FontFamily = {
  default: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),
  mono: Platform.select({
    ios: "Menlo",
    android: "Roboto Mono",
    default: "monospace",
  }),
} as const;

export const dataLabel: TextStyle = {
  letterSpacing: -0.2,
};

export const data = {
  fontSize: 14,
  lineHeight: 20,
  fontWeight: "500" as const,
};

export const Typography = {
  fontFamily: FontFamily.default,

  xs: { fontSize: 11, lineHeight: 16 },
  sm: { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 16, lineHeight: 22 },
  md: { fontSize: 17, lineHeight: 24 },
  lg: { fontSize: 20, lineHeight: 28 },
  xl: { fontSize: 24, lineHeight: 32 },
  "2xl": { fontSize: 32, lineHeight: 40 },
  "3xl": { fontSize: 40, lineHeight: 48 },

  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
} as const;
