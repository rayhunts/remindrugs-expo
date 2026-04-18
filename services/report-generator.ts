import { getAllDrugs, getAllReminders, getLogsForRange, getDrugsForReminder } from "@/services/database";
import { toDateString, calculateStreak } from "@/utils/date-helpers";
import type { Drug } from "@/types/reminder";
import type { AdherenceLog } from "@/types/adherence";

export interface DrugReport {
  id: string;
  name: string;
  dosage: string;
  form: string;
  adherencePercent: number;
  taken: number;
  missed: number;
  skipped: number;
  total: number;
}

export interface DailyEntry {
  date: string;
  taken: number;
  missed: number;
  skipped: number;
  total: number;
}

export interface StreakInfo {
  current: number;
  best: number;
}

export interface Report {
  period: { start: string; end: string; days: number };
  generatedAt: number;
  medications: DrugReport[];
  adherenceSummary: {
    rate: number;
    taken: number;
    missed: number;
    skipped: number;
    total: number;
  };
  streakInfo: StreakInfo;
  dailyBreakdown: DailyEntry[];
}

function computeBestStreak(logs: AdherenceLog[]): number {
  if (logs.length === 0) return 0;

  const dateMap = new Map<string, { total: number; taken: number }>();
  for (const log of logs) {
    const existing = dateMap.get(log.date) ?? { total: 0, taken: 0 };
    existing.total++;
    if (log.status === "taken") existing.taken++;
    dateMap.set(log.date, existing);
  }

  const sortedDates = [...dateMap.keys()].sort();
  if (sortedDates.length === 0) return 0;

  let best = 0;
  let current = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const dayData = dateMap.get(dateStr)!;
    const d = new Date(dateStr + "T00:00:00");

    if (dayData.taken >= dayData.total) {
      if (prevDate) {
        const diff = (d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        current = diff === 1 ? current + 1 : 1;
      } else {
        current = 1;
      }
      best = Math.max(best, current);
    } else {
      current = 0;
    }
    prevDate = d;
  }

  return best;
}

export function generateReport(days: number = 30): Report {
  const today = new Date();
  const endDate = toDateString(today);
  const startDateObj = new Date(today);
  startDateObj.setDate(startDateObj.getDate() - days + 1);
  const startDate = toDateString(startDateObj);

  const allLogs = getLogsForRange(startDate, endDate);
  const allDrugs = getAllDrugs();
  const allReminders = getAllReminders();

  // Per-drug stats
  const drugMap = new Map<string, Drug>();
  for (const drug of allDrugs) {
    drugMap.set(drug.id, drug);
  }

  const drugLogsMap = new Map<string, AdherenceLog[]>();
  for (const log of allLogs) {
    const existing = drugLogsMap.get(log.drugId) ?? [];
    existing.push(log);
    drugLogsMap.set(log.drugId, existing);
  }

  // Collect all drug IDs that appear in logs or in active reminders
  const activeDrugIds = new Set<string>();
  for (const reminder of allReminders) {
    if (!reminder.isActive) continue;
    const drugs = getDrugsForReminder(reminder.id);
    for (const d of drugs) {
      activeDrugIds.add(d.id);
    }
  }
  for (const log of allLogs) {
    activeDrugIds.add(log.drugId);
  }

  const medications: DrugReport[] = [];
  for (const drugId of activeDrugIds) {
    const drug = drugMap.get(drugId);
    if (!drug) continue;
    const logs = drugLogsMap.get(drugId) ?? [];
    const taken = logs.filter((l) => l.status === "taken").length;
    const missed = logs.filter((l) => l.status === "missed").length;
    const skipped = logs.filter((l) => l.status === "skipped").length;
    const total = logs.length;
    medications.push({
      id: drug.id,
      name: drug.name,
      dosage: drug.dosage,
      form: drug.form,
      adherencePercent: total === 0 ? 0 : Math.round((taken / total) * 100),
      taken,
      missed,
      skipped,
      total,
    });
  }

  medications.sort((a, b) => b.adherencePercent - a.adherencePercent);

  // Overall adherence summary
  const totalTaken = allLogs.filter((l) => l.status === "taken").length;
  const totalMissed = allLogs.filter((l) => l.status === "missed").length;
  const totalSkipped = allLogs.filter((l) => l.status === "skipped").length;
  const totalAll = allLogs.length;
  const overallRate = totalAll === 0 ? 0 : Math.round((totalTaken / totalAll) * 100);

  // Streak info
  const currentStreak = calculateStreak(allLogs);
  const bestStreak = computeBestStreak(allLogs);

  // Daily breakdown
  const dailyMap = new Map<string, { taken: number; missed: number; skipped: number; total: number }>();
  for (const log of allLogs) {
    const existing = dailyMap.get(log.date) ?? { taken: 0, missed: 0, skipped: 0, total: 0 };
    existing.total++;
    if (log.status === "taken") existing.taken++;
    else if (log.status === "missed") existing.missed++;
    else existing.skipped++;
    dailyMap.set(log.date, existing);
  }

  const dailyBreakdown: DailyEntry[] = [];
  const iter = new Date(startDateObj);
  while (iter <= today) {
    const dateStr = toDateString(iter);
    const entry = dailyMap.get(dateStr);
    dailyBreakdown.push({
      date: dateStr,
      taken: entry?.taken ?? 0,
      missed: entry?.missed ?? 0,
      skipped: entry?.skipped ?? 0,
      total: entry?.total ?? 0,
    });
    iter.setDate(iter.getDate() + 1);
  }

  return {
    period: { start: startDate, end: endDate, days },
    generatedAt: Date.now(),
    medications,
    adherenceSummary: {
      rate: overallRate,
      taken: totalTaken,
      missed: totalMissed,
      skipped: totalSkipped,
      total: totalAll,
    },
    streakInfo: { current: currentStreak, best: bestStreak },
    dailyBreakdown,
  };
}
