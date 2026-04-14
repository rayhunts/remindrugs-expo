import type { Drug } from "@/types/reminder";

export function toExpoWeekday(day: number): number {
  return day + 1;
}

export function buildNotificationBody(drugs: Drug[]): string {
  const drugList = drugs.map((d) => `${d.name} ${d.dosage}`).join(", ");
  return `Time to take: ${drugList}`;
}
