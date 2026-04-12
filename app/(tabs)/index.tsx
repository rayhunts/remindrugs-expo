import { useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReminders } from "@/hooks/use-reminders";
import { useAdherence } from "@/hooks/use-adherence";
import { ProgressBar } from "@/components/progress-bar";
import { ReminderCard } from "@/components/reminder-card";
import { EmptyState } from "@/components/empty-state";
import { formatDateLong } from "@/utils/date-helpers";

function getGreeting(): { text: string; icon: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: "weather-sunny" };
  if (hour < 17) return { text: "Good afternoon", icon: "weather-partly-cloudy" };
  return { text: "Good evening", icon: "weather-night" };
}

export default function TodayScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { todayReminders, loading: remindersLoading } = useReminders();
  const { markTaken, getLogsForDate } = useAdherence();

  const greeting = useMemo(() => getGreeting(), []);
  const todayStr = useMemo(
    () => formatDateLong(new Date()),
    [],
  );
  const todayLogs = useMemo(
    () => getLogsForDate(new Date().toISOString().split("T")[0]),
    [getLogsForDate],
  );
  const takenIds = useMemo(
    () => new Set(todayLogs.filter((l) => l.status === "taken").map((l) => l.reminderId)),
    [todayLogs],
  );
  const takenCount = takenIds.size;
  const totalCount = todayReminders.length;

  const handleMarkTaken = useCallback(
    (reminderId: string) => {
      markTaken(reminderId);
    },
    [markTaken],
  );

  const sortedReminders = useMemo(
    () =>
      [...todayReminders].sort((a, b) => {
        if (a.hour !== b.hour) return a.hour - b.hour;
        return a.minute - b.minute;
      }),
    [todayReminders],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <FlashList
        data={sortedReminders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Greeting */}
            <View style={styles.greetingRow}>
              <Text style={[styles.greeting, { color: colors.textPrimary }]}>
                {greeting.text}
              </Text>
              <MaterialCommunityIcons
                name={greeting.icon}
                size={22}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {todayStr}
            </Text>

            {/* Progress */}
            {totalCount > 0 && (
              <View style={styles.progressWrap}>
                <ProgressBar taken={takenCount} total={totalCount} />
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
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            isTaken={takenIds.has(item.id)}
            onMarkTaken={() => handleMarkTaken(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />

      {/* FAB */}
      {totalCount > 0 && (
        <Pressable
          onPress={() => router.push("/add-reminder")}
          style={[styles.fab, { backgroundColor: colors.primary }]}
          accessibilityLabel="Add new reminder"
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  greeting: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  date: {
    ...Typography.base,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  progressWrap: {
    marginBottom: Spacing.md,
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
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: Typography.bold,
    color: "#FFFFFF",
  },
});
