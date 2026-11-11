import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";

export type PrismThemePreference = "system" | "light" | "dark";
export type PrismResolvedScheme = "light" | "dark";

export type PrismPalette = {
  background: string;
  surface: string;
  elevated: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentContrast: string;
  success: string;
  warning: string;
  danger: string;
  navBackground: string;
  navIndicator: string;
};

export const PRISM_PALETTES: Record<PrismResolvedScheme, PrismPalette> = {
  dark: {
    background: "#0B0C18",
    surface: "#171629",
    elevated: "#211A39",
    border: "#403456",
    text: "#FAF7FF",
    muted: "#9D9DB4",
    accent: "#DFBDFF",
    accentSoft: "#2D2245",
    accentContrast: "#22132E",
    success: "#6DE2A8",
    warning: "#E7BC79",
    danger: "#FF8F9C",
    navBackground: "#0B0C18",
    navIndicator: "#211A39",
  },
  light: {
    background: "#F7F6FC",
    surface: "#FFFFFF",
    elevated: "#F0EBFA",
    border: "#DCD5E9",
    text: "#20182D",
    muted: "#64657B",
    accent: "#6542B4",
    accentSoft: "#E9E0FA",
    accentContrast: "#FFFFFF",
    success: "#177B59",
    warning: "#905F12",
    danger: "#B3344D",
    navBackground: "#FFFFFF",
    navIndicator: "#EEE5FA",
  },
};

const STORAGE_KEY = "prism-mobile:v070:appearance";

export type PrismAppearanceContextValue = {
  preference: PrismThemePreference;
  scheme: PrismResolvedScheme;
  isDark: boolean;
  colors: PrismPalette;
  setPreference: (preference: PrismThemePreference) => void;
};

const AppearanceContext = createContext<PrismAppearanceContextValue | null>(null);

function isPreference(value: string | null): value is PrismThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function PrismAppearanceProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<PrismThemePreference>("system");

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (mounted && isPreference(saved)) setPreferenceState(saved);
      })
      .catch((error) => {
        console.warn("[Prism Appearance] Unable to read preference", error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback((next: PrismThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch((error) => {
      console.warn("[Prism Appearance] Unable to save preference", error);
    });
  }, []);

  const scheme: PrismResolvedScheme =
    preference === "system"
      ? systemScheme === "light" ? "light" : "dark"
      : preference;

  const value = useMemo<PrismAppearanceContextValue>(
    () => ({
      preference,
      scheme,
      isDark: scheme === "dark",
      colors: PRISM_PALETTES[scheme],
      setPreference,
    }),
    [preference, scheme, setPreference],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function usePrismAppearance(): PrismAppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("usePrismAppearance must be used inside PrismAppearanceProvider");
  }
  return context;
}
