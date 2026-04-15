import type { Locale, TranslationKeys } from "@/locales";
import { translations } from "@/locales";
import { getSetting, setSetting } from "@/services/settings-service";
import { getLocales } from "expo-localization";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
export type { Locale } from "@/locales";

interface LanguageContextValue {
  locale: Locale;
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  t: translations.en,
  setLocale: () => { },
});

const VALID_LOCALES = new Set<string>(["en", "id"]);

function detectDeviceLocale(): Locale {
  const locales = getLocales();
  const langCode = locales[0]?.languageCode;
  if (langCode === "id") return "id";
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = getSetting("language");
    if (saved && VALID_LOCALES.has(saved)) {
      setLocaleState(saved as Locale);
    } else {
      const detected = detectDeviceLocale();
      setLocaleState(detected);
      setSetting("language", detected);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setSetting("language", newLocale);
  }, []);

  const t = translations[locale];

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
