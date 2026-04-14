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
import { useAdherence } from "@/hooks/use-adherence";
import { ReminderCard } from "@/components/reminder-card";
import { SkeletonCard } from "@/components/skeleton-card";
import { EmptyState } from "@/components/empty-state";
import { PermissionBanner } from "@/components/permission-banner";
import { ToastSnackbar } from "@/components/toast-snackbar";
import { ActionSheet, type ActionSheetOption } from "@/components/action-sheet";
import { hasNotificationPermission } from "@/services/notification-service";
import { formatDateLong, formatTime, toDateString } from "@/utils/date-helpers";
import type { Reminder } from "@/types/reminder";

function getGreeting(): { text: string; icon: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: "weather-sunny" };
  if (hour < 17)
    return { text: "Good afternoon", icon: "weather-partly-cloudy" };
  return { text: "Good evening", icon: "weather-night" };
}

function getTimePeriod(hour: number): string {
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  if (hour < 21) return "Evening";
  return "Night";
}

type HomeListItem =
  | { type: "period"; label: string; id: string }
  | { type: "reminder"; reminder: Reminder; id: string };

export default function HomeScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { todayReminders, loading } = useReminders();
  const {
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

  // Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    reminderId: string;
  }>({ visible: false, message: "", reminderId: "" });

  // Action sheet state
  const [actionSheetReminder, setActionSheetReminder] = useState<{
    reminder: Reminder;
    time: string;
  } | null>(null);

  const greeting = useMemo(() => getGreeting(), []);
  const todayStr = useMemo(() => formatDateLong(new Date()), []);

  const todayLogs = useMemo(
    () => getLogsForDate(toDateString(new Date())),
    [getLogsForDate],
  );

  const takenIds = useMemo(
    () =>
      new Set(
        todayLogs
          .filter((l) => l.status === "taken")
          .map((l) => l.reminderId),
      ),
    [todayLogs],
  );

  const skippedIds = useMemo(
    () =>
      new Set(
        todayLogs
          .filter((l) => l.status === "skipped")
          .map((l) => l.reminderId),
      ),
    [todayLogs],
  );

  const takenCount = takenIds.size;
  const totalCount = todayReminders.length;
  const percent =
    totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100);
  const allDone = takenCount === totalCount && totalCount > 0;

  // Streak
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

  const handleMarkTaken = useCallback(
    (reminderId: string) => {
      markTaken(reminderId);
      const reminder = todayReminders.find((r) => r.id === reminderId);
      setToast({
        visible: true,
        message: `${reminder?.name ?? "Dose"} marked as taken`,
        reminderId,
      });
    },
    [markTaken, todayReminders],
  );

  const handleMarkSkipped = useCallback(
    (reminderId: string) => {
      markSkipped(reminderId, toDateString(new Date()));
    },
    [markSkipped],
  );

  const handleUndo = useCallback(
    (reminderId: string) => {
      undoLog(reminderId, toDateString(new Date()));
      setToast({ visible: false, message: "", reminderId: "" });
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
    const pending = sorted.filter(
      (r) => !takenIds.has(r.id) && !skippedIds.has(r.id),
    );
    const completed = sorted.filter(
      (r) => takenIds.has(r.id) || skippedIds.has(r.id),
    );
    const items: HomeListItem[] = [];
    let lastPeriod = "";
    for (const r of pending) {
      const period = getTimePeriod(r.hour);
      if (period !== lastPeriod) {
        items.push({ type: "period", label: period, id: `period-${period}` });
        lastPeriod = period;
      }
      items.push({ type: "reminder", reminder: r, id: r.id });
    }
    if (completed.length > 0) {
      items.push({
        type: "period",
        label: `Completed · ${completed.length}`,
        id: "period-completed",
      });
      for (const r of completed) {
        items.push({ type: "reminder", reminder: r, id: r.id });
      }
    }
    return items;
  }, [todayReminders, takenIds, skippedIds]);

  const handleLongPress = useCallback(
    (reminder: Reminder) => {
      const isTaken = takenIds.has(reminder.id);
      const isSkipped = skippedIds.has(reminder.id);
      const options: ActionSheetOption[] = [];

      if (!isTaken && !isSkipped) {
        options.push({
          label: "Mark as Taken",
          icon: "check-circle-outline",
          onPress: () => handleMarkTaken(reminder.id),
        });
        options.push({
          label: "Skip This Dose",
          icon: "minus-circle-outline",
          onPress: () => handleMarkSkipped(reminder.id),
        });
      }

      options.push({
        label: "Edit Reminder",
        icon: "pencil-outline",
        onPress: () => router.push(`/edit-reminder/${reminder.id}`),
      });

      setActionSheetReminder({
        reminder,
        time: formatTime(reminder.hour, reminder.minute),
      });
    },
    [takenIds, skippedIds, handleMarkTaken, handleMarkSkipped],
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
              <View
                style={[
                  styles.skeletonText,
                  { backgroundColor: colors.divider },
                ]}
              />
              <View
                style={[
                  styles.skeletonTextSm,
                  { backgroundColor: colors.divider },
                ]}
              />
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Permission banner */}
            {!notifPermission && showPermissionBanner && (
              <PermissionBanner
                onDismiss={() => setShowPermissionBanner(false)}
              />
            )}

            {/* Greeting */}
            <View style={styles.greetingRow}>
              <View style={styles.greetingLeft}>
                <Text
                  style={[styles.greeting, { color: colors.textPrimary }]}
                >
                  {greeting.text}
                </Text>
                <Text style={[styles.date, { color: colors.textSecondary }]}>
                  {todayStr}
                </Text>
              </View>
              <View
                style={[
                  styles.greetingIcon,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <MaterialCommunityIcons
                  name={greeting.icon as any}
                  size={24}
                  color={colors.primary}
                />
              </View>
            </View>

            {/* Progress Card */}
            {totalCount > 0 && (
              <View
                style={[
                  styles.progressCard,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <View style={styles.progressInfo}>
                  <MaterialCommunityIcons
                    name={allDone ? "check-circle" : "clock-outline"}
                    size={20}
                    color={allDone ? colors.success : colors.primary}
                  />
                  <Text
                    style={[
                      styles.progressTitle,
                      {
                        color: allDone ? colors.success : colors.primary,
                      },
                    ]}
                  >
                    {allDone
                      ? "All done for today!"
                      : `${totalCount - takenCount} dose${totalCount - takenCount !== 1 ? "s" : ""} remaining`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: `${colors.primary}20` },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                        backgroundColor: allDone
                          ? colors.success
                          : colors.primary,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressFooter}>
                  <Text
                    style={[styles.progressSubtitle, { color: colors.primary }]}
                  >
                    {takenCount} of {totalCount} doses taken
                  </Text>
                  {monthStats.streak > 0 && (
                    <View style={styles.streakBadge}>
                      <MaterialCommunityIcons
                        name="fire"
                        size={14}
                        color={colors.warning}
                      />
                      <Text
                        style={[styles.streakText, { color: colors.warning }]}
                      >
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
            title="No meds today!"
            message="Enjoy your day or add a new reminder."
            buttonLabel="+ Add Reminder"
            onPress={() => router.push("/add-reminder")}
          />
        }
        renderItem={({ item }) => {
          if (item.type === "period") {
            return (
              <Text
                style={[styles.periodHeader, { color: colors.textSecondary }]}
              >
                {item.label}
              </Text>
            );
          }
          const isTaken = takenIds.has(item.reminder.id);
          const isSkipped = skippedIds.has(item.reminder.id);
          return (
            <ReminderCard
              reminder={item.reminder}
              isTaken={isTaken}
              isSkipped={isSkipped}
              onMarkTaken={() => handleMarkTaken(item.reminder.id)}
              onLongPress={() => handleLongPress(item.reminder)}
            />
          );
        }}
        contentContainerStyle={styles.list}
      />

      {/* FAB — always visible */}
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

      {/* Action Sheet */}
      {actionSheetReminder && (
        <ActionSheet
          options={(() => {
            const r = actionSheetReminder.reminder;
            const isTaken = takenIds.has(r.id);
            const isSkipped = skippedIds.has(r.id);
            const opts: ActionSheetOption[] = [];
            if (!isTaken && !isSkipped) {
              opts.push(
                {
                  label: "Mark as Taken",
                  icon: "check-circle-outline",
                  onPress: () => handleMarkTaken(r.id),
                },
                {
                  label: "Skip This Dose",
                  icon: "minus-circle-outline",
                  onPress: () => handleMarkSkipped(r.id),
                },
              );
            }
            opts.push({
              label: "Edit Reminder",
              icon: "pencil-outline",
              onPress: () => router.push(`/edit-reminder/${r.id}`),
            });
            return opts;
          })()}
          onCancel={() => setActionSheetReminder(null)}
        />
      )}

      {/* Undo Toast */}
      <ToastSnackbar
        visible={toast.visible}
        message={toast.message}
        actionLabel="Undo"
        onAction={() => handleUndo(toast.reminderId)}
        onDismiss={() => setToast({ visible: false, message: "", reminderId: "" })}
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
  greetingLeft: {
    flex: 1,
  },
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
    backgroundColor: "#FEF3C7",
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
