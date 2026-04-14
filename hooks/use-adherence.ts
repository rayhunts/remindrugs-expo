import { useCallback, useEffect, useState } from "react";
import type { AdherenceLog, DoseStatus } from "@/types/adherence";
import type { Reminder } from "@/types/reminder";
import {
  deleteLog as dbDeleteLog,
  deleteLogByDrugAndDate as dbDeleteLogByDrugAndDate,
  getLogsForDate,
  getLogsForRange,
  getLogsForReminder,
  logDose as dbLogDose,
  updateLogStatus as dbUpdateLogStatus,
} from "@/services/database";
import { adherenceEvents } from "@/services/event-bus";
import { calculateStreak, generateId, toDateString } from "@/utils/date-helpers";

export interface MonthlyStats {
  adherencePercent: number;
  streak: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
}

export function useAdherence() {
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(() => {
    try {
      setError(null);
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const rangeLogs = getLogsForRange(
        toDateString(startDate),
        toDateString(endDate),
      );
      setLogs(rangeLogs);
    } catch {
      setError("Failed to load adherence data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    return adherenceEvents.on(loadLogs);
  }, [loadLogs]);

  const logDose = useCallback(
    async (reminderId: string, drugId: string, date: string, status: DoseStatus) => {
      const log: AdherenceLog = {
        id: generateId(),
        reminderId,
        drugId,
        date,
        status,
        takenAt: status === "taken" ? Date.now() : undefined,
      };
      dbLogDose(log);
      adherenceEvents.emit();
    },
    [],
  );

  const markTaken = useCallback(
    async (reminderId: string, drugId: string, date?: string) => {
      const d = date ?? toDateString(new Date());
      await logDose(reminderId, drugId, d, "taken");
    },
    [logDose],
  );

  const markMissed = useCallback(
    async (reminderId: string, drugId: string, date: string) => {
      await logDose(reminderId, drugId, date, "missed");
    },
    [logDose],
  );

  const markSkipped = useCallback(
    async (reminderId: string, drugId: string, date: string) => {
      await logDose(reminderId, drugId, date, "skipped");
    },
    [logDose],
  );

  const getMonthlyStats = useCallback(
    (year: number, month: number): MonthlyStats => {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
      const monthLogs = getLogsForRange(startDate, endDate);

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
    [],
  );

  const getMarkedDates = useCallback(
    (
      year: number,
      month: number,
      reminders: Reminder[],
    ): Record<string, { dots: Array<{ color: string }> }> => {
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
      const monthLogs = getLogsForRange(startDate, endDate);

      const dateMap = new Map<string, { taken: number; missed: number }>();

      for (const log of monthLogs) {
        const existing = dateMap.get(log.date) ?? { taken: 0, missed: 0 };
        if (log.status === "taken") existing.taken++;
        if (log.status === "missed") existing.missed++;
        dateMap.set(log.date, existing);
      }

      // Note: reminders here have drugs loaded (ReminderWithDrugs from useReminders)
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
    [],
  );

  const getLogsForReminderFn = useCallback((reminderId: string) => {
    return getLogsForReminder(reminderId);
  }, []);

  const getLogsForDateFn = useCallback((date: string) => {
    return getLogsForDate(date);
  }, []);

  const updateLogStatus = useCallback(
    async (id: string, status: DoseStatus) => {
      dbUpdateLogStatus(id, status);
      adherenceEvents.emit();
    },
    [],
  );

  const deleteLog = useCallback(
    async (id: string) => {
      dbDeleteLog(id);
      adherenceEvents.emit();
    },
    [],
  );

  const undoLog = useCallback(
    (drugId: string, date: string) => {
      dbDeleteLogByDrugAndDate(drugId, date);
      adherenceEvents.emit();
    },
    [],
  );

  return {
    logs,
    loading,
    error,
    logDose,
    markTaken,
    markMissed,
    markSkipped,
    getMonthlyStats,
    getMarkedDates,
    getLogsForReminder: getLogsForReminderFn,
    getLogsForDate: getLogsForDateFn,
    updateLogStatus,
    deleteLog,
    undoLog,
    refreshLogs: loadLogs,
  };
}
