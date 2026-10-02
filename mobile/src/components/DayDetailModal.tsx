import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { deleteGasto, getEntriesForDay, updateCategoria } from "../db";
import { fmtDateBr, fmtMoney } from "../dateUtils";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";
import CategoriaChip from "./CategoriaChip";

type Lancamento = {
  id: number;
  valor: number;
  categoria: string;
  nome: string | null;
  assinatura_id: number | null;
};

export default function DayDetailModal({
  data,
  onClose,
  onChanged,
}: {
  data: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);

  const load = useCallback(async () => {
    if (!data) return;
    const rows = await getEntriesForDay(data);
    setLancamentos(rows);
  }, [data]);

  useEffect(() => {
    load();
  }, [load]);

  const remover = async (id: number) => {
    await deleteGasto(id);
    await load();
    onChanged();
  };

  const alterarCategoria = async (id: number, categoria: string) => {
    await updateCategoria(id, categoria);
    await load();
    onChanged();
  };

  const total = lancamentos.reduce((s, l) => s + l.valor, 0);

  return (
    <Modal visible={!!data} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>{data ? fmtDateBr(data) : ""}</Text>
          <Text style={styles.total}>Total: {fmtMoney(total)}</Text>

          {lancamentos.length === 0 && <Text style={styles.vazio}>Nenhum lançamento nesse dia</Text>}

          {lancamentos.map((l) => (
            <View key={l.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.valor}>
                  {l.assinatura_id ? "🔁 " : ""}
                  {l.nome ? `${l.nome} · ` : ""}
                  {fmtMoney(l.valor)}
                </Text>
                <CategoriaChip categoria={l.categoria} onChange={(nova) => alterarCategoria(l.id, nova)} />
              </View>
              <TouchableOpacity onPress={() => remover(l.id)}>
                <Text style={styles.del}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.fecharBtn} onPress={onClose}>
            <Text style={styles.fecharBtnText}>Fechar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000099",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "70%",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  total: {
    color: colors.accent,
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 16,
  },
  vazio: {
    color: colors.textDim,
    fontSize: 13,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  valor: {
    color: colors.text,
    fontSize: 14,
  },
  del: {
    color: colors.textDim,
    fontSize: 18,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  fecharBtn: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 10,
  },
  fecharBtnText: {
    color: colors.textDim,
    fontSize: 13,
  },
});
