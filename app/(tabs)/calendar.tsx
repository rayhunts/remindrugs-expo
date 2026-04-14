import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, type DateData } from "react-native-calendars";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAdherence } from "@/hooks/use-adherence";
import { useReminders } from "@/hooks/use-reminders";
import { useLanguage } from "@/contexts/language-context";
import {
  getMonthName,
  toDateString,
  isWithinLast7Days,
  isToday,
  formatTime,
  getLocaleCode,
} from "@/utils/date-helpers";
import type { AdherenceLog } from "@/types/adherence";
import type { ReminderWithDrugs } from "@/hooks/use-reminders";

function StatusBadge({
  status,
  colors,
}: {
  status: string;
  colors: ReturnType<typeof getColors>;
}) {
  const { t } = useLanguage();
  const config = {
    taken: {
      color: colors.success,
      bg: colors.successLight,
      label: t.common.taken,
      icon: "check-circle",
    },
    missed: {
      color: colors.danger,
      bg: colors.dangerLight,
      label: t.common.missed,
      icon: "close-circle",
    },
    skipped: {
      color: colors.textTertiary,
      bg: colors.divider,
      label: t.common.skipped,
      icon: "minus-circle",
    },
  }[status] ?? {
    color: colors.textTertiary,
    bg: colors.divider,
    label: status,
    icon: "help-circle",
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <MaterialCommunityIcons name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

export default function CalendarScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const {
    getMonthlyStats,
    getMarkedDates,
    getLogsForDate,
    markTaken,
    markMissed,
    markSkipped,
    refreshLogs,
  } = useAdherence();
  const { reminders } = useReminders();
  const { t, locale } = useLanguage();

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(() => toDateString(new Date()));
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(
    () => getMonthlyStats(currentMonth.year, currentMonth.month),
    [getMonthlyStats, currentMonth],
  );

  const markedDates = useMemo(
    () => getMarkedDates(currentMonth.year, currentMonth.month, reminders),
    [getMarkedDates, currentMonth, reminders],
  );

  const selectedLogs = useMemo(
    () => (selectedDate ? getLogsForDate(selectedDate) : []),
    [selectedDate, getLogsForDate],
  );

  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) return [];
    const d = new Date(selectedDate + "T00:00:00");
    const weekday = d.getDay();
    return reminders.filter((r) => {
      if (!r.isActive) return false;
      if (!r.days.includes(weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6)) return false;
      if (r.startDate && selectedDate < r.startDate) return false;
      if (r.endDate && selectedDate > r.endDate) return false;
      return true;
    });
  }, [selectedDate, reminders]);

  // Key by reminderId:drugId for per-reminder-drug independent tracking
  const selectedLogMap = useMemo(() => {
    const map = new Map<string, AdherenceLog>();
    for (const log of selectedLogs) {
      map.set(`${log.reminderId}:${log.drugId}`, log);
    }
    return map;
  }, [selectedLogs]);

  const isPastAndEditable = useMemo(() => {
    if (!selectedDate) return false;
    if (isToday(selectedDate)) return true;
    return isWithinLast7Days(selectedDate);
  }, [selectedDate]);

  const hasUnloggedDrugs = useMemo(() => {
    for (const r of selectedDateReminders) {
      for (const drug of r.drugs) {
        if (!selectedLogMap.has(`${r.id}:${drug.id}`)) return true;
      }
    }
    return false;
  }, [selectedDateReminders, selectedLogMap]);

  const isFuture = useMemo(() => {
    if (!selectedDate) return false;
    const todayStr = toDateString(new Date());
    return selectedDate > todayStr;
  }, [selectedDate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshLogs();
    setRefreshing(false);
  }, [refreshLogs]);

  const onMonthChange = useCallback((month: DateData) => {
    setCurrentMonth({ year: month.year, month: month.month - 1 });
    setSelectedDate(null);
  }, []);

  const onDayPress = useCallback(
    (day: DateData) => {
      const dateStr = toDateString(new Date(day.year, day.month - 1, day.day));
      setSelectedDate(dateStr === selectedDate ? null : dateStr);
    },
    [selectedDate],
  );

  const handleMarkDrug = useCallback(
    (reminderId: string, drugId: string, status: "taken" | "missed" | "skipped") => {
      if (!selectedDate) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (status === "taken") markTaken(reminderId, drugId, selectedDate);
      else if (status === "missed") markMissed(reminderId, drugId, selectedDate);
      else markSkipped(reminderId, drugId, selectedDate);
    },
    [selectedDate, markTaken, markMissed, markSkipped],
  );

  const selectedMarked = useMemo(() => {
    if (!selectedDate) return markedDates;
    return {
      ...markedDates,
      [selectedDate]: {
        ...(markedDates[selectedDate] ?? { dots: [] }),
        selected: true,
        selectedColor: colors.primary,
      },
    };
  }, [selectedDate, markedDates, colors.primary]);

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: colors.card,
      calendarBackground: colors.card,
      textSectionTitleColor: colors.textSecondary,
      selectedDayBackgroundColor: colors.primary,
      selectedDayTextColor: colors.textInverse,
      todayTextColor: colors.primary,
      dayTextColor: colors.textPrimary,
      textDisabledColor: colors.textTertiary,
      monthTextColor: colors.textPrimary,
      arrowColor: colors.primary,
      "stylesheet.calendar.main": {
        backgroundColor: colors.card,
      },
      "stylesheet.calendar.header": {
        dayHeader: {
          ...Typography.xs,
          fontWeight: Typography.semibold as unknown as number,
          color: colors.textTertiary,
          paddingBottom: Spacing.sm,
        },
      },
      "stylesheet.day.basic": {
        base: {
          width: 32,
          height: 32,
          alignItems: "center" as unknown as string,
          justifyContent: "center" as unknown as string,
        },
        text: {
          ...Typography.sm,
          color: colors.textPrimary,
          textAlign: "center" as unknown as string,
          lineHeight: 32,
        },
        today: {
          backgroundColor: colors.primaryLight,
          borderRadius: Radius.full,
        },
        todayText: {
          ...Typography.sm,
          fontWeight: Typography.bold as unknown as number,
          color: colors.primary,
          textAlign: "center" as unknown as string,
          lineHeight: 32,
        },
        selected: {
          backgroundColor: colors.primary,
          borderRadius: Radius.full,
        },
        selectedText: {
          ...Typography.sm,
          fontWeight: Typography.bold as unknown as number,
          color: colors.textInverse,
          textAlign: "center" as unknown as string,
          lineHeight: 32,
        },
      },
      "stylesheet.day.multiDot": {
        dotsContainer: {
          flexDirection: "row" as unknown as string,
          alignItems: "center" as unknown as string,
          justifyContent: "center" as unknown as string,
        },
        dot: {
          width: 4,
          height: 4,
          borderRadius: 2,
          marginHorizontal: 1,
        },
      },
    }),
    [colors],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {getMonthName(currentMonth.year, currentMonth.month, getLocaleCode(locale))}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.statValueLg, { color: colors.primary }]}>{stats.adherencePercent}%</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>{t.calendar.adherence}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statIconRow}>
              <MaterialCommunityIcons name="fire" size={16} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.streak}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.calendar.dayStreak}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statIconRow}>
              <MaterialCommunityIcons name="close-circle-outline" size={16} color={colors.danger} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.missedDoses}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.common.missed}</Text>
          </View>
        </View>

        <View style={[styles.calendarWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Calendar
            key={scheme}
            current={`${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-01`}
            markingType="multi-dot"
            markedDates={selectedMarked}
            onMonthChange={onMonthChange}
            onDayPress={onDayPress}
            theme={calendarTheme}
            enableSwipeMonths
            renderArrow={(direction: "left" | "right") => (
              <MaterialCommunityIcons
                name={direction === "left" ? "chevron-left" : "chevron-right"}
                size={24}
                color={colors.primary}
              />
            )}
          />
        </View>

        {selectedDate && (
          <View style={styles.daySection}>
            <Text style={[styles.daySectionTitle, { color: colors.textPrimary }]}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(getLocaleCode(locale), {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </Text>

            {isFuture ? (
              <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="calendar-clock" size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyDayText, { color: colors.textTertiary }]}>{t.calendar.noDataYet}</Text>
              </View>
            ) : selectedDateReminders.length === 0 && selectedLogs.length === 0 ? (
              <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyDayText, { color: colors.textTertiary }]}>
                  {t.calendar.noMedsScheduled}
                </Text>
              </View>
            ) : (
              <View style={styles.logList}>
                {selectedDateReminders.map((reminder) => {
                  return (
                    <View key={reminder.id} style={styles.reminderGroup}>
                      <View style={styles.reminderGroupHeader}>
                        <Text style={[styles.reminderGroupName, { color: colors.textPrimary }]}>
                          {reminder.name}
                        </Text>
                        <Text style={[styles.reminderGroupTime, { color: colors.textTertiary }]}>
                          {formatTime(reminder.hour, reminder.minute)}
                        </Text>
                      </View>
                      {reminder.drugs.map((drug) => {
                        const log = selectedLogMap.get(`${reminder.id}:${drug.id}`);
                        return (
                          <View
                            key={drug.id}
                            style={[styles.logItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                          >
                            <View style={styles.logLeft}>
                              <MaterialCommunityIcons
                                name={
                                  log?.status === "taken"
                                    ? "check-circle"
                                    : log?.status === "missed"
                                      ? "close-circle"
                                      : log?.status === "skipped"
                                        ? "minus-circle"
                                        : "clock-outline"
                                }
                                size={20}
                                color={
                                  log?.status === "taken"
                                    ? colors.success
                                    : log?.status === "missed"
                                      ? colors.danger
                                      : log?.status === "skipped"
                                        ? colors.textTertiary
                                        : colors.primary
                                }
                              />
                              <View style={styles.logInfo}>
                                <Text style={[styles.logDrugName, { color: colors.textPrimary }]}>
                                  {drug.name} {drug.dosage}
                                </Text>
                                {log?.takenAt ? (
                                  <Text style={[styles.logTime, { color: colors.textTertiary }]}>
                                    {t.calendar.takenAt} {formatTime(new Date(log.takenAt).getHours(), new Date(log.takenAt).getMinutes())}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                            {log ? (
                              <StatusBadge status={log.status} colors={colors} />
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}

                {isPastAndEditable && hasUnloggedDrugs && (
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => {
                        let count = 0;
                        for (const r of selectedDateReminders) {
                          for (const drug of r.drugs) {
                            if (!selectedLogMap.has(`${r.id}:${drug.id}`)) {
                              handleMarkDrug(r.id, drug.id, "taken");
                              count++;
                            }
                          }
                        }
                        if (count === 0) {
                          Alert.alert(t.calendar.allLogged, t.calendar.allLoggedMessage);
                        }
                      }}
                      style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.success, opacity: pressed ? 0.7 : 1 }]}
                    >
                      <MaterialCommunityIcons name="check" size={16} color={colors.textInverse} />
                      <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>{t.calendar.allTaken}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        let count = 0;
                        for (const r of selectedDateReminders) {
                          for (const drug of r.drugs) {
                            if (!selectedLogMap.has(`${r.id}:${drug.id}`)) {
                              handleMarkDrug(r.id, drug.id, "missed");
                              count++;
                            }
                          }
                        }
                        if (count === 0) {
                          Alert.alert(t.calendar.allLogged, t.calendar.allLoggedMessage);
                        }
                      }}
                      style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.danger, opacity: pressed ? 0.7 : 1 }]}
                    >
                      <MaterialCommunityIcons name="close" size={16} color={colors.textInverse} />
                      <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>{t.calendar.allMissed}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.calendar.allTakenLegend}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.calendar.partial}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.calendar.missed}</Text>
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
  header: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.xl,
    fontWeight: Typography.bold,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
  },
  statValue: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  statValueLg: {
    ...Typography.xl,
    fontWeight: Typography.bold,
  },
  statLabel: {
    ...Typography.xs,
    marginTop: 2,
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  calendarWrap: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  daySection: {
    marginBottom: Spacing.md,
  },
  daySectionTitle: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  emptyDay: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyDayText: {
    ...Typography.sm,
  },
  logList: {
    gap: Spacing.sm,
  },
  reminderGroup: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  reminderGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  reminderGroupName: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  reminderGroupTime: {
    ...Typography.sm,
  },
  logItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  logLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  logInfo: {
    flex: 1,
  },
  logDrugName: {
    ...Typography.sm,
    fontWeight: Typography.medium,
  },
  logTime: {
    ...Typography.xs,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusLabel: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  actionBtnText: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...Typography.xs,
  },
  bottomSpace: { height: 100 },
});
