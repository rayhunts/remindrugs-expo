import { useMemo, useState } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAdherence } from "@/hooks/use-adherence";
import { useReminders } from "@/hooks/use-reminders";
import { useLanguage } from "@/contexts/language-context";
import { toDateString } from "@/utils/date-helpers";
import AdherenceChart from "@/components/adherence-chart";
import StreakDisplay from "@/components/streak-display";

type TimeRange = "week" | "month" | "all";

function computeStreaks(logs: { date: string; status: string }[]): {
  current: number;
  best: number;
  average: number;
} {
  const dateMap = new Map<string, { total: number; taken: number }>();
  for (const log of logs) {
    const entry = dateMap.get(log.date) ?? { total: 0, taken: 0 };
    entry.total++;
    if (log.status === "taken") entry.taken++;
    dateMap.set(log.date, entry);
  }

  const sortedDates = [...dateMap.keys()].sort();
  if (sortedDates.length === 0) return { current: 0, best: 0, average: 0 };

  // Current streak (counting back from today)
  let current = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toDateString(d);
    const entry = dateMap.get(dateStr);
    if (entry && entry.total > 0) {
      if (entry.taken < entry.total) break;
      current++;
    }
  }

  // Best streak
  let best = 0;
  let running = 0;
  for (const date of sortedDates) {
    const entry = dateMap.get(date)!;
    if (entry.taken >= entry.total) {
      running++;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  // Average streak length
  const streaks: number[] = [];
  running = 0;
  for (const date of sortedDates) {
    const entry = dateMap.get(date)!;
    if (entry.taken >= entry.total) {
      running++;
    } else {
      if (running > 0) streaks.push(running);
      running = 0;
    }
  }
  if (running > 0) streaks.push(running);
  const average = streaks.length > 0
    ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length)
    : 0;

  return { current, best, average };
}

function computeTimeOfDayAdherence(logs: { date: string; status: string; reminderId: string }[], reminders: { id: string; hour: number }[]) {
  const periods = {
    morning: { taken: 0, total: 0 },   // 5-12
    afternoon: { taken: 0, total: 0 },  // 12-17
    evening: { taken: 0, total: 0 },    // 17-21
    night: { taken: 0, total: 0 },      // 21-5
  };

  const reminderHourMap = new Map(reminders.map((r) => [r.id, r.hour]));

  for (const log of logs) {
    const hour = reminderHourMap.get(log.reminderId);
    if (hour === undefined) continue;
    const entry =
      hour >= 5 && hour < 12 ? periods.morning :
      hour >= 12 && hour < 17 ? periods.afternoon :
      hour >= 17 && hour < 21 ? periods.evening :
      periods.night;
    entry.total++;
    if (log.status === "taken") entry.taken++;
  }

  return {
    morning: periods.morning.total > 0 ? Math.round((periods.morning.taken / periods.morning.total) * 100) : 0,
    afternoon: periods.afternoon.total > 0 ? Math.round((periods.afternoon.taken / periods.afternoon.total) * 100) : 0,
    evening: periods.evening.total > 0 ? Math.round((periods.evening.taken / periods.evening.total) * 100) : 0,
    night: periods.night.total > 0 ? Math.round((periods.night.taken / periods.night.total) * 100) : 0,
  };
}

function computePerDrugStats(
  logs: { drugId: string; status: string }[],
  drugs: { id: string; name: string; dosage: string }[],
) {
  return drugs.map((drug) => {
    const drugLogs = logs.filter((l) => l.drugId === drug.id);
    const taken = drugLogs.filter((l) => l.status === "taken").length;
    const total = drugLogs.length;
    return {
      name: drug.name,
      dosage: drug.dosage,
      adherence: total > 0 ? Math.round((taken / total) * 100) : 0,
      total,
      taken,
    };
  });
}

export default function StatsScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { logs, refreshLogs } = useAdherence();
  const { reminders } = useReminders();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<TimeRange>("week");

  const rangeFilteredLogs = useMemo(() => {
    const now = new Date();
    const days = range === "week" ? 7 : range === "month" ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    const startStr = toDateString(start);
    return logs.filter((l) => l.date >= startStr);
  }, [logs, range]);

  const overallRate = useMemo(() => {
    const taken = rangeFilteredLogs.filter((l) => l.status === "taken").length;
    return rangeFilteredLogs.length > 0
      ? Math.round((taken / rangeFilteredLogs.length) * 100)
      : 0;
  }, [rangeFilteredLogs]);

  const streakData = useMemo(() => computeStreaks(logs), [logs]);

  const timeOfDay = useMemo(
    () => computeTimeOfDayAdherence(logs, reminders),
    [logs, reminders],
  );

  const allDrugs = useMemo(
    () => reminders.flatMap((r) => r.drugs),
    [reminders],
  );

  const perDrugStats = useMemo(
    () => computePerDrugStats(rangeFilteredLogs, allDrugs),
    [rangeFilteredLogs, allDrugs],
  );

  const rangeTabs: { key: TimeRange; label: string }[] = [
    { key: "week", label: "7D" },
    { key: "month", label: "30D" },
    { key: "all", label: "90D" },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    refreshLogs();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t.common.adherenceRate}</Text>

        <View style={styles.rangeRow}>
          {rangeTabs.map((tab) => (
            <View
              key={tab.key}
              style={[
                styles.rangeTab,
                {
                  backgroundColor: range === tab.key ? colors.primary : colors.card,
                  borderColor: range === tab.key ? colors.primary : colors.border,
                },
              ]}
              onTouchEnd={() => setRange(tab.key)}
            >
              <Text
                style={[
                  styles.rangeTabText,
                  { color: range === tab.key ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.overallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.overallValue, { color: colors.primary }]}>{overallRate}%</Text>
          <Text style={[styles.overallLabel, { color: colors.textSecondary }]}>
            {t.common.adherenceRate}
          </Text>
        </View>

        <StreakDisplay
          currentStreak={streakData.current}
          bestStreak={streakData.best}
          averageStreak={streakData.average}
        />

        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Trend</Text>
          <AdherenceChart logs={rangeFilteredLogs} range={range} />
        </View>

        {perDrugStats.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Per Drug</Text>
            {perDrugStats.map((drug) => (
              <View key={drug.name + drug.dosage} style={styles.drugRow}>
                <View style={styles.drugInfo}>
                  <Text style={[styles.drugName, { color: colors.textPrimary }]}>
                    {drug.name} {drug.dosage}
                  </Text>
                  <Text style={[styles.drugSub, { color: colors.textTertiary }]}>
                    {drug.taken}/{drug.total}
                  </Text>
                </View>
                <View style={styles.drugBarWrap}>
                  <View
                    style={[
                      styles.drugBar,
                      {
                        width: `${drug.adherence}%`,
                        backgroundColor:
                          drug.adherence >= 80
                            ? colors.success
                            : drug.adherence >= 50
                              ? colors.warning
                              : drug.total > 0
                                ? colors.danger
                                : colors.divider,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.drugPct, { color: colors.textPrimary }]}>{drug.adherence}%</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Time of Day</Text>
          <View style={styles.timeGrid}>
            {([
              { key: "morning", icon: "weather-sunny", label: "Morning" },
              { key: "afternoon", icon: "white-balance-sunny", label: "Afternoon" },
              { key: "evening", icon: "weather-sunset", label: "Evening" },
              { key: "night", icon: "weather-night", label: "Night" },
            ] as const).map(({ key, icon, label }) => {
              const pct = timeOfDay[key];
              return (
                <View key={key} style={[styles.timeCard, { backgroundColor: colors.neutralLight }]}>
                  <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <Text style={[styles.timeValue, { color: colors.textPrimary }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.md },
  title: {
    ...Typography.xl,
    fontWeight: Typography.bold,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  rangeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  rangeTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  rangeTabText: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  overallCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  overallValue: {
    ...Typography["3xl"],
    fontWeight: Typography.bold,
  },
  overallLabel: {
    ...Typography.sm,
    marginTop: Spacing.xs,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.md,
  },
  drugRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  drugInfo: {
    width: 100,
  },
  drugName: {
    ...Typography.sm,
    fontWeight: Typography.medium,
  },
  drugSub: {
    ...Typography.xs,
  },
  drugBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  drugBar: {
    height: 8,
    borderRadius: 4,
  },
  drugPct: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
    width: 40,
    textAlign: "right",
  },
  timeGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  timeCard: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    gap: 4,
  },
  timeLabel: {
    ...Typography.xs,
  },
  timeValue: {
    ...Typography.md,
    fontWeight: Typography.bold,
  },
  bottomSpace: { height: 100 },
});
