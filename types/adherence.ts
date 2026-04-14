export type DoseStatus = "taken" | "missed" | "skipped";

export interface AdherenceLog {
  id: string;
  reminderId: string;
  drugId: string;
  date: string;
  status: DoseStatus;
  takenAt?: number;
  notes?: string;
}
