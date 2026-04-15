import type { Drug } from "@/types/reminder";
import { translations } from "@/locales";
import { getSetting } from "@/services/settings-service";
import type { Locale } from "@/locales";

function getTranslationStrings() {
  const saved = getSetting("language");
  const locale: Locale = saved === "id" ? "id" : "en";
  return translations[locale];
}

export function toExpoWeekday(day: number): number {
  return day + 1;
}

export function buildNotificationBody(drugs: Drug[]): string {
  const t = getTranslationStrings();
  const drugList = drugs.map((d) => `${d.name} ${d.dosage}`).join(", ");
  return t.notifications.timeToTake.replace("{drugs}", drugList);
}

export function getNotificationTexts() {
  return getTranslationStrings().notifications;
}
