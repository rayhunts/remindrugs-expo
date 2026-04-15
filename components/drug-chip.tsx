import { Pressable, Text, View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";

interface DrugChipProps {
  name: string;
  dosage: string;
  color?: string;
  checked?: boolean;
  onToggle?: () => void;
  strikeThrough?: boolean;
}

export function DrugChip({ name, dosage, color, checked, onToggle, strikeThrough = true }: DrugChipProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);

  if (onToggle !== undefined) {
    return (
      <Pressable
        onPress={onToggle}
        style={[
          styles.chip,
          {
            backgroundColor: checked ? colors.successLight : colors.divider,
            borderColor: checked ? colors.success : colors.border,
            borderWidth: 1,
          },
        ]}
      >
        {color && !checked ? (
          <View style={[styles.dot, { backgroundColor: color }]} />
        ) : null}
        <MaterialCommunityIcons
          name={checked ? "check-circle" : "circle-outline"}
          size={16}
          color={checked ? colors.success : colors.textTertiary}
        />
        <Text
          style={[
            styles.text,
            {
              color: checked ? colors.success : colors.textPrimary,
              textDecorationLine: checked && strikeThrough ? "line-through" : "none",
            },
          ]}
          numberOfLines={1}
        >
          {name} {dosage}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={1}>
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
  const { t } = useLanguage();

  return (
    <View style={[styles.chip, { backgroundColor: colors.divider }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {t.components.moreCount.replace("{count}", String(count))}
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
