import { Platform } from "react-native";

export const Typography = {
  fontFamily: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),

  xs: { fontSize: 11, lineHeight: 16 },
  sm: { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 },
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
