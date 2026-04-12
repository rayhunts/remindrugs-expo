import { useTheme } from "@/contexts/theme-context";
import type { ColorScheme } from "@/constants/colors";

export function useColorScheme(): ColorScheme {
  const { effectiveScheme } = useTheme();
  return effectiveScheme;
}
