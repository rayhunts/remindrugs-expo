import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getColors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, Shadow } from "@/constants/spacing";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useReminders } from "@/hooks/use-reminders";
import { EmptyState } from "@/components/empty-state";
import { SwipeableMedicationCard } from "@/components/swipeable-medication-card";
import { SkeletonCard } from "@/components/skeleton-card";
import {
  cancelReminder,
  rescheduleReminder,
} from "@/services/notification-service";
import { updateReminder as dbUpdateReminder } from "@/services/database";
import type { Reminder } from "@/types/reminder";

type MedListItem =
  | { type: "header"; title: string; id: string }
  | { type: "med"; reminder: Reminder; id: string };

export default function MedicationsScreen() {
  const scheme = useColorScheme();
  const colors = getColors(scheme);
  const { reminders, toggleActive, deleteReminder, refreshReminders, loading } =
    useReminders();
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
          dbUpdateReminder({
            ...reminder,
            notificationIds: ids,
            isActive: true,
          });
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

  const listItems = useMemo((): MedListItem[] => {
    const items: MedListItem[] = [];
    if (activeReminders.length > 0) {
      items.push({
        type: "header",
        title: `Active · ${activeReminders.length}`,
        id: "h-active",
      });
      activeReminders.forEach((r) =>
        items.push({ type: "med", reminder: r, id: r.id }),
      );
    }
    if (inactiveReminders.length > 0) {
      items.push({
        type: "header",
        title: `Paused · ${inactiveReminders.length}`,
        id: "h-paused",
      });
      inactiveReminders.forEach((r) =>
        items.push({ type: "med", reminder: r, id: r.id }),
      );
    }
    return items;
  }, [activeReminders, inactiveReminders]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Medications
          </Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Medications
        </Text>
      </View>

      <FlashList
        data={listItems}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="pill"
            title="No medications yet"
            message="Add your first medication reminder to get started."
            buttonLabel="+ Add Medication"
            onPress={() => router.push("/add-reminder")}
          />
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text
                style={[styles.sectionHeader, { color: colors.textSecondary }]}
              >
                {item.title}
              </Text>
            );
          }
          return (
            <SwipeableMedicationCard
              reminder={item.reminder}
              colors={colors}
              onToggle={() => handleToggle(item.reminder)}
              onEdit={() =>
                router.push(`/edit-reminder/${item.reminder.id}`)
              }
              onDelete={() => handleDelete(item.reminder)}
            />
          );
        }}
        contentContainerStyle={styles.list}
      />

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/add-reminder");
        }}
        style={[styles.fab, Shadow.fab, { backgroundColor: colors.primary }]}
        accessibilityLabel="Add new medication"
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
});
