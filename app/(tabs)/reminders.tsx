import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, RefreshControl } from "react-native";
import { router } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Radius } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReminders } from "@/hooks/use-reminders";
import { FrequencyBadge } from "@/components/frequency-badge";
import { TimeDisplay } from "@/components/time-display";
import { EmptyState } from "@/components/empty-state";
import { cancelReminder, rescheduleReminder } from "@/services/notification-service";
import { updateReminder as dbUpdateReminder } from "@/services/database";
import type { Reminder } from "@/types/reminder";
import { getFrequencyLabel, getDayAbbreviations } from "@/utils/date-helpers";

function ReminderItem({
  reminder,
  colors,
  onToggle,
  onEdit,
  onDelete,
}: {
  reminder: Reminder;
  colors: ReturnType<typeof getColors>;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const frequency = getFrequencyLabel(reminder.days) as "daily" | "weekly" | "custom";
  const dayAbbr = getDayAbbreviations(reminder.days);

  const handleLongPress = () => {
    Alert.alert(reminder.name, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: onEdit },
      {
        text: reminder.isActive ? "Pause" : "Resume",
        onPress: onToggle,
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: onDelete,
      },
    ]);
  };

  const drugNames = reminder.drugs
    .slice(0, 3)
    .map((d) => d.name)
    .join(", ");
  const moreCount = reminder.drugs.length - 3;

  return (
    <Pressable
      onLongPress={handleLongPress}
      onPress={onEdit}
      style={[
        styles.card,
        {
          backgroundColor: reminder.isActive ? colors.card : colors.background,
          borderColor: colors.border,
          opacity: reminder.isActive ? 1 : 0.7,
        },
      ]}
    >
      <View
        style={[
          styles.stripe,
          { backgroundColor: reminder.isActive ? colors.primary : colors.border },
        ]}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.name,
              { color: reminder.isActive ? colors.textPrimary : colors.textTertiary },
            ]}
          >
            {reminder.name}
          </Text>
          <FrequencyBadge type={frequency} />
        </View>

        <Text style={[styles.drugs, { color: colors.textSecondary }]} numberOfLines={1}>
          {drugNames}
          {moreCount > 0 ? ` +${moreCount} more` : ""}
        </Text>

        <View style={styles.metaRow}>
          <TimeDisplay hour={reminder.hour} minute={reminder.minute} />
          <Text style={[styles.days, { color: colors.textTertiary }]}>
            {frequency === "daily" ? "Every day" : dayAbbr}
          </Text>
        </View>

        {/* Refill warning */}
        {reminder.drugs.some(
          (d) =>
            d.currentStock !== undefined &&
            d.stockThreshold !== undefined &&
            d.currentStock <= d.stockThreshold,
        ) && (
          <View style={[styles.refillBadge, { backgroundColor: colors.dangerLight }]}>
            <MaterialCommunityIcons name="alert-circle" size={14} color={colors.danger} />
            <Text style={[styles.refillText, { color: colors.danger }]}>
              {" "}Low Stock
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function RemindersScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { reminders, toggleActive, deleteReminder, refreshReminders } = useReminders();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshReminders();
    setRefreshing(false);
  }, [refreshReminders]);

  const activeReminders = useMemo(
    () => reminders.filter((r) => r.isActive),
    [reminders],
  );
  const inactiveReminders = useMemo(
    () => reminders.filter((r) => !r.isActive),
    [reminders],
  );

  const handleToggle = useCallback(
    async (reminder: Reminder) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (reminder.isActive) {
        try {
          await cancelReminder(reminder.notificationIds);
        } catch {
          // ignore
        }
      } else {
        try {
          const ids = await rescheduleReminder(reminder);
          dbUpdateReminder({ ...reminder, notificationIds: ids, isActive: true });
          refreshReminders();
          return;
        } catch {
          // ignore
        }
      }
      toggleActive(reminder.id, !reminder.isActive);
    },
    [toggleActive, refreshReminders],
  );

  const handleDelete = useCallback(
    (reminder: Reminder) => {
      Alert.alert(
        "Delete Reminder",
        `Delete "${reminder.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              try {
                await cancelReminder(reminder.notificationIds);
              } catch {
                // ignore
              }
              deleteReminder(reminder.id);
            },
          },
        ],
      );
    },
    [deleteReminder],
  );

  const allItems = useMemo(() => {
    const items: Array<{ id: string; type: "active" | "inactive" | "header"; reminder?: Reminder; title?: string }> = [];

    if (activeReminders.length > 0) {
      items.push({ id: "header-active", type: "header", title: `Active (${activeReminders.length})` });
      activeReminders.forEach((r) =>
        items.push({ id: r.id, type: "active", reminder: r }),
      );
    }
    if (inactiveReminders.length > 0) {
      items.push({ id: "header-inactive", type: "header", title: `Paused (${inactiveReminders.length})` });
      inactiveReminders.forEach((r) =>
        items.push({ id: r.id, type: "inactive", reminder: r }),
      );
    }
    return items;
  }, [activeReminders, inactiveReminders]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <FlashList
        data={allItems}
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Reminders
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="pill"
            title="No reminders yet"
            message="Add your first medication reminder to get started."
            buttonLabel="+ Add Reminder"
            onPress={() => router.push("/add-reminder")}
          />
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                {item.title}
              </Text>
            );
          }
          return (
            <ReminderItem
              reminder={item.reminder!}
              colors={colors}
              onToggle={() => handleToggle(item.reminder!)}
              onEdit={() => router.push(`/edit-reminder/${item.reminder!.id}`)}
              onDelete={() => handleDelete(item.reminder!)}
            />
          );
        }}
        contentContainerStyle={styles.list}
      />

      {/* FAB */}
      {reminders.length > 0 && (
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
  title: {
    ...Typography.lg,
    fontWeight: Typography.bold,
  },
  sectionHeader: {
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
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  stripe: { width: 4 },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  name: {
    ...Typography.md,
    fontWeight: Typography.semibold,
    flex: 1,
    marginRight: Spacing.sm,
  },
  drugs: {
    ...Typography.sm,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  days: {
    ...Typography.sm,
  },
  refillBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
    marginTop: Spacing.sm,
  },
  refillText: {
    ...Typography.xs,
    fontWeight: Typography.semibold,
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
