import type { DrugForm } from "@/types/reminder";

export interface ParsedMedication {
  name: string;
  dosage: string;
  form?: DrugForm;
  quantity?: number;
  frequency?: string;
  notes?: string;
}

/**
 * Extracts structured medication data from raw OCR text.
 * Handles common prescription and pharmacy label formats.
 */
export function parsePrescriptionText(ocrText: string): ParsedMedication[] {
  const lines = ocrText
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const medications: ParsedMedication[] = [];

  for (const line of lines) {
    const med = parseLine(line);
    if (med) {
      // Avoid duplicates by name+dosage
      const isDup = medications.some(
        (m) =>
          m.name.toLowerCase() === med.name.toLowerCase() &&
          m.dosage.toLowerCase() === med.dosage.toLowerCase(),
      );
      if (!isDup) medications.push(med);
    }
  }

  return medications;
}

function parseLine(line: string): ParsedMedication | null {
  // Pattern: "DrugName Strength" where strength includes mg/mcg/mL/g etc.
  // Examples: "Metformin 500mg", "Amoxicillin 250mg/5mL", "Lisinopril 10 mg"
  const drugMatch = line.match(
    /^(?<name>[A-Z][a-zA-Z]+(?:\s+[a-z]+)?)\s+(?<dosage>[\d.]+(?:\s*[/]\s*[\d.]+)?\s*(?:mg|mcg|µg|mL|ml|g|%|IU|units?)\b)/i,
  );

  if (!drugMatch?.groups) return null;

  const name = drugMatch.groups.name.trim();
  const dosage = drugMatch.groups.dosage.replace(/\s+/g, "").trim();

  // Try to extract quantity and form from the rest of the line
  const rest = line.slice(drugMatch[0].length);
  const quantity = extractQuantity(rest);
  const form = extractForm(rest);

  // Check for frequency info (SIG codes)
  const frequency = extractFrequency(line);

  return {
    name,
    dosage,
    form: form ?? guessFormFromDosage(dosage),
    quantity: quantity ?? 1,
    frequency: frequency || undefined,
    notes: frequency ? `${frequency}` : undefined,
  };
}

function extractQuantity(text: string): number | null {
  // Patterns: "Take 1 tablet", "take 0.5 tab", "1-2 tablets", "half tablet"
  const halfMatch = text.match(/half\s+(?:a\s+)?(?:tablet|tab|capsule|cap|pill)/i);
  if (halfMatch) return 0.5;

  const qtyMatch = text.match(
    /(?:take|take\s+)?(\d+(?:\.\d+)?)\s*(?:tablet|tab|capsule|cap|pill|s|drop|puff|patch|inhalation)/i,
  );
  if (qtyMatch) return parseFloat(qtyMatch[1]);

  return null;
}

function extractForm(text: string): DrugForm | null {
  const lower = text.toLowerCase();
  const formMap: Record<string, DrugForm> = {
    tablet: "tablet",
    tab: "tablet",
    capsule: "capsule",
    cap: "capsule",
    liquid: "liquid",
    syrup: "liquid",
    solution: "liquid",
    suspension: "liquid",
    injection: "injection",
    inj: "injection",
    shot: "injection",
    patch: "patch",
    inhaler: "inhaler",
    drop: "drops",
    drops: "drops",
    eye: "drops",
    ear: "drops",
  };

  for (const [keyword, form] of Object.entries(formMap)) {
    if (lower.includes(keyword)) return form;
  }

  return null;
}

function guessFormFromDosage(dosage: string): DrugForm {
  const lower = dosage.toLowerCase();
  if (lower.includes("ml")) return "liquid";
  if (lower.includes("drop") || lower.includes("drops")) return "drops";
  return "tablet";
}

function extractFrequency(text: string): string | null {
  const sigCodes: Record<string, string> = {
    "1x1": "once daily",
    "1x1 ": "once daily",
    "2x1": "twice daily",
    "3x1": "3 times daily",
    "1-0-1": "twice daily",
    "1-0-0": "once daily",
    "1-1-1": "3 times daily",
    "0-1-0": "once daily (noon)",
    "0-0-1": "once daily (evening)",
    BID: "twice daily",
    TID: "3 times daily",
    QID: "4 times daily",
    QD: "once daily",
    OD: "once daily",
    PRN: "as needed",
    HS: "at bedtime",
    AC: "before meals",
    PC: "after meals",
    PO: "by mouth",
  };

  const upper = text.toUpperCase();
  for (const [code, meaning] of Object.entries(sigCodes)) {
    if (upper.includes(code.toUpperCase())) return meaning;
  }

  return null;
}
