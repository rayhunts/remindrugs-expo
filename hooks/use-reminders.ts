import { useCallback, useEffect, useState } from "react";
import {
  deleteReminder as dbDeleteReminder,
  getAllReminders,
  getReminderById,
  insertReminder,
  toggleReminderActive as dbToggleActive,
  updateReminder as dbUpdateReminder,
  getDrugsForReminder,
  setReminderDrugs,
} from "@/services/database";
import { reminderEvents } from "@/services/event-bus";
import type { Drug, Reminder, Weekday } from "@/types/reminder";
import { toDateString, generateId } from "@/utils/date-helpers";

export interface ReminderWithDrugs extends Reminder {
  drugs: Drug[];
}

export function useReminders() {
  const [reminders, setReminders] = useState<ReminderWithDrugs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReminders = useCallback(() => {
    try {
      setError(null);
      const all = getAllReminders();
      const withDrugs: ReminderWithDrugs[] = all.map((r) => ({
        ...r,
        drugs: getDrugsForReminder(r.id),
      }));
      setReminders(withDrugs);
    } catch {
      setError("Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
    return reminderEvents.on(loadReminders);
  }, [loadReminders]);

  const todayReminders = reminders.filter((r) => {
    if (!r.isActive) return false;

    const today = new Date();
    const todayWeekday = today.getDay() as Weekday;
    if (!r.days.includes(todayWeekday)) return false;

    const todayStr = toDateString(today);
    if (r.startDate && todayStr < r.startDate) return false;
    if (r.endDate && todayStr > r.endDate) return false;

    return true;
  });

  const addReminder = useCallback(
    async (data: Omit<Reminder, "id" | "notificationIds" | "createdAt"> & { drugIds: string[] }) => {
      const reminder: Reminder = {
        id: generateId(),
        name: data.name,
        hour: data.hour,
        minute: data.minute,
        days: data.days,
        isActive: data.isActive,
        notificationIds: [],
        startDate: data.startDate,
        endDate: data.endDate,
        createdAt: Date.now(),
      };
      insertReminder(reminder);
      setReminderDrugs(reminder.id, data.drugIds);
      reminderEvents.emit();
      return reminder;
    },
    [],
  );

  const update = useCallback(
    async (reminder: Reminder, drugIds: string[]) => {
      dbUpdateReminder(reminder);
      setReminderDrugs(reminder.id, drugIds);
      reminderEvents.emit();
    },
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      dbDeleteReminder(id);
      reminderEvents.emit();
    },
    [],
  );

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      dbToggleActive(id, isActive);
      reminderEvents.emit();
    },
    [],
  );

  const getById = useCallback((id: string): ReminderWithDrugs | null => {
    const reminder = getReminderById(id);
    if (!reminder) return null;
    return { ...reminder, drugs: getDrugsForReminder(id) };
  }, []);

  return {
    reminders,
    todayReminders,
    loading,
    error,
    addReminder,
    updateReminder: update,
    deleteReminder: remove,
    toggleActive,
    getById,
    refreshReminders: loadReminders,
  };
}
