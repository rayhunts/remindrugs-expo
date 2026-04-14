import { View, Text, StyleSheet } from "react-native";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
import type { FrequencyType } from "@/types/reminder";

interface FrequencyBadgeProps {
  type: FrequencyType;
}

export function FrequencyBadge({ type }: FrequencyBadgeProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  const badgeLabels = {
    daily: t.components.frequencyDaily,
    weekly: t.components.frequencyWeekly,
    custom: t.components.frequencyCustom,
  };

  const colorMap = {
    daily: { color: colors.success, bg: colors.successLight },
    weekly: { color: colors.info, bg: colors.infoLight },
    custom: { color: colors.warning, bg: colors.warningLight },
  };

  const { color, bg } = colorMap[type];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: color,
          borderWidth: 1,
          opacity: 0.8,
        },
      ]}
    >
      <Text style={[styles.text, { color }]}>
        {badgeLabels[type]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  text: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
});
