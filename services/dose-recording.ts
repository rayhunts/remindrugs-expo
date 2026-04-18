import {
  logDoseIgnoreDuplicate,
  deductDrugStock,
  getDrugById,
  getDrugsForReminder,
  getLogsForDrug,
} from "@/services/database";
import { adherenceEvents, drugEvents } from "@/services/event-bus";
import { checkAndScheduleRefillAlert } from "@/services/notification-service";
import { generateId } from "@/utils/date-helpers";
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
