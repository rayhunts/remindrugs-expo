import type { DrugForm } from "@/types/reminder";

export interface DrugFormOption {
  label: string;
  labelKey: string;
  icon: string;
  value: DrugForm;
}

export const DRUG_FORMS: DrugFormOption[] = [
  { label: "Tablet", labelKey: "tablet", icon: "pill", value: "tablet" },
  { label: "Capsule", labelKey: "capsule", icon: "medical-bag", value: "capsule" },
  { label: "Liquid", labelKey: "liquid", icon: "water", value: "liquid" },
  { label: "Injection", labelKey: "injection", icon: "needle", value: "injection" },
  { label: "Patch", labelKey: "patch", icon: "bandage", value: "patch" },
  { label: "Inhaler", labelKey: "inhaler", icon: "lungs", value: "inhaler" },
  { label: "Drops", labelKey: "drops", icon: "eye-outline", value: "drops" },
];

export const PILL_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
];
