import { useCallback, useEffect, useState } from "react";
import {
  deleteReminder as dbDeleteReminder,
  getAllReminders,
  getReminderById,
  insertReminder,
  toggleReminderActive as dbToggleActive,
  updateReminder as dbUpdateReminder,
} from "@/services/database";
import type { Reminder, Weekday } from "@/types/reminder";
import { isToday, toDateString, generateId } from "@/utils/date-helpers";

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReminders = useCallback(() => {
    try {
      const all = getAllReminders();
      setReminders(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
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
    async (data: Omit<Reminder, "id" | "notificationIds" | "createdAt">) => {
      const reminder: Reminder = {
        ...data,
        id: generateId(),
        notificationIds: [],
        createdAt: Date.now(),
      };
      insertReminder(reminder);
      loadReminders();
      return reminder;
    },
    [loadReminders],
  );

  const update = useCallback(
    async (reminder: Reminder) => {
      dbUpdateReminder(reminder);
      loadReminders();
    },
    [loadReminders],
  );

  const remove = useCallback(
    async (id: string) => {
      dbDeleteReminder(id);
      loadReminders();
    },
    [loadReminders],
  );

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      dbToggleActive(id, isActive);
      loadReminders();
    },
    [loadReminders],
  );

  const getById = useCallback((id: string) => {
    return getReminderById(id);
  }, []);

  return {
    reminders,
    todayReminders,
    loading,
    addReminder,
    updateReminder: update,
    deleteReminder: remove,
    toggleActive,
    getById,
    refreshReminders: loadReminders,
  };
}
