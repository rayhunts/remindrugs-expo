export type DoseStatus = "taken" | "missed" | "skipped";

export interface AdherenceLog {
  id: string;
  reminderId: string;
  date: string;
  status: DoseStatus;
  takenAt?: number;
  notes?: string;
}
