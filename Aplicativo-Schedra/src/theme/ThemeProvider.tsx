import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Appearance } from "react-native";

import { darkColors, lightColors, type AppColors } from "./tokens";
import { loadTheme, saveTheme } from "../shared/database/preferences";

type ThemeMode = "dark" | "light";

type ThemeContextValue = {
  colors: AppColors;
  mode: ThemeMode;
  navigationTheme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>(Appearance.getColorScheme() === "light" ? "light" : "dark");
  const changedByUser = useRef(false);

  useEffect(() => {
    let active = true;
    loadTheme().then((storedMode) => {
      if (!active || changedByUser.current) return;
      if (storedMode === "dark" || storedMode === "light") {
        setMode(storedMode);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = mode === "dark" ? darkColors : lightColors;
    const baseTheme = mode === "dark" ? DarkTheme : DefaultTheme;

    return {
      colors,
      mode,
      navigationTheme: {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          primary: colors.accent,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
      },
      toggleTheme: () => {
        changedByUser.current = true;
        const nextMode = mode === "dark" ? "light" : "dark";
        setMode(nextMode);
        void saveTheme(nextMode).catch(() => console.warn("Nao foi possivel salvar o tema localmente."));
      },
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return context;
}
