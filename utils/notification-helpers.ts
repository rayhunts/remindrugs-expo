import type { Reminder } from "@/types/reminder";

/**
 * expo-notifications weekday: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
 * App internal Weekday:       0 = Sunday, 1 = Monday, ..., 6 = Saturday
 * Conversion: expoWeekday = appDay + 1
 */
export function toExpoWeekday(day: number): number {
  return day + 1;
}

export function buildNotificationBody(reminder: Reminder): string {
  const drugList = reminder.drugs
    .map((d) => `${d.name} ${d.dosage}`)
    .join(", ");
  return `Time to take: ${drugList}`;
}
