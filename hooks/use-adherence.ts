import { useCallback, useEffect, useState } from "react";
import type { AdherenceLog, DoseStatus } from "@/types/adherence";
import type { Reminder } from "@/types/reminder";
import {
  deleteLog as dbDeleteLog,
  deleteLogByReminderAndDate as dbDeleteLogByReminderAndDate,
  getLogsForDate,
  getLogsForRange,
  getLogsForReminder,
  logDose as dbLogDose,
  updateLogStatus as dbUpdateLogStatus,
} from "@/services/database";
import { adherenceEvents } from "@/services/event-bus";
import { getAdherenceColor, calculateStreak, getMonthAdherencePercent, generateId, toDateString } from "@/utils/date-helpers";

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
    async (reminderId: string, date: string, status: DoseStatus) => {
      const log: AdherenceLog = {
        id: generateId(),
        reminderId,
        date,
        status,
        takenAt: status === "taken" ? Date.now() : undefined,
      };
      dbLogDose(log);
      adherenceEvents.emit();
    },
    [loadLogs],
  );

  const markTaken = useCallback(
    async (reminderId: string, date?: string) => {
      const d = date ?? toDateString(new Date());
      await logDose(reminderId, d, "taken");
    },
    [logDose],
  );

  const markMissed = useCallback(
    async (reminderId: string, date: string) => {
      await logDose(reminderId, date, "missed");
    },
    [logDose],
  );

  const markSkipped = useCallback(
    async (reminderId: string, date: string) => {
      await logDose(reminderId, date, "skipped");
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

      const totalPerDay = reminders.length;
      const marked: Record<string, { dots: Array<{ color: string }> }> = {};

      for (const [date, counts] of dateMap) {
        const total = totalPerDay || 1;
        const color = getAdherenceColor(counts.taken, total);
        marked[date] = { dots: [{ color }] };
      }

      return marked;
    },
    [],
  );

  const getLogsForReminder = useCallback((reminderId: string) => {
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
    [loadLogs],
  );

  const deleteLog = useCallback(
    async (id: string) => {
      dbDeleteLog(id);
      adherenceEvents.emit();
    },
    [loadLogs],
  );

  const undoLog = useCallback(
    (reminderId: string, date: string) => {
      dbDeleteLogByReminderAndDate(reminderId, date);
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
    getLogsForReminder,
    getLogsForDate: getLogsForDateFn,
    updateLogStatus,
    deleteLog,
    undoLog,
    refreshLogs: loadLogs,
  };
}
