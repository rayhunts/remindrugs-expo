import { View, Text, StyleSheet } from "react-native";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { FrequencyType } from "@/types/reminder";

interface FrequencyBadgeProps {
  type: FrequencyType;
}

const BADGE_COLORS: Record<FrequencyType, string> = {
  daily: "#22C55E",
  weekly: "#3B82F6",
  custom: "#F59E0B",
};

const BADGE_LABELS: Record<FrequencyType, string> = {
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom",
};

export function FrequencyBadge({ type }: FrequencyBadgeProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const color = BADGE_COLORS[type];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}18`,
          borderColor: `${color}40`,
        },
      ]}
    >
      <Text style={[styles.text, { color }]}>
        {BADGE_LABELS[type]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
  },
  text: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
});
