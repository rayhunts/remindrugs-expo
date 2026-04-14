import { useCallback, useEffect } from "react";
import type { AdherenceLog, DoseStatus } from "@/types/adherence";
import type { Reminder } from "@/types/reminder";
import { getLogsForRange } from "@/services/database";
import { adherenceEvents } from "@/services/event-bus";
import { calculateStreak, toDateString } from "@/utils/date-helpers";
import { useAdherenceStore } from "@/stores/adherence-store";

export interface MonthlyStats {
  adherencePercent: number;
  streak: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
}

export function useAdherence() {
  const logs = useAdherenceStore((s) => s.logs);
  const loaded = useAdherenceStore((s) => s.loaded);
  const loadFromDB = useAdherenceStore((s) => s.loadFromDB);
  const addLog = useAdherenceStore((s) => s.addLog);
  const updateStatus = useAdherenceStore((s) => s.updateStatus);
  const removeLog = useAdherenceStore((s) => s.removeLog);
  const removeLogByDrugAndDate = useAdherenceStore((s) => s.removeLogByDrugAndDate);
  const removeLogByReminderDrugAndDate = useAdherenceStore((s) => s.removeLogByReminderDrugAndDate);
  const removeLogsByReminderAndDate = useAdherenceStore((s) => s.removeLogsByReminderAndDate);
  const getLogsForDate = useAdherenceStore((s) => s.getLogsForDate);

  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  // Listen for external events (e.g. from notification handler)
  useEffect(() => {
    return adherenceEvents.on(loadFromDB);
  }, [loadFromDB]);

  const markTaken = useCallback(
    (reminderId: string, drugId: string, date?: string) => {
      const d = date ?? toDateString(new Date());
      addLog(reminderId, drugId, d, "taken");
    },
    [addLog],
  );

  const markMissed = useCallback(
    (reminderId: string, drugId: string, date: string) => {
      addLog(reminderId, drugId, date, "missed");
    },
    [addLog],
  );

  const markSkipped = useCallback(
    (reminderId: string, drugId: string, date: string) => {
      addLog(reminderId, drugId, date, "skipped");
    },
    [addLog],
  );

  const getMonthlyStats = useCallback(
    (year: number, month: number): MonthlyStats => {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
      // Use store logs filtered to range
      const monthLogs = logs.filter((l) => l.date >= startDate && l.date <= endDate);

      const total = monthLogs.length;
      const taken = monthLogs.filter((l) => l.status === "taken").length;
      const missed = monthLogs.filter((l) => l.status === "missed").length;

      return {
        adherencePercent: total === 0 ? 0 : Math.round((taken / total) * 100),
        streak: calculateStreak(monthLogs),
        totalDoses: total,
        takenDoses: taken,
        missedDoses: missed,
      };
    },
    [logs],
  );

  const getMarkedDates = useCallback(
    (
      year: number,
      month: number,
      reminders: Reminder[],
    ): Record<string, { dots: Array<{ color: string }> }> => {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
      const monthLogs = logs.filter((l) => l.date >= startDate && l.date <= endDate);

      const dateMap = new Map<string, { taken: number; missed: number }>();

      for (const log of monthLogs) {
        const existing = dateMap.get(log.date) ?? { taken: 0, missed: 0 };
        if (log.status === "taken") existing.taken++;
        if (log.status === "missed") existing.missed++;
        dateMap.set(log.date, existing);
      }

      const totalDrugsPerDay = reminders.reduce(
        (sum, r) => sum + ('drugs' in r ? (r as any).drugs.length : 1),
        0,
      );
      const total = totalDrugsPerDay || 1;

      const marked: Record<string, { dots: Array<{ color: string }> }> = {};

      for (const [date, counts] of dateMap) {
        const color = counts.taken === 0
          ? "#EF4444"
          : counts.taken >= total
            ? "#22C55E"
            : "#F59E0B";
        marked[date] = { dots: [{ color }] };
      }

      return marked;
    },
    [logs],
  );

  const getLogsForReminder = useCallback((reminderId: string) => {
    return logs.filter((l) => l.reminderId === reminderId);
  }, [logs]);

  const undoLog = useCallback(
    (drugIdOrKey: string, date: string) => {
      if (drugIdOrKey.startsWith("__all__:")) {
        const reminderId = drugIdOrKey.replace("__all__:", "");
        removeLogsByReminderAndDate(reminderId, date);
      } else if (drugIdOrKey.includes(":")) {
        const [reminderId, drugId] = drugIdOrKey.split(":");
        removeLogByReminderDrugAndDate(reminderId, drugId, date);
      } else {
        removeLogByDrugAndDate(drugIdOrKey, date);
      }
    },
    [removeLogByDrugAndDate, removeLogByReminderDrugAndDate, removeLogsByReminderAndDate],
  );

  return {
    logs,
    loading: !loaded,
    markTaken,
    markMissed,
    markSkipped,
    getMonthlyStats,
    getMarkedDates,
    getLogsForDate,
    getLogsForReminder,
    updateLogStatus: updateStatus,
    deleteLog: removeLog,
    undoLog,
    refreshLogs: loadFromDB,
  };
}
