import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { criarCategoria, excluirCategoria, listarCategorias, renomearCategoria } from "../db";
import { exportarCsv } from "../exportCsv";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";

type Categoria = { id: number; nome: string; cor: string };

export default function MaisScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [nomeCategoria, setNomeCategoria] = useState("");
  const [erroCategoria, setErroCategoria] = useState<string | null>(null);

  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  const carregarCategorias = () => listarCategorias().then(setCategorias);

  useEffect(() => {
    carregarCategorias();
  }, []);

  const exportar = async () => {
    setErro(null);
    setExportando(true);
    try {
      await exportarCsv();
    } catch (err: any) {
      setErro(err?.message ?? "Erro ao exportar");
    } finally {
      setExportando(false);
    }
  };

  const confirmarCriacao = async () => {
    setErroCategoria(null);
    if (!nomeCategoria.trim()) {
      setErroCategoria("Digite um nome");
      return;
    }
    try {
      await criarCategoria(nomeCategoria);
      setNomeCategoria("");
      setModalCriarAberto(false);
      await carregarCategorias();
    } catch (err: any) {
      setErroCategoria(err?.message ?? "Erro ao criar categoria");
    }
  };

  const abrirEdicao = (c: Categoria) => {
    setCategoriaEditando(c);
    setNomeEdicao(c.nome);
    setErroEdicao(null);
  };

  const confirmarEdicao = async () => {
    if (!categoriaEditando) return;
    setErroEdicao(null);
    try {
      await renomearCategoria(categoriaEditando.id, categoriaEditando.nome, nomeEdicao);
      setCategoriaEditando(null);
      await carregarCategorias();
    } catch (err: any) {
      setErroEdicao(err?.message ?? "Erro ao renomear categoria");
    }
  };

  const confirmarExclusao = (c: Categoria) => {
    Alert.alert(
      "Apagar categoria",
      `Apagar "${c.nome}"? Os lançamentos que usam ela passam a ficar como "Sem categoria".`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            await excluirCategoria(c.id, c.nome);
            await carregarCategorias();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <TouchableOpacity style={styles.item} onPress={() => setModalCriarAberto(true)}>
        <View style={styles.itemLeft}>
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={styles.itemText}>Criar categoria</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.item, { marginTop: 12 }]} onPress={exportar} disabled={exportando}>
        <View style={styles.itemLeft}>
          <Ionicons name="download-outline" size={20} color={colors.accent} />
          <Text style={styles.itemText}>Exportar CSV</Text>
        </View>
        {exportando ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        )}
      </TouchableOpacity>

      {erro && <Text style={styles.erro}>{erro}</Text>}

      <Text style={styles.secaoTitulo}>Categorias</Text>
      <View style={styles.listaCategorias}>
        {categorias.map((c) => (
          <View key={c.id} style={styles.categoriaRow}>
            <View style={styles.categoriaInfo}>
              <View style={[styles.dot, { backgroundColor: c.cor }]} />
              <Text style={styles.categoriaNome}>{c.nome}</Text>
            </View>
            <View style={styles.categoriaAcoes}>
              <TouchableOpacity onPress={() => abrirEdicao(c)}>
                <Ionicons name="pencil-outline" size={18} color={colors.textDim} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmarExclusao(c)}>
                <Ionicons name="trash-outline" size={18} color={colors.up} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <Modal
        visible={modalCriarAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCriarAberto(false)}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setModalCriarAberto(false)}>
            <Pressable style={styles.sheet}>
              <Text style={styles.sheetTitle}>Nova categoria</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Educação"
                placeholderTextColor={colors.textDim}
                value={nomeCategoria}
                onChangeText={setNomeCategoria}
                autoFocus
              />
              {erroCategoria && <Text style={styles.erro}>{erroCategoria}</Text>}
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmarCriacao}>
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!categoriaEditando}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoriaEditando(null)}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={() => setCategoriaEditando(null)}>
            <Pressable style={styles.sheet}>
              <Text style={styles.sheetTitle}>Renomear categoria</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor={colors.textDim}
                value={nomeEdicao}
                onChangeText={setNomeEdicao}
                autoFocus
              />
              {erroEdicao && <Text style={styles.erro}>{erroEdicao}</Text>}
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmarEdicao}>
                <Text style={styles.confirmBtnText}>Salvar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  erro: {
    color: colors.up,
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  secaoTitulo: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 24,
    marginBottom: 10,
  },
  listaCategorias: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  categoriaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoriaInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoriaNome: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  categoriaAcoes: {
    flexDirection: "row",
    gap: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#00000099",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
    marginBottom: 10,
  },
  confirmBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
