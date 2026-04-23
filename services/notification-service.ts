import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Drug, Reminder, Weekday } from "@/types/reminder";
import type { AdherenceLog } from "@/types/adherence";
import { toExpoWeekday, buildNotificationBody, getNotificationTexts } from "@/utils/notification-helpers";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import * as FullscreenAlarm from "@/modules/expo-fullscreen-alarm";

function getNextTriggerMs(weekday: number, hour: number, minute: number): number {
  const now = new Date();
  const target = new Date();
  // weekday: 1=Sunday..7=Saturday (expo-notifications format)
  // JS: 0=Sunday..6=Saturday
  const jsDay = weekday - 1;
  const currentJsDay = now.getDay();
  const diff = (jsDay - currentJsDay + 7) % 7;

  target.setDate(now.getDate() + diff);
  target.setHours(hour, minute, 0, 0);

  // If the target time is today and already passed, schedule for next week
  if (diff === 0 && target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 7);
  }

  return target.getTime();
}

export function estimateDaysUntilEmpty(
  drug: Drug,
  adherenceLogs: AdherenceLog[],
): number | null {
  if (drug.currentStock === undefined || drug.currentStock <= 0) return null;

  const takenLogs = adherenceLogs.filter((l) => l.status === "taken");
  if (takenLogs.length < 3) return null;

  const dates = [...new Set(takenLogs.map((l) => l.date))].sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  const firstMs = new Date(firstDate).getTime();
  const lastMs = new Date(lastDate).getTime();
  const daySpan = (lastMs - firstMs) / (1000 * 60 * 60 * 24);
  if (daySpan < 3) return null;

  const dailyRate = takenLogs.length / (daySpan + 1);
  if (dailyRate <= 0) return null;

  return Math.floor(drug.currentStock / dailyRate);
}

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
  const n = getNotificationTexts();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("remindrugs-channel", {
      name: n.channelName,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "pill_bottle_shake.mp3",
    });
  }

  await Notifications.setNotificationCategoryAsync("reminder-actions", [
    { identifier: "mark-done", buttonTitle: n.done, options: {} as any },
    { identifier: "snooze", buttonTitle: n.snooze15m, options: {} as any },
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
      sound: "pill_bottle_shake.mp3",
      data: {
        reminderId: reminder.id,
        type: "alarm",
        reminderName: reminder.name,
      },
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

  // Also schedule native fullscreen alarms for each day
  for (const day of reminder.days) {
    const triggerMs = getNextTriggerMs(toExpoWeekday(day), reminder.hour, reminder.minute);
    await FullscreenAlarm.scheduleAlarm({
      id: `${reminder.id}_${day}`,
      title: reminder.name,
      body: buildNotificationBody(drugs),
      channelId: "remindrugs-channel",
      triggerAtMs: triggerMs,
    });
  }

  return ids;
}

export async function cancelReminder(notificationIds: string[], reminderId?: string): Promise<void> {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  if (reminderId) {
    // Cancel all native alarms for this reminder (one per weekday, 0-6)
    for (let day = 0; day <= 6; day++) {
      await FullscreenAlarm.cancelAlarm(`${reminderId}_${day}`);
    }
  }
}

export async function rescheduleReminder(reminder: Reminder, drugs: Drug[]): Promise<string[]> {
  await cancelReminder(reminder.notificationIds, reminder.id);
  return scheduleReminder(reminder, drugs);
}

export async function scheduleSnooze(reminder: Reminder, drugs: Drug[], durationMinutes: number = 15): Promise<string> {
  const n = getNotificationTexts();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: n.snoozed.replace("{name}", reminder.name),
      body: buildNotificationBody(drugs),
      sound: "pill_bottle_shake.mp3",
      data: { reminderId: reminder.id, type: "snooze" },
      categoryIdentifier: "reminder-actions",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      channelId: "remindrugs-channel",
      date: new Date(Date.now() + durationMinutes * 60 * 1000),
    } as any,
  });

  // Also schedule a native fullscreen alarm for the snooze
  await FullscreenAlarm.scheduleAlarm({
    id: `snooze_${reminder.id}`,
    title: n.snoozed.replace("{name}", reminder.name),
    body: buildNotificationBody(drugs),
    channelId: "remindrugs-channel",
    triggerAtMs: Date.now() + durationMinutes * 60 * 1000,
  });

  return id;
}

export async function scheduleRefillReminder(drug: Drug, reminderId: string): Promise<void> {
  if (drug.currentStock === undefined || drug.stockThreshold === undefined) return;
  if (drug.currentStock > drug.stockThreshold) return;

  const n = getNotificationTexts();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: n.refillNeeded.replace("{name}", drug.name),
      body: n.refillBody.replace("{count}", String(drug.currentStock)).replace("{form}", drug.form),
      data: { reminderId, drugId: drug.id, type: "refill" },
    },
    trigger: null,
  });
}

export async function checkAndScheduleRefillAlert(
  drug: Drug,
  reminderId: string,
  adherenceLogs?: AdherenceLog[],
): Promise<void> {
  if (drug.currentStock === undefined || drug.stockThreshold === undefined) return;

  const n = getNotificationTexts();
  let shouldAlert = drug.currentStock <= drug.stockThreshold;

  let body = n.refillBodyShort
    .replace("{count}", String(drug.currentStock))
    .replace("{form}", drug.form);

  if (adherenceLogs) {
    const daysLeft = estimateDaysUntilEmpty(drug, adherenceLogs);
    if (daysLeft !== null) {
      const emptyDate = new Date(
        Date.now() + daysLeft * 24 * 60 * 60 * 1000,
      );
      const dateStr = emptyDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      body = n.refillBodyShort
        .replace("{count}", String(drug.currentStock))
        .replace("{form}", drug.form) + ` (~${daysLeft}d, ${dateStr})`;
      if (daysLeft <= 7) shouldAlert = true;
    }
  }

  if (!shouldAlert) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: n.refillNeeded.replace("{name}", drug.name),
      body,
      sound: "pill_bottle_shake.mp3",
      data: { reminderId, drugId: drug.id, type: "refill" },
      categoryIdentifier: "reminder-actions",
    },
    trigger: null,
  });
}
