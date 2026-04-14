import { Colors } from "@/constants/colors";
import type { AdherenceLog } from "@/types/adherence";
import type { Weekday } from "@/types/reminder";
import * as Crypto from "expo-crypto";

export function generateId(): string {
  return Crypto.randomUUID();
}

export function getFrequencyLabel(days: Weekday[]): "daily" | "weekly" | "custom" {
  if (days.length === 7) return "daily";
  if (days.length === 1) return "weekly";
  return "custom";
}

export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${period}`;
}

export function getTodayWeekday(): Weekday {
  return new Date().getDay() as Weekday;
}

export function getDayAbbreviations(days: Weekday[], abbr: readonly string[]): string {
  return days.map((d) => abbr[d]).join(" ");
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getAdherenceColor(taken: number, total: number): string {
  if (total === 0) return Colors.border;
  if (taken === total) return Colors.success;
  if (taken === 0) return Colors.danger;
  return Colors.warning;
}

export function calculateStreak(logs: AdherenceLog[]): number {
  if (logs.length === 0) return 0;

  const dateMap = new Map<string, { total: number; taken: number }>();

  for (const log of logs) {
    const existing = dateMap.get(log.date) ?? { total: 0, taken: 0 };
    existing.total++;
    if (log.status === "taken") existing.taken++;
    dateMap.set(log.date, existing);
  }

  let streak = 0;
  const current = new Date();

  for (let i = 0; i < 365; i++) {
    const dateStr = toDateString(current);
    const dayData = dateMap.get(dateStr);

    if (dayData && dayData.total > 0) {
      if (dayData.taken < dayData.total) break;
      streak++;
    }
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

export function getMonthAdherencePercent(logs: AdherenceLog[]): number {
  if (logs.length === 0) return 0;
  const taken = logs.filter((l) => l.status === "taken").length;
  return Math.round((taken / logs.length) * 100);
}

export function formatDateLong(date: Date, locale: string = "en-US"): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function getMonthName(year: number, month: number, locale: string = "en-US"): string {
  return new Date(year, month).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

export function isToday(dateStr: string): boolean {
  return dateStr === toDateString(new Date());
}

export function isWithinLast7Days(dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getLocaleCode(locale: string): string {
  return locale === "id" ? "id-ID" : "en-US";
}
