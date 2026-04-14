import en, { type TranslationKeys } from "./en";
import id from "./id";

export type Locale = "en" | "id";

export const translations: Record<Locale, TranslationKeys> = { en, id };

export type { TranslationKeys };
