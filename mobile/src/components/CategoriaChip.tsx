import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COR_SEM_CATEGORIA } from "../categorias";
import { listarCategorias } from "../db";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";

export default function CategoriaChip({
  categoria,
  onChange,
}: {
  categoria: string;
  onChange: (nova: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [aberto, setAberto] = useState(false);
  const [categorias, setCategorias] = useState<{ nome: string; cor: string }[]>([]);

  useEffect(() => {
    listarCategorias().then(setCategorias);
  }, [aberto]);

  const cor = categorias.find((c) => c.nome === categoria)?.cor ?? COR_SEM_CATEGORIA;

  return (
    <>
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: cor + "33" }]}
        onPress={() => setAberto(true)}
      >
        <View style={[styles.dot, { backgroundColor: cor }]} />
        <Text style={[styles.chipText, { color: cor }]}>{categoria}</Text>
      </TouchableOpacity>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAberto(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Categoria</Text>
            {categorias.map((c) => (
              <TouchableOpacity
                key={c.nome}
                style={styles.opcao}
                onPress={() => {
                  onChange(c.nome);
                  setAberto(false);
                }}
              >
                <View style={[styles.dot, { backgroundColor: c.cor }]} />
                <Text style={[styles.opcaoText, c.nome === categoria && styles.opcaoTextAtiva]}>
                  {c.nome}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#00000099",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    paddingBottom: 28,
  },
  sheetTitle: {
    color: colors.textDim,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  opcao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  opcaoText: {
    color: colors.text,
    fontSize: 15,
  },
  opcaoTextAtiva: {
    fontWeight: "700",
  },
});
