import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Drug, Reminder, Weekday } from "@/types/reminder";
import { toExpoWeekday, buildNotificationBody } from "@/utils/notification-helpers";
import { SchedulableTriggerInputTypes } from "expo-notifications";

// ── Handler (call at module level in _layout.tsx) ───────────────────────────

export function setNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ── Channel setup (Android) ─────────────────────────────────────────────────

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("remindrugs-channel", {
      name: "Medication Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }
}

// ── Permissions ─────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

// ── Scheduling ──────────────────────────────────────────────────────────────

async function scheduleForDay(
  reminder: Reminder,
  day: Weekday,
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.name,
      body: buildNotificationBody(reminder),
      sound: true,
      data: { reminderId: reminder.id },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.WEEKLY,
      weekday: toExpoWeekday(day),
      hour: reminder.hour,
      minute: reminder.minute,
      channelId: "remindrugs-channel",
    },
  });
  return id;
}

export async function scheduleReminder(
  reminder: Reminder,
): Promise<string[]> {
  const ids: string[] = [];
  for (const day of reminder.days) {
    const id = await scheduleForDay(reminder, day);
    ids.push(id);
  }
  return ids;
}

export async function cancelReminder(
  notificationIds: string[],
): Promise<void> {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function rescheduleReminder(
  reminder: Reminder,
): Promise<string[]> {
  await cancelReminder(reminder.notificationIds);
  return scheduleReminder(reminder);
}

// ── Refill reminder ─────────────────────────────────────────────────────────

export async function scheduleRefillReminder(
  drug: Drug,
  reminderId: string,
): Promise<void> {
  if (
    drug.currentStock === undefined ||
    drug.stockThreshold === undefined
  )
    return;
  if (drug.currentStock > drug.stockThreshold) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Refill Needed: ${drug.name}`,
      body: `You only have ${drug.currentStock} ${drug.form}(s) left. Time to refill!`,
      data: { reminderId, drugId: drug.id, type: "refill" },
    },
    trigger: null,
  });
}
