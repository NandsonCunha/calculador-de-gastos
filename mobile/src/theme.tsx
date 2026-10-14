import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ColorTheme = {
  bg: string;
  card: string;
  cardHover: string;
  accent: string;
  text: string;
  textDim: string;
  today: string;
  border: string;
  up: string;
  down: string;
  gasto: string;
  previsto: string;
};

// paleta vibrante estilo apps de finanças (fintech)
export const darkColors: ColorTheme = {
  bg: "#0a0a0f",
  card: "#15151c",
  cardHover: "#1e1e27",
  accent: "#3b82f6",
  text: "#f1f1f4",
  textDim: "#8b8b96",
  today: "#1c2a4a",
  border: "#24242e",
  up: "#ef4444",
  down: "#22c55e",
  gasto: "#3b82f6",
  previsto: "#f59e0b",
};

export const lightColors: ColorTheme = {
  bg: "#f5f6f8",
  card: "#ffffff",
  cardHover: "#eef0f3",
  accent: "#3b82f6",
  text: "#14141a",
  textDim: "#6b7280",
  today: "#e8f0fe",
  border: "#e5e7eb",
  up: "#ef4444",
  down: "#16a34a",
  gasto: "#3b82f6",
  previsto: "#f59e0b",
};

// mantido por compatibilidade com imports antigos — sempre reflete o tema escuro
export const colors = darkColors;

type ThemeMode = "dark" | "light";
const KEY = "tema_preferido";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ColorTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  colors: darkColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === "light" || v === "dark") setMode(v);
    });
  }, []);

  const toggleTheme = () => {
    setMode((m) => {
      const novo = m === "dark" ? "light" : "dark";
      AsyncStorage.setItem(KEY, novo);
      return novo;
    });
  };

  const value = useMemo(
    () => ({ mode, colors: mode === "dark" ? darkColors : lightColors, toggleTheme }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
