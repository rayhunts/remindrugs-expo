import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReminders } from "@/hooks/use-reminders";
import { useAdherence } from "@/hooks/use-adherence";
import { formatDateLong, isWithinLast7Days, toDateString } from "@/utils/date-helpers";
import { formatTime } from "@/utils/date-helpers";
import type { AdherenceLog } from "@/types/adherence";
import type { Reminder } from "@/types/reminder";

export default function CalendarScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { reminders } = useReminders();
  const { getMonthlyStats, getMarkedDates, getLogsForDate, markTaken, markMissed, markSkipped } = useAdherence();

  const now = new Date();
  const [selectedDate, setSelectedDate] = useState(toDateString(now));

  const year = now.getFullYear();
  const month = now.getMonth();
  const stats = useMemo(() => getMonthlyStats(year, month), [getMonthlyStats, year, month]);
  const markedDates = useMemo(
    () => getMarkedDates(year, month, reminders),
    [getMarkedDates, year, month, reminders],
  );

  const selectedLogs = useMemo(
    () => getLogsForDate(selectedDate),
    [getLogsForDate, selectedDate],
  );

  const selectedReminders = useMemo(
    () => reminders.filter((r) => {
      const dayOfWeek = new Date(selectedDate + "T00:00:00").getDay();
      return r.days.includes(dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    }),
    [reminders, selectedDate],
  );

  const todayStr = toDateString(now);
  const canRetroactivelyLog = isWithinLast7Days(selectedDate) && selectedDate <= todayStr;

  const handleDayPress = useCallback((day: DateData) => {
    setSelectedDate(day.dateString);
  }, []);

  const getStatusForReminder = useCallback(
    (reminderId: string): AdherenceLog["status"] | null => {
      const log = selectedLogs.find((l) => l.reminderId === reminderId);
      return log ? log.status : null;
    },
    [selectedLogs],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Calendar
        </Text>
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.adherencePercent}%</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Adherence</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{stats.streak}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.danger }]}>{stats.missedDoses}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Missed</Text>
        </View>
      </View>

      {/* Calendar */}
      <Calendar
        current={todayStr}
        markingType="multi-dot"
        markedDates={{
          ...markedDates,
          [todayStr]: {
            ...(markedDates[todayStr] || { dots: [] }),
            selected: true,
            selectedColor: colors.primary,
          },
          [selectedDate]: {
            ...(markedDates[selectedDate] || { dots: [] }),
            selected: true,
            selectedColor: selectedDate === todayStr ? colors.primary : colors.info,
          },
        }}
        onDayPress={handleDayPress}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.textSecondary,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: colors.textInverse,
          todayTextColor: colors.primary,
          dayTextColor: colors.textPrimary,
          textDisabledColor: colors.textTertiary,
          monthTextColor: colors.textPrimary,
          arrowColor: colors.primary,
        }}
        style={styles.calendar}
      />

      {/* Day Detail */}
      <View style={styles.dayDetail}>
        <Text style={[styles.dayTitle, { color: colors.textPrimary }]}>
          {formatDateLong(new Date(selectedDate + "T00:00:00"))}
        </Text>

        {selectedReminders.length === 0 ? (
          <View style={styles.emptyDay}>
            <Text style={[styles.emptyDayText, { color: colors.textTertiary }]}>
              No medications scheduled
            </Text>
          </View>
        ) : (
          selectedReminders.map((reminder) => {
            const status = getStatusForReminder(reminder.id);
            return (
              <View
                key={reminder.id}
                style={[
                  styles.dayCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.dayCardHeader}>
                  <View>
                    <Text style={[styles.dayCardName, { color: colors.textPrimary }]}>
                      {reminder.name}
                    </Text>
                    <Text style={[styles.dayCardTime, { color: colors.textSecondary }]}>
                      {formatTime(reminder.hour, reminder.minute)} —{" "}
                      {reminder.drugs.map((d) => `${d.name} ${d.dosage}`).join(", ")}
                    </Text>
                  </View>
                  {status && (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            status === "taken"
                              ? colors.successLight
                              : status === "skipped"
                                ? colors.warningLight
                                : colors.dangerLight,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            status === "taken"
                              ? colors.success
                              : status === "skipped"
                                ? colors.warning
                                : colors.danger,
                          ...Typography.xs,
                          fontWeight: Typography.semibold,
                        }}
                      >
                        {status === "taken"
                          ? "✓ Taken"
                          : status === "skipped"
                            ? "— Skipped"
                            : "✗ Missed"}
                      </Text>
                    </View>
                  )}
                </View>

                {canRetroactivelyLog && !status && (
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => markTaken(reminder.id, selectedDate)}
                      style={[styles.actionBtn, { backgroundColor: colors.success }]}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>
                        ✓ Taken
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => markSkipped(reminder.id, selectedDate)}
                      style={[styles.actionBtn, { backgroundColor: colors.warning }]}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>
                        — Skip
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => markMissed(reminder.id, selectedDate)}
                      style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>
                        ✗ Missed
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  title: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...Typography.xl,
    fontWeight: Typography.bold,
  },
  statLabel: {
    ...Typography.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "70%",
  },
  calendar: {
    marginBottom: Spacing.md,
  },
  dayDetail: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  dayTitle: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.md,
  },
  emptyDay: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  emptyDayText: {
    ...Typography.base,
  },
  dayCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dayCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dayCardName: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  dayCardTime: {
    ...Typography.sm,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  actionBtnText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
});
