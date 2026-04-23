import {
  logDoseIgnoreDuplicate,
  deductDrugStock,
  getDrugById,
  getDrugsForReminder,
  getLogsForDrug,
  getLogForReminderDrugDate,
  updateLogStatusAndTakenAt,
} from "@/services/database";
import { adherenceEvents, drugEvents } from "@/services/event-bus";
import { checkAndScheduleRefillAlert } from "@/services/notification-service";
import { generateId, toDateString } from "@/utils/date-helpers";
import type { DoseStatus } from "@/types/adherence";

export function recordDose(params: {
  reminderId: string;
  drugId: string;
  date: string;
  status: DoseStatus;
  takenAt?: number;
}): boolean {
  const inserted = logDoseIgnoreDuplicate({
    id: generateId(),
    reminderId: params.reminderId,
    drugId: params.drugId,
    date: params.date,
    status: params.status,
    takenAt: params.takenAt ?? (params.status === "taken" ? Date.now() : undefined),
  });

  if (!inserted) return false;

  if (params.status === "taken") {
    const newStock = deductDrugStock(params.drugId);
    if (newStock !== null) {
      drugEvents.emit();
      const drug = getDrugById(params.drugId);
      if (drug) {
        checkAndScheduleRefillAlert(drug, params.reminderId, getLogsForDrug(params.drugId)).catch(() => {});
      }
    }
  }

  adherenceEvents.emit();
  return true;
}

export function recordDosesForReminder(params: {
  reminderId: string;
  date: string;
  status: DoseStatus;
  takenAt?: number;
}): void {
  const drugs = getDrugsForReminder(params.reminderId);
  for (const drug of drugs) {
    recordDose({
      reminderId: params.reminderId,
      drugId: drug.id,
      date: params.date,
      status: params.status,
      takenAt: params.takenAt,
    });
  }
}

export function recordLateDose(reminderId: string, drugId: string): boolean {
  const today = toDateString(new Date());
  const existing = getLogForReminderDrugDate(reminderId, drugId, today);
  if (existing) {
    if (existing.status === "taken") return false;
    updateLogStatusAndTakenAt(existing.id, "taken", Date.now());
    deductDrugStock(drugId);
    const drug = getDrugById(drugId);
    if (drug) {
      checkAndScheduleRefillAlert(drug, reminderId, getLogsForDrug(drugId)).catch(() => {});
    }
    adherenceEvents.emit();
    drugEvents.emit();
    return true;
  }
  return recordDose({
    reminderId,
    drugId,
    date: today,
    status: "taken",
    takenAt: Date.now(),
  });
}

export function recordLateDosesForReminder(reminderId: string): void {
  const drugs = getDrugsForReminder(reminderId);
  for (const drug of drugs) {
    recordLateDose(reminderId, drug.id);
  }
}
