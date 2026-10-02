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

// paleta inspirada no tema "GitHub Dark" (VS Code)
export const darkColors: ColorTheme = {
  bg: "#0d1117",
  card: "#161b22",
  cardHover: "#21262d",
  accent: "#58a6ff",
  text: "#c9d1d9",
  textDim: "#8b949e",
  today: "#1c3a5e",
  border: "#30363d",
  up: "#f85149",
  down: "#3fb950",
  gasto: "#58a6ff",
  previsto: "#d29922",
};

// paleta inspirada no tema "GitHub Light" (VS Code)
export const lightColors: ColorTheme = {
  bg: "#ffffff",
  card: "#f6f8fa",
  cardHover: "#eaeef2",
  accent: "#0969da",
  text: "#1f2328",
  textDim: "#656d76",
  today: "#ddf4ff",
  border: "#d0d7de",
  up: "#cf222e",
  down: "#1a7f37",
  gasto: "#0969da",
  previsto: "#9a6700",
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
