import { useLayoutEffect } from "react";
import { useNavigation } from "expo-router";
import { getColors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useHeaderStyle() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.card },
      headerTintColor: colors.textPrimary,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
    });
  }, [navigation, colors.card, colors.textPrimary, colors.background]);
}
