import { useMemo, useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import GestureHandler, {
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLanguage } from "@/contexts/language-context";
import { toDateString } from "@/utils/date-helpers";
import type { AdherenceLog } from "@/types/adherence";
import type { ReminderWithDrugs } from "@/hooks/use-reminders";

interface WeekViewProps {
  logs: AdherenceLog[];
  reminders: ReminderWithDrugs[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

interface DayCell {
  dateStr: string;
  dayNum: number;
  dayAbbr: string;
  isToday: boolean;
  adherence: number; // 0-100, -1 = no data
  takenCount: number;
  totalCount: number;
}

function getAdherenceLevel(percent: number): "green" | "yellow" | "red" | "gray" {
  if (percent < 0) return "gray";
  if (percent >= 80) return "green";
  if (percent >= 50) return "yellow";
  return "red";
}

function getAdherenceColor(level: "green" | "yellow" | "red" | "gray", colors: ReturnType<typeof getColors>): string {
  switch (level) {
    case "green": return colors.success;
    case "yellow": return colors.warning;
    case "red": return colors.danger;
    case "gray": return colors.divider;
  }
}

function buildWeek(offset: number, dayAbbr: readonly string[]): DayCell[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + offset * 7);

  const days: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const dateStr = toDateString(d);
    days.push({
      dateStr,
      dayNum: d.getDate(),
      dayAbbr: dayAbbr[d.getDay()],
      isToday: dateStr === toDateString(today),
      adherence: -1,
      takenCount: 0,
      totalCount: 0,
    });
  }
  return days;
}

export default function WeekView({ logs, reminders, selectedDate, onSelectDate }: WeekViewProps) {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t } = useLanguage();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays = useMemo(() => {
    const days = buildWeek(weekOffset, t.days.abbr);
    const dateMap = new Map<string, { taken: number; total: number }>();

    for (const day of days) {
      dateMap.set(day.dateStr, { taken: 0, total: 0 });
    }

    for (const log of logs) {
      const entry = dateMap.get(log.date);
      if (entry) {
        entry.total++;
        if (log.status === "taken") entry.taken++;
      }
    }

    for (const day of days) {
      const entry = dateMap.get(day.dateStr)!;
      day.takenCount = entry.taken;
      day.totalCount = entry.total;
      day.adherence = entry.total > 0 ? Math.round((entry.taken / entry.total) * 100) : -1;
    }

    return days;
  }, [logs, weekOffset, t.days.abbr]);

  const translateX = useSharedValue(0);

  const goToPrevWeek = useCallback(() => setWeekOffset((o) => o - 1), []);
  const goToNextWeek = useCallback(() => {
    if (weekOffset < 0) setWeekOffset((o) => o + 1);
  }, [weekOffset]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .onEnd((e) => {
          if (e.translationX > 50) {
            runOnJS(goToPrevWeek)();
          } else if (e.translationX < -50) {
            runOnJS(goToNextWeek)();
          }
        }),
    [goToPrevWeek, goToNextWeek],
  );

  const weekLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    const first = weekDays[0];
    const last = weekDays[6];
    const d1 = new Date(first.dateStr + "T00:00:00");
    const d2 = new Date(last.dateStr + "T00:00:00");
    const fmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${d1.toLocaleDateString(undefined, fmt)} - ${d2.toLocaleDateString(undefined, fmt)}`;
  }, [weekDays]);

  const getDrugBreakdown = useCallback(
    (dateStr: string) => {
      const dayLogs = logs.filter((l) => l.date === dateStr);
      return reminders.flatMap((r) =>
        r.drugs.map((drug) => {
          const log = dayLogs.find((l) => l.reminderId === r.id && l.drugId === drug.id);
          return {
            drugName: drug.name,
            dosage: drug.dosage,
            status: log?.status ?? null,
            reminderName: r.name,
          };
        }),
      );
    },
    [logs, reminders],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goToPrevWeek} hitSlop={8}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerLabel, { color: colors.textPrimary }]}>{weekLabel}</Text>
        <Pressable onPress={weekOffset < 0 ? goToNextWeek : undefined} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={weekOffset < 0 ? colors.primary : colors.textTertiary}
          />
        </Pressable>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={styles.daysRow}>
          {weekDays.map((day) => {
            const level = getAdherenceLevel(day.adherence);
            const cellColor = getAdherenceColor(level, colors);
            const isSelected = selectedDate === day.dateStr;

            return (
              <Pressable
                key={day.dateStr}
                onPress={() => onSelectDate(day.dateStr)}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : day.isToday
                        ? colors.primaryLight
                        : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayAbbr,
                    {
                      color: isSelected
                        ? colors.textInverse
                        : day.isToday
                          ? colors.primary
                          : colors.textTertiary,
                    },
                  ]}
                >
                  {day.dayAbbr}
                </Text>
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: isSelected
                        ? colors.textInverse
                        : day.isToday
                          ? colors.primary
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {day.dayNum}
                </Text>
                <View
                  style={[
                    styles.adherenceDot,
                    { backgroundColor: cellColor },
                  ]}
                />
              </Pressable>
            );
          })}
        </Animated.View>
      </GestureDetector>

      {selectedDate && (() => {
        const breakdown = getDrugBreakdown(selectedDate);
        if (breakdown.length === 0) return null;
        return (
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {breakdown.map((item, i) => (
              <View
                key={`${item.drugName}-${item.reminderName}-${i}`}
                style={[
                  styles.breakdownRow,
                  i < breakdown.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    item.status === "taken"
                      ? "check-circle"
                      : item.status === "missed"
                        ? "close-circle"
                        : item.status === "skipped"
                          ? "minus-circle"
                          : "clock-outline"
                  }
                  size={16}
                  color={
                    item.status === "taken"
                      ? colors.success
                      : item.status === "missed"
                        ? colors.danger
                        : item.status === "skipped"
                          ? colors.textTertiary
                          : colors.primary
                  }
                />
                <View style={styles.breakdownInfo}>
                  <Text style={[styles.breakdownDrug, { color: colors.textPrimary }]}>
                    {item.drugName} {item.dosage}
                  </Text>
                  <Text style={[styles.breakdownReminder, { color: colors.textTertiary }]}>
                    {item.reminderName}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.breakdownStatus,
                    {
                      color:
                        item.status === "taken"
                          ? colors.success
                          : item.status === "missed"
                            ? colors.danger
                            : item.status === "skipped"
                              ? colors.textTertiary
                              : colors.primary,
                    },
                  ]}
                >
                  {item.status === "taken"
                    ? t.common.taken
                    : item.status === "missed"
                      ? t.common.missed
                      : item.status === "skipped"
                        ? t.common.skipped
                        : "—"}
                </Text>
              </View>
            ))}
          </View>
        );
      })()}

      <View style={styles.weekLegend}>
        <View style={styles.weekLegendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>&ge;80%</Text>
        </View>
        <View style={styles.weekLegendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>50-79%</Text>
        </View>
        <View style={styles.weekLegendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>&lt;50%</Text>
        </View>
        <View style={styles.weekLegendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.divider }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.common.noData}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  headerLabel: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  daysRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 2,
  },
  dayAbbr: {
    ...Typography.xs,
    fontWeight: Typography.medium,
  },
  dayNum: {
    ...Typography.md,
    fontWeight: Typography.bold,
  },
  adherenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  breakdownCard: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownDrug: {
    ...Typography.sm,
    fontWeight: Typography.medium,
  },
  breakdownReminder: {
    ...Typography.xs,
  },
  breakdownStatus: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
  weekLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  weekLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...Typography.xs,
  },
});
