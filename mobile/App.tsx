import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { gerarLancamentosPendentes } from "./src/assinaturas";
import { hasAccount } from "./src/auth";
import { initDb } from "./src/db";
import { clearSession, getSessionActive } from "./src/session";
import { ThemeProvider, useTheme } from "./src/theme";
import type { ColorTheme } from "./src/theme";
import { ToastProvider, useToast } from "./src/toast";
import { foiAtualizadoAgora } from "./src/updateInfo";
import CriarScreen from "./src/screens/CriarScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import EuScreen from "./src/screens/EuScreen";
import HistoricoScreen from "./src/screens/HistoricoScreen";
import LoginScreen from "./src/screens/LoginScreen";
import MaisScreen from "./src/screens/MaisScreen";

type Tab = "home" | "historico" | "criar" | "mais" | "eu";
type AuthState = "loading" | "criar" | "entrar" | "autenticado";

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "home", label: "Home", icon: "home-outline" },
  { key: "historico", label: "Histórico", icon: "time-outline" },
  { key: "criar", label: "Criar", icon: "add" },
  { key: "mais", label: "Mais", icon: "grid-outline" },
  { key: "eu", label: "Eu", icon: "person-outline" },
];

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </ThemeProvider>
  );
}

function AppInner() {
  const { mode, colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [tab, setTab] = useState<Tab>("home");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        await gerarLancamentosPendentes();

        const atualizou = await foiAtualizadoAgora();
        if (atualizou) {
          showToast("✓ Atualização aplicada", 4000);
        }

        const existe = await hasAccount();
        if (!existe) {
          setAuthState("criar");
          return;
        }
        const sessao = await getSessionActive();
        setAuthState(sessao ? "autenticado" : "entrar");
      } catch (err) {
        console.error("Erro ao iniciar banco:", err);
      }
    })();
  }, []);

  const bump = () => setRefreshKey((k) => k + 1);

  const sair = async () => {
    await clearSession();
    setAuthState("entrar");
  };

  if (authState === "loading") {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  if (authState === "criar" || authState === "entrar") {
    return (
      <View style={{ flex: 1 }}>
        <LoginScreen modo={authState} onAuthenticated={() => setAuthState("autenticado")} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      <View style={styles.content}>
        {tab === "home" && <DashboardScreen refreshKey={refreshKey} />}
        {tab === "historico" && <HistoricoScreen onChanged={bump} />}
        {tab === "criar" && <CriarScreen onChanged={bump} />}
        {tab === "mais" && <MaisScreen />}
        {tab === "eu" && <EuScreen onSair={sair} />}
      </View>

      <View style={styles.bottomBar}>
        {TABS.map((t) => {
          const ativa = tab === t.key;
          if (t.key === "criar") {
            return (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.criarBtnWrap}>
                <View style={[styles.criarBtn, ativa && styles.criarBtnAtivo]}>
                  <Ionicons name="add" size={26} color="#fff" />
                </View>
                <Text style={[styles.bottomLabel, ativa && styles.bottomLabelAtiva]}>Criar</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.bottomItem}>
              <Ionicons name={t.icon} size={22} color={ativa ? colors.accent : colors.textDim} />
              <Text style={[styles.bottomLabel, ativa && styles.bottomLabelAtiva]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    content: {
      flex: 1,
      paddingTop: 16,
    },
    bottomBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      paddingBottom: 10,
      paddingHorizontal: 8,
    },
    bottomItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    bottomLabel: {
      fontSize: 11,
      color: colors.textDim,
    },
    bottomLabelAtiva: {
      color: colors.accent,
      fontWeight: "700",
    },
    criarBtnWrap: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    criarBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
      marginTop: -22,
      borderWidth: 4,
      borderColor: colors.card,
    },
    criarBtnAtivo: {
      backgroundColor: colors.down,
    },
  });
