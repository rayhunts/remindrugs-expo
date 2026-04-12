import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { Appearance } from "react-native";
import type { ColorScheme } from "@/constants/colors";
import { getSetting, setSetting } from "@/services/settings-service";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  themePreference: ThemePreference;
  effectiveScheme: ColorScheme;
  setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themePreference: "system",
  effectiveScheme: "light",
  setThemePreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(
    (Appearance.getColorScheme() ?? "light") as ColorScheme,
  );

  // Load saved preference on mount
  useEffect(() => {
    const saved = getSetting("theme");
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemePreferenceState(saved);
    }
  }, []);

  // Listen for system scheme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme((colorScheme ?? "light") as ColorScheme);
    });
    return () => sub.remove();
  }, []);

  const effectiveScheme: ColorScheme =
    themePreference === "system" ? systemScheme : themePreference;

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    setSetting("theme", preference);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ themePreference, effectiveScheme, setThemePreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
