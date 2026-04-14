import { create } from "zustand";
import type { AdherenceLog, DoseStatus } from "@/types/adherence";
import {
  logDose as dbLogDose,
  deleteLogByDrugAndDate,
  deleteLogByReminderDrugAndDate as dbDeleteLogByReminderDrugAndDate,
  deleteLogByReminderAndDate as dbDeleteLogsByReminderAndDate,
  getLogsForRange,
  updateLogStatus as dbUpdateLogStatus,
  deleteLog as dbDeleteLog,
} from "@/services/database";
import { toDateString, generateId } from "@/utils/date-helpers";

interface AdherenceState {
  logs: AdherenceLog[];
  loaded: boolean;

  loadFromDB: () => void;
  addLog: (reminderId: string, drugId: string, date: string, status: DoseStatus) => void;
  updateStatus: (id: string, status: DoseStatus) => void;
  removeLog: (id: string) => void;
  removeLogByDrugAndDate: (drugId: string, date: string) => void;
  removeLogByReminderDrugAndDate: (reminderId: string, drugId: string, date: string) => void;
  removeLogsByReminderAndDate: (reminderId: string, date: string) => void;
  getLogsForDate: (date: string) => AdherenceLog[];
}

export const useAdherenceStore = create<AdherenceState>((set, get) => ({
  logs: [],
  loaded: false,

  loadFromDB: () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const rangeLogs = getLogsForRange(
      toDateString(startDate),
      toDateString(endDate),
    );
    set({ logs: rangeLogs, loaded: true });
  },

  addLog: (reminderId, drugId, date, status) => {
    const log: AdherenceLog = {
      id: generateId(),
      reminderId,
      drugId,
      date,
      status,
      takenAt: status === "taken" ? Date.now() : undefined,
    };

    // Optimistic: update store first, then persist
    set((state) => ({ logs: [...state.logs, log] }));
    dbLogDose(log);
  },

  updateStatus: (id, status) => {
    set((state) => ({
      logs: state.logs.map((l) => (l.id === id ? { ...l, status } : l)),
    }));
    dbUpdateLogStatus(id, status);
  },

  removeLog: (id) => {
    set((state) => ({ logs: state.logs.filter((l) => l.id !== id) }));
    dbDeleteLog(id);
  },

  removeLogByDrugAndDate: (drugId, date) => {
    set((state) => ({
      logs: state.logs.filter((l) => !(l.drugId === drugId && l.date === date)),
    }));
    deleteLogByDrugAndDate(drugId, date);
  },

  removeLogByReminderDrugAndDate: (reminderId, drugId, date) => {
    set((state) => ({
      logs: state.logs.filter((l) => !(l.reminderId === reminderId && l.drugId === drugId && l.date === date)),
    }));
    dbDeleteLogByReminderDrugAndDate(reminderId, drugId, date);
  },

  removeLogsByReminderAndDate: (reminderId, date) => {
    set((state) => ({
      logs: state.logs.filter((l) => !(l.reminderId === reminderId && l.date === date)),
    }));
    dbDeleteLogsByReminderAndDate(reminderId, date);
  },

  getLogsForDate: (date) => {
    return get().logs.filter((l) => l.date === date);
  },
}));
