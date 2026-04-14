import type { DrugForm } from "@/types/reminder";

export const DRUG_FORMS: { label: string; icon: string; value: DrugForm }[] = [
  { label: "Tablet", icon: "pill", value: "tablet" },
  { label: "Capsule", icon: "medical-bag", value: "capsule" },
  { label: "Liquid", icon: "water", value: "liquid" },
  { label: "Injection", icon: "needle", value: "injection" },
  { label: "Patch", icon: "bandage", value: "patch" },
  { label: "Inhaler", icon: "lungs", value: "inhaler" },
  { label: "Drops", icon: "eye-outline", value: "drops" },
];

export const PILL_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
];
