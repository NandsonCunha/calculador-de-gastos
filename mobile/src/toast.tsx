import { createContext, useCallback, useContext, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "./theme";
import type { ColorTheme } from "./theme";

type ToastContextValue = {
  showToast: (mensagem: string, duracaoMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [mensagem, setMensagem] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, duracaoMs = 3000) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMensagem(msg);
    timeoutRef.current = setTimeout(() => setMensagem(null), duracaoMs);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mensagem && (
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerText}>{mensagem}</Text>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
    banner: {
      position: "absolute",
      top: 12,
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 20,
      paddingHorizontal: 20,
    },
    bannerText: {
      backgroundColor: colors.down,
      color: "#0a0a0d",
      fontWeight: "700",
      fontSize: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      overflow: "hidden",
      textAlign: "center",
    },
  });
