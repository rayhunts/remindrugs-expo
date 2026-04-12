import { Text, View, StyleSheet } from "react-native";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface DrugChipProps {
  name: string;
  dosage: string;
  color?: string;
}

export function DrugChip({ name, dosage, color }: DrugChipProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.primaryLight },
      ]}
    >
      {color && (
        <View
          style={[styles.dot, { backgroundColor: color }]}
        />
      )}
      <Text
        style={[styles.text, { color: colors.textPrimary }]}
        numberOfLines={1}
      >
        {name} {dosage}
      </Text>
    </View>
  );
}

interface MoreChipProps {
  count: number;
}

export function MoreChip({ count }: MoreChipProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  return (
    <View style={[styles.chip, { backgroundColor: colors.divider }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        +{count} more
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  text: {
    ...Typography.xs,
  },
});
