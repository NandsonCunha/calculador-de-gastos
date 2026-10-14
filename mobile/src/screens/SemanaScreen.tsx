import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import CategoriaChip from "../components/CategoriaChip";
import EditLancamentoModal from "../components/EditLancamentoModal";
import { deleteGasto, getWeek, updateCategoria } from "../db";
import type { FiltroBusca } from "../db";
import { fmtDateBr, fmtMoney } from "../dateUtils";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";
import type { SemanaResumo } from "../types";

export default function SemanaScreen({
  onChanged,
  filtro,
}: {
  onChanged: () => void;
  filtro?: FiltroBusca;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<SemanaResumo | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const d = await getWeek(offset, filtro);
    setData(d);
  }, [offset, filtro?.categoria, filtro?.texto]);

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

  if (!data) return null;

  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => setOffset((o) => o - 1)} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹ Anterior</Text>
        </TouchableOpacity>
        <Text style={styles.navRange}>
          {fmtDateBr(data.start)} - {fmtDateBr(data.end)}
        </Text>
        <TouchableOpacity onPress={() => setOffset((o) => o + 1)} style={styles.navBtn}>
          <Text style={styles.navBtnText}>Próxima ›</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.totalSemana}>Total: {fmtMoney(data.total)}</Text>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
        {data.dias.map((dia) => (
          <View key={dia.data} style={[styles.dayCard, dia.hoje && styles.dayCardToday]}>
            <View style={styles.dayHead}>
              <View>
                <Text style={styles.weekday}>{dia.weekday}</Text>
                <Text style={styles.dayNum}>Dia {dia.dia}</Text>
              </View>
              {dia.total > 0 && <Text style={styles.dayTotal}>{fmtMoney(dia.total)}</Text>}
            </View>

            {dia.lancamentos.length === 0 && <Text style={styles.vazio}>Sem lançamentos</Text>}

            {dia.lancamentos.map((l) => (
              <View key={l.id} style={styles.entryRow}>
                <TouchableOpacity style={styles.entryLeft} onPress={() => setEditandoId(l.id)}>
                  <Text style={styles.entryValue}>
                    {l.assinaturaId ? "🔁 " : ""}
                    {l.nome ? `${l.nome} · ` : ""}
                    {fmtMoney(l.valor)}
                  </Text>
                  <CategoriaChip categoria={l.categoria} onChange={(nova) => alterarCategoria(l.id, nova)} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remover(l.id)}>
                  <Text style={styles.entryDel}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <EditLancamentoModal
        gastoId={editandoId}
        onClose={() => setEditandoId(null)}
        onSaved={() => {
          load();
          onChanged();
        }}
      />
    </View>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  navBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navBtnText: {
    color: colors.text,
    fontSize: 13,
  },
  navRange: {
    color: colors.textDim,
    fontSize: 12,
  },
  totalSemana: {
    color: colors.accent,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  dayCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  dayCardToday: {
    backgroundColor: colors.today,
    borderColor: colors.accent,
  },
  dayHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  weekday: {
    color: colors.textDim,
    fontSize: 12,
  },
  dayNum: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  dayTotal: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 15,
  },
  vazio: {
    color: colors.textDim,
    fontSize: 12,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  entryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  entryValue: {
    color: colors.text,
    fontSize: 14,
  },
  entryDel: {
    color: colors.textDim,
    fontSize: 18,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
});
