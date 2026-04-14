export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type FrequencyType = "daily" | "weekly" | "custom";

export type DrugForm =
  | "tablet"
  | "capsule"
  | "liquid"
  | "injection"
  | "patch"
  | "inhaler"
  | "drops"
  | "other";

export interface Drug {
  id: string;
  name: string;
  dosage: string;
  form: DrugForm;
  quantity: number;
  notes?: string;
  color?: string;
  currentStock?: number;
  stockThreshold?: number;
}

export interface Reminder {
  id: string;
  name: string;
  hour: number;
  minute: number;
  days: Weekday[];
  isActive: boolean;
  notificationIds: string[];
  startDate?: string;
  endDate?: string;
  createdAt: number;
}

export interface ReminderDrug {
  reminderId: string;
  drugId: string;
}
