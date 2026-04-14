import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  RefreshControl,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius, Shadow } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReminders } from "@/hooks/use-reminders";
import type { ReminderWithDrugs } from "@/hooks/use-reminders";
import { useAdherence } from "@/hooks/use-adherence";
import { ReminderCard } from "@/components/reminder-card";
import { SkeletonCard } from "@/components/skeleton-card";
import { EmptyState } from "@/components/empty-state";
import { PermissionBanner } from "@/components/permission-banner";
import { ToastSnackbar } from "@/components/toast-snackbar";
import { ActionSheet, type ActionSheetOption } from "@/components/action-sheet";
import { hasNotificationPermission } from "@/services/notification-service";
import { formatDateLong, formatTime, getLocaleCode, toDateString } from "@/utils/date-helpers";
import { useLanguage } from "@/contexts/language-context";
import type { Reminder } from "@/types/reminder";

function getGreeting(t: { home: { goodMorning: string; goodAfternoon: string; goodEvening: string } }): { text: string; icon: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: t.home.goodMorning, icon: "weather-sunny" };
  if (hour < 17) return { text: t.home.goodAfternoon, icon: "weather-partly-cloudy" };
  return { text: t.home.goodEvening, icon: "weather-night" };
}

function getTimePeriod(hour: number, t: { home: { morning: string; afternoon: string; evening: string; night: string } }): string {
  if (hour < 12) return t.home.morning;
  if (hour < 17) return t.home.afternoon;
  if (hour < 21) return t.home.evening;
  return t.home.night;
}

type HomeListItem =
  | { type: "period"; label: string; id: string }
  | { type: "reminder"; reminder: ReminderWithDrugs; id: string };

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { t, locale } = useLanguage();
  const { todayReminders, loading } = useReminders();
  const {
    logs,
    markTaken,
    markSkipped,
    getLogsForDate,
    getMonthlyStats,
    refreshLogs,
    undoLog,
  } = useAdherence();
  const [refreshing, setRefreshing] = useState(false);
  const [notifPermission, setNotifPermission] = useState(true);
  const [showPermissionBanner, setShowPermissionBanner] = useState(true);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    drugId: string;
    date: string;
  }>({ visible: false, message: "", drugId: "", date: "" });

  const [actionSheetReminder, setActionSheetReminder] = useState<{
    reminder: ReminderWithDrugs;
    time: string;
  } | null>(null);

  const greeting = useMemo(() => getGreeting(t), [t]);
  const todayStr = useMemo(() => formatDateLong(new Date(), getLocaleCode(locale)), [locale]);
  const todayDateStr = useMemo(() => toDateString(new Date()), []);

  const todayLogs = useMemo(
    () => logs.filter((l) => l.date === todayDateStr),
    [logs, todayDateStr],
  );

  // Per-reminder-drug tracking (composite keys so same drug in different reminders is independent)
  const takenDrugIds = useMemo(
    () => new Set(todayLogs.filter((l) => l.status === "taken").map((l) => `${l.reminderId}:${l.drugId}`)),
    [todayLogs],
  );

  const skippedDrugIds = useMemo(
    () => new Set(todayLogs.filter((l) => l.status === "skipped").map((l) => `${l.reminderId}:${l.drugId}`)),
    [todayLogs],
  );

  // Progress counts total drug-doses, not reminders
  const totalDrugDoses = todayReminders.reduce((sum, r) => sum + r.drugs.length, 0);
  const takenDrugCount = todayReminders.reduce(
    (sum, r) => sum + r.drugs.filter((d) => takenDrugIds.has(`${r.id}:${d.id}`)).length,
    0,
  );
  const percent =
    totalDrugDoses === 0 ? 0 : Math.round((takenDrugCount / totalDrugDoses) * 100);
  const allDone = takenDrugCount === totalDrugDoses && totalDrugDoses > 0;

  const monthStats = useMemo(
    () => getMonthlyStats(new Date().getFullYear(), new Date().getMonth()),
    [getMonthlyStats],
  );

  useEffect(() => {
    hasNotificationPermission().then(setNotifPermission);
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percent, progressAnim]);

  const handleMarkDrug = useCallback(
    (reminderId: string, drugId: string) => {
      markTaken(reminderId, drugId);
      const reminder = todayReminders.find((r) => r.id === reminderId);
      const drug = reminder?.drugs.find((d) => d.id === drugId);
      setToast({
        visible: true,
        message: t.home.markedAsTaken.replace("{name}", drug?.name ?? "Dose"),
        drugId: `${reminderId}:${drugId}`,
        date: toDateString(new Date()),
      });
    },
    [markTaken, todayReminders, t],
  );

  const handleMarkAll = useCallback(
    (reminder: ReminderWithDrugs) => {
      const today = toDateString(new Date());
      for (const drug of reminder.drugs) {
        const key = `${reminder.id}:${drug.id}`;
        if (!takenDrugIds.has(key) && !skippedDrugIds.has(key)) {
          markTaken(reminder.id, drug.id, today);
        }
      }
      setToast({
        visible: true,
        message: t.home.allDosesMarkedTaken.replace("{name}", reminder.name),
        drugId: `__all__:${reminder.id}`,
        date: today,
      });
    },
    [markTaken, takenDrugIds, skippedDrugIds, t],
  );

  const handleMarkSkipped = useCallback(
    (reminderId: string, drugId: string) => {
      markSkipped(reminderId, drugId, toDateString(new Date()));
    },
    [markSkipped],
  );

  const handleUndo = useCallback(
    (drugId: string, date: string) => {
      undoLog(drugId, date);
      setToast({ visible: false, message: "", drugId: "", date: "" });
    },
    [undoLog],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshLogs();
    setRefreshing(false);
  }, [refreshLogs]);

  const homeItems = useMemo((): HomeListItem[] => {
    const sorted = [...todayReminders].sort((a, b) =>
      a.hour !== b.hour ? a.hour - b.hour : a.minute - b.minute,
    );
    // A reminder is "fully done" if all its drugs are taken or skipped
    const isFullyDone = (r: ReminderWithDrugs) =>
      r.drugs.every((d) => takenDrugIds.has(`${r.id}:${d.id}`) || skippedDrugIds.has(`${r.id}:${d.id}`));

    const pending = sorted.filter((r) => !isFullyDone(r));
    const completed = sorted.filter(isFullyDone);
    const items: HomeListItem[] = [];
    let lastPeriod = "";
    for (const r of pending) {
      const period = getTimePeriod(r.hour, t);
      if (period !== lastPeriod) {
        items.push({ type: "period", label: period, id: `period-${period}` });
        lastPeriod = period;
      }
      items.push({ type: "reminder", reminder: r, id: r.id });
    }
    if (completed.length > 0) {
      items.push({
        type: "period",
        label: `${t.home.completed} · ${completed.length}`,
        id: "period-completed",
      });
      for (const r of completed) {
        items.push({ type: "reminder", reminder: r, id: r.id });
      }
    }
    return items;
  }, [todayReminders, takenDrugIds, skippedDrugIds, t]);

  const handleLongPress = useCallback(
    (reminder: ReminderWithDrugs) => {
      const isFullyDone = reminder.drugs.every(
        (d) => takenDrugIds.has(`${reminder.id}:${d.id}`) || skippedDrugIds.has(`${reminder.id}:${d.id}`),
      );
      const options: ActionSheetOption[] = [];

      if (!isFullyDone) {
        options.push({
          label: t.home.markAllTaken,
          icon: "check-circle-outline",
          onPress: () => handleMarkAll(reminder),
        });
        options.push({
          label: t.home.skipAll,
          icon: "minus-circle-outline",
          onPress: () => {
            const today = toDateString(new Date());
            for (const drug of reminder.drugs) {
              const key = `${reminder.id}:${drug.id}`;
              if (!takenDrugIds.has(key) && !skippedDrugIds.has(key)) {
                handleMarkSkipped(reminder.id, drug.id);
              }
            }
          },
        });
      }

      options.push({
        label: t.home.editReminder,
        icon: "pencil-outline",
        onPress: () => router.push(`/edit-reminder/${reminder.id}`),
      });

      setActionSheetReminder({
        reminder,
        time: formatTime(reminder.hour, reminder.minute),
      });
    },
    [takenDrugIds, skippedDrugIds, handleMarkAll, handleMarkSkipped, t],
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingLeft}>
              <View style={[styles.skeletonText, { backgroundColor: colors.divider }]} />
              <View style={[styles.skeletonTextSm, { backgroundColor: colors.divider }]} />
            </View>
          </View>
        </View>
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <FlashList
        data={homeItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {!notifPermission && showPermissionBanner && (
              <PermissionBanner onDismiss={() => setShowPermissionBanner(false)} />
            )}

            <View style={styles.greetingRow}>
              <View style={styles.greetingLeft}>
                <Text style={[styles.greeting, { color: colors.textPrimary }]}>
                  {greeting.text}
                </Text>
                <Text style={[styles.date, { color: colors.textSecondary }]}>{todayStr}</Text>
              </View>
              <View
                style={[styles.greetingIcon, { backgroundColor: colors.primaryLight }]}
              >
                <MaterialCommunityIcons name={greeting.icon as any} size={24} color={colors.primary} />
              </View>
            </View>

            {totalDrugDoses > 0 && (
              <View style={[styles.progressCard, { backgroundColor: colors.primaryLight }]}>
                <View style={styles.progressInfo}>
                  <MaterialCommunityIcons
                    name={allDone ? "check-circle" : "clock-outline"}
                    size={20}
                    color={allDone ? colors.success : colors.primary}
                  />
                  <Text
                    style={[styles.progressTitle, { color: allDone ? colors.success : colors.primary }]}
                  >
                    {allDone
                      ? t.home.allDone
                      : `${totalDrugDoses - takenDrugCount} ${totalDrugDoses - takenDrugCount !== 1 ? t.home.dosesRemaining : t.home.doseRemaining}`}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: `${colors.primary}20` }]}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                        backgroundColor: allDone ? colors.success : colors.primary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressFooter}>
                  <Text style={[styles.progressSubtitle, { color: colors.primary }]}>
                    {takenDrugCount} {t.home.ofDosesTaken.replace("{total}", String(totalDrugDoses))}
                  </Text>
                  {monthStats.streak > 0 && (
                    <View style={[styles.streakBadge, { backgroundColor: colors.warningLight }]}>
                      <MaterialCommunityIcons name="fire" size={14} color={colors.warning} />
                      <Text style={[styles.streakText, { color: colors.warning }]}>
                        {monthStats.streak}d
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="pill"
            title={t.home.noMedsToday}
            message={t.home.noMedsTodayMessage}
            buttonLabel={t.home.addReminder}
            onPress={() => router.push("/add-reminder")}
          />
        }
        renderItem={({ item }) => {
          if (item.type === "period") {
            return (
              <Text style={[styles.periodHeader, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
            );
          }
          return (
            <ReminderCard
              reminder={item.reminder}
              drugs={item.reminder.drugs}
              takenDrugIds={takenDrugIds}
              skippedDrugIds={skippedDrugIds}
              onMarkDrug={(drugId) => handleMarkDrug(item.reminder.id, drugId)}
              onMarkAll={() => handleMarkAll(item.reminder)}
              onLongPress={() => handleLongPress(item.reminder)}
            />
          );
        }}
        contentContainerStyle={styles.list}
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/add-reminder");
        }}
        style={[styles.fab, Shadow.fab, { backgroundColor: colors.primary }]}
        accessibilityLabel="Add new reminder"
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </Pressable>

      {actionSheetReminder && (
        <ActionSheet
          options={(() => {
            const r = actionSheetReminder.reminder;
            const isFullyDone = r.drugs.every(
              (d) => takenDrugIds.has(`${r.id}:${d.id}`) || skippedDrugIds.has(`${r.id}:${d.id}`),
            );
            const opts: ActionSheetOption[] = [];
            if (!isFullyDone) {
              opts.push(
                {
                  label: t.home.markAllTaken,
                  icon: "check-circle-outline",
                  onPress: () => handleMarkAll(r),
                },
                {
                  label: t.home.skipAll,
                  icon: "minus-circle-outline",
                  onPress: () => {
                    const today = toDateString(new Date());
                    for (const drug of r.drugs) {
                      const key = `${r.id}:${drug.id}`;
                      if (!takenDrugIds.has(key) && !skippedDrugIds.has(key)) {
                        handleMarkSkipped(r.id, drug.id);
                      }
                    }
                  },
                },
              );
            }
            opts.push({
              label: t.home.editReminder,
              icon: "pencil-outline",
              onPress: () => router.push(`/edit-reminder/${r.id}`),
            });
            return opts;
          })()}
          onCancel={() => setActionSheetReminder(null)}
        />
      )}

      <ToastSnackbar
        visible={toast.visible}
        message={toast.message}
        actionLabel={t.common.undo}
        onAction={() => handleUndo(toast.drugId, toast.date)}
        onDismiss={() => setToast({ visible: false, message: "", drugId: "", date: "" })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  greetingLeft: { flex: 1 },
  greeting: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  date: {
    ...Typography.base,
    marginTop: Spacing.xs,
  },
  greetingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    ...Typography.md,
    fontWeight: Typography.semibold,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.full,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: Radius.full,
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressSubtitle: {
    ...Typography.xs,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  streakText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
  },
  periodHeader: {
    ...Typography.sm,
    fontWeight: Typography.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  list: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  fab: {
    position: "absolute",
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonText: {
    height: 24,
    width: 160,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  skeletonTextSm: {
    height: 16,
    width: 200,
    borderRadius: 4,
  },
});
