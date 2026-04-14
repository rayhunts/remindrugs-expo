import { getColors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ReturnType<typeof getColors>,
) {
  const scheme = useColorScheme() ?? "light";
  const colors = getColors(scheme);
  const colorFromProps = scheme === "dark" ? props.dark : props.light;

  if (colorFromProps) {
    return colorFromProps;
  }
  return colors[colorName];
}
