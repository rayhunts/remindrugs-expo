import { useCallback, useEffect, useState } from "react";
import {
  getAllDrugs,
  getDrugById,
  insertDrug,
  updateDrug as dbUpdateDrug,
  deleteDrug as dbDeleteDrug,
  getRemindersForDrug,
} from "@/services/database";
import { drugEvents } from "@/services/event-bus";
import type { Drug, Reminder } from "@/types/reminder";
import { generateId } from "@/utils/date-helpers";

export function useDrugs() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDrugs = useCallback(() => {
    try {
      const all = getAllDrugs();
      setDrugs(all);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrugs();
    return drugEvents.on(loadDrugs);
  }, [loadDrugs]);

  const addDrug = useCallback(
    (data: Omit<Drug, "id">): Drug => {
      const drug: Drug = { ...data, id: generateId() };
      insertDrug(drug);
      drugEvents.emit();
      return drug;
    },
    [],
  );

  const updateDrug = useCallback(
    (drug: Drug) => {
      dbUpdateDrug(drug);
      drugEvents.emit();
    },
    [],
  );

  const removeDrug = useCallback(
    (id: string) => {
      dbDeleteDrug(id);
      drugEvents.emit();
    },
    [],
  );

  const getById = useCallback((id: string) => {
    return getDrugById(id);
  }, []);

  const getRemindersFor = useCallback((drugId: string): Reminder[] => {
    return getRemindersForDrug(drugId);
  }, []);

  return {
    drugs,
    loading,
    addDrug,
    updateDrug,
    deleteDrug: removeDrug,
    getById,
    getRemindersFor: getRemindersFor,
    refreshDrugs: loadDrugs,
  };
}
