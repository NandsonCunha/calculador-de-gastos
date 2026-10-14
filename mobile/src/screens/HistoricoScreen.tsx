import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { listarCategorias } from "../db";
import { exportarCsv } from "../exportCsv";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";
import type { FiltroBusca } from "../db";
import SemanaScreen from "./SemanaScreen";
import MesScreen from "./MesScreen";

type Modo = "semana" | "mes";
const TODAS = "__todas__";

export default function HistoricoScreen({ onChanged }: { onChanged: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [modo, setModo] = useState<Modo>("semana");
  const [categorias, setCategorias] = useState<{ nome: string; cor: string }[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState(TODAS);
  const [texto, setTexto] = useState("");
  const [exportando, setExportando] = useState(false);
  const [erroExport, setErroExport] = useState<string | null>(null);

  useEffect(() => {
    listarCategorias().then(setCategorias);
  }, []);

  const filtro: FiltroBusca = {
    categoria: categoriaFiltro === TODAS ? undefined : categoriaFiltro,
    texto: texto.trim() || undefined,
  };

  const exportar = async () => {
    setErroExport(null);
    setExportando(true);
    try {
      await exportarCsv(filtro);
    } catch (err: any) {
      setErroExport(err?.message ?? "Erro ao exportar");
    } finally {
      setExportando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.switcher}>
        <TouchableOpacity
          style={[styles.opcao, modo === "semana" && styles.opcaoAtiva]}
          onPress={() => setModo("semana")}
        >
          <Text style={[styles.opcaoText, modo === "semana" && styles.opcaoTextAtiva]}>Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.opcao, modo === "mes" && styles.opcaoAtiva]}
          onPress={() => setModo("mes")}
        >
          <Text style={[styles.opcaoText, modo === "mes" && styles.opcaoTextAtiva]}>Mês</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtros}>
        <View style={styles.buscaWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textDim} />
          <TextInput
            style={styles.buscaInput}
            placeholder="Buscar por nome..."
            placeholderTextColor={colors.textDim}
            value={texto}
            onChangeText={setTexto}
          />
        </View>

        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={categoriaFiltro}
            onValueChange={setCategoriaFiltro}
            style={styles.picker}
            dropdownIconColor={colors.text}
            mode="dropdown"
          >
            <Picker.Item label="Todas" value={TODAS} color={Platform.OS === "ios" ? colors.text : undefined} />
            {categorias.map((c) => (
              <Picker.Item key={c.nome} label={c.nome} value={c.nome} color={Platform.OS === "ios" ? colors.text : undefined} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity style={styles.exportBtn} onPress={exportar} disabled={exportando}>
          {exportando ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="download-outline" size={18} color={colors.accent} />
          )}
        </TouchableOpacity>
      </View>

      {erroExport && <Text style={styles.erro}>{erroExport}</Text>}

      {modo === "semana" ? (
        <SemanaScreen onChanged={onChanged} filtro={filtro} />
      ) : (
        <MesScreen filtro={filtro} />
      )}
    </View>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  opcao: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  opcaoAtiva: {
    backgroundColor: colors.accent,
  },
  opcaoText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: "600",
  },
  opcaoTextAtiva: {
    color: "#fff",
  },
  filtros: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  buscaWrap: {
    flex: 1.1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  buscaInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 8,
    fontSize: 13,
  },
  pickerWrap: {
    flex: 0.9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  picker: {
    color: colors.text,
    height: Platform.OS === "ios" ? undefined : 40,
    fontSize: 12,
    paddingHorizontal: 4,
  },
  exportBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  erro: {
    color: colors.up,
    fontSize: 12,
    marginHorizontal: 16,
    marginTop: 4,
    textAlign: "center",
  },
});
