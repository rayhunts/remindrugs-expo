import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Drug, Reminder, Weekday } from "@/types/reminder";
import { toExpoWeekday, buildNotificationBody } from "@/utils/notification-helpers";
import { SchedulableTriggerInputTypes } from "expo-notifications";

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

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("remindrugs-channel", {
      name: "Medication Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
    });
  }

  await Notifications.setNotificationCategoryAsync("reminder-actions", [
    { identifier: "mark-done", buttonTitle: "Done", options: {} as any },
    { identifier: "snooze", buttonTitle: "Snooze 15m", options: {} as any },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
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

async function scheduleForDay(reminder: Reminder, drugs: Drug[], day: Weekday): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.name,
      body: buildNotificationBody(drugs),
      sound: true,
      data: { reminderId: reminder.id },
      categoryIdentifier: "reminder-actions",
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

export async function scheduleReminder(reminder: Reminder, drugs: Drug[]): Promise<string[]> {
  const ids: string[] = [];
  for (const day of reminder.days) {
    const id = await scheduleForDay(reminder, drugs, day);
    ids.push(id);
  }
  return ids;
}

export async function cancelReminder(notificationIds: string[]): Promise<void> {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function rescheduleReminder(reminder: Reminder, drugs: Drug[]): Promise<string[]> {
  await cancelReminder(reminder.notificationIds);
  return scheduleReminder(reminder, drugs);
}

export async function scheduleSnooze(reminder: Reminder, drugs: Drug[]): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Snoozed: ${reminder.name}`,
      body: buildNotificationBody(drugs),
      sound: true,
      data: { reminderId: reminder.id, type: "snooze" },
      categoryIdentifier: "reminder-actions",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      channelId: "remindrugs-channel",
      date: new Date(Date.now() + 15 * 60 * 1000),
    } as any,
  });
  return id;
}

export async function scheduleRefillReminder(drug: Drug, reminderId: string): Promise<void> {
  if (drug.currentStock === undefined || drug.stockThreshold === undefined) return;
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
