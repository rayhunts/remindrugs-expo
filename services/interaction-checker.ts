import interactionData from "@/data/drug-interactions.json";

type Severity = "none" | "mild" | "moderate" | "severe";

interface InteractionResult {
  severity: Severity;
  description: string;
  drug1: string;
  drug2: string;
}

interface InteractionEntry {
  drug1: string;
  drug1Aliases: string[];
  drug2: string;
  drug2Aliases: string[];
  severity: Severity;
  description: string;
}

const interactions = interactionData.interactions as InteractionEntry[];

function normalize(name: string): string {
  return name.toLowerCase().trim();
}

function matches(query: string, canonical: string, aliases: string[]): boolean {
  const q = normalize(query);
  if (normalize(canonical) === q) return true;
  return aliases.some((a) => normalize(a) === q);
}

export function checkInteraction(
  drug1: string,
  drug2: string,
): InteractionResult | null {
  const n1 = normalize(drug1);
  const n2 = normalize(drug2);

  if (!n1 || !n2 || n1 === n2) return null;

  for (const entry of interactions) {
    const d1Match = matches(drug1, entry.drug1, entry.drug1Aliases);
    const d2Match = matches(drug2, entry.drug2, entry.drug2Aliases);
    if (d1Match && d2Match) {
      return {
        severity: entry.severity,
        description: entry.description,
        drug1: entry.drug1,
        drug2: entry.drug2,
      };
    }

    const d1Rev = matches(drug1, entry.drug2, entry.drug2Aliases);
    const d2Rev = matches(drug2, entry.drug1, entry.drug1Aliases);
    if (d1Rev && d2Rev) {
      return {
        severity: entry.severity,
        description: entry.description,
        drug1: entry.drug2,
        drug2: entry.drug1,
      };
    }
  }

  return null;
}

export function checkAllInteractions(
  drugNames: string[],
): InteractionResult[] {
  const results: InteractionResult[] = [];
  for (let i = 0; i < drugNames.length; i++) {
    for (let j = i + 1; j < drugNames.length; j++) {
      const result = checkInteraction(drugNames[i], drugNames[j]);
      if (result) {
        results.push(result);
      }
    }
  }
  return results;
}
