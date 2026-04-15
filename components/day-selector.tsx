import { Pressable, Text, View, StyleSheet } from "react-native";
import { useMemo, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
import type { Weekday } from "@/types/reminder";

interface DaySelectorProps {
  selectedDays: Weekday[];
  onChange: (days: Weekday[]) => void;
}

export function DaySelector({ selectedDays, onChange }: DaySelectorProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();

  const dayNames = [t.days.sunday, t.days.monday, t.days.tuesday, t.days.wednesday, t.days.thursday, t.days.friday, t.days.saturday];
  const dayAbbr = t.days.abbr;

  const isSelected = useCallback(
    (day: number) => selectedDays.includes(day as Weekday),
    [selectedDays],
  );

  const allSelected = useMemo(() => selectedDays.length === 7, [selectedDays]);
  const noneSelected = useMemo(() => selectedDays.length === 0, [selectedDays]);

  const toggleDay = useCallback(
    (day: Weekday) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (selectedDays.includes(day)) {
        onChange(selectedDays.filter((d) => d !== day));
      } else {
        onChange([...selectedDays, day].sort() as Weekday[]);
      }
    },
    [selectedDays, onChange],
  );

  const selectAll = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChange([0, 1, 2, 3, 4, 5, 6] as Weekday[]);
  }, [onChange]);

  const clearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange([]);
  }, [onChange]);

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t.components.days}
        </Text>
        <Pressable onPress={allSelected ? clearAll : selectAll}>
          <Text style={[styles.shortcut, { color: colors.primary }]}>
            {allSelected ? t.common.clear : t.common.all}
          </Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        {dayAbbr.map((label, index) => {
          const selected = isSelected(index);
          return (
            <Pressable
              key={index}
              onPress={() => toggleDay(index as Weekday)}
              style={[
                styles.dayChip,
                {
                  backgroundColor: selected
                    ? colors.primary
                    : colors.card,
                  borderColor: selected
                    ? colors.primary
                    : colors.border,
                },
              ]}
              accessibilityLabel={`${dayNames[index]}${selected ? ", selected" : ""}`}
            >
              <Text
                style={[
                  styles.dayText,
                  {
                    color: selected
                      ? colors.textInverse
                      : colors.textPrimary,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {noneSelected && (
        <Text style={[styles.hint, { color: colors.danger }]}>
          {t.components.selectAtLeastOneDay}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.sm,
  },
  shortcut: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dayChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  dayText: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  hint: {
    ...Typography.xs,
    marginTop: Spacing.sm,
  },
});
