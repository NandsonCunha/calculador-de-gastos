import { Picker } from "@react-native-picker/picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { cancelarAssinatura, listarAssinaturasAtivas } from "../assinaturas";
import { COR_SEM_CATEGORIA } from "../categorias";
import DonutChart from "../components/DonutChart";
import { getDashboard, listarCategorias } from "../db";
import { MONTH_NAMES, fmtDateBr, fmtMoney } from "../dateUtils";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";
import type { Assinatura, Dashboard } from "../types";

const TODAS = "__todas__";
const hoje = new Date();

export default function DashboardScreen({ refreshKey }: { refreshKey: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [data, setData] = useState<Dashboard | null>(null);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [coresCategoria, setCoresCategoria] = useState<Record<string, string>>({});
  const [categoriasLista, setCategoriasLista] = useState<{ nome: string; cor: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [categoriaFiltro, setCategoriaFiltro] = useState(TODAS);

  const load = useCallback(async () => {
    const categoria = categoriaFiltro === TODAS ? undefined : categoriaFiltro;
    const d = await getDashboard(ano, mes, categoria);
    setData(d);
    const a = await listarAssinaturasAtivas();
    setAssinaturas(a);
    const cs = await listarCategorias();
    setCategoriasLista(cs);
    setCoresCategoria(Object.fromEntries(cs.map((c) => [c.nome, c.cor])));
  }, [ano, mes, categoriaFiltro]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  };

  const mesSeguinte = () => {
    if (mes === 12) {
      setMes(1);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  };

  const cancelar = async (id: number) => {
    await cancelarAssinatura(id);
    await load();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!data) return null;

  const max = Math.max(...data.meses.map((m) => m.total + m.projetado), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={styles.filtros}>
        <View style={styles.mesNav}>
          <TouchableOpacity onPress={mesAnterior} style={styles.mesNavBtn}>
            <Text style={styles.mesNavBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.mesNavLabel}>
            {MONTH_NAMES[mes - 1]} {ano}
          </Text>
          <TouchableOpacity onPress={mesSeguinte} style={styles.mesNavBtn}>
            <Text style={styles.mesNavBtnText}>›</Text>
          </TouchableOpacity>
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
            {categoriasLista.map((c) => (
              <Picker.Item key={c.nome} label={c.nome} value={c.nome} color={Platform.OS === "ios" ? colors.text : undefined} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroHead}>
          <Text style={styles.heroLabel}>{data.ehMesAtual ? "Gasto este mês" : "Total do mês"}</Text>
          {data.variacaoPct !== null && (
            <View style={[styles.heroBadge, { backgroundColor: (data.variacaoPct > 0 ? colors.up : colors.down) + "33" }]}>
              <Text style={[styles.heroBadgeText, { color: data.variacaoPct > 0 ? colors.up : colors.down }]}>
                {data.variacaoPct >= 0 ? "+" : ""}
                {data.variacaoPct.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.heroValor}>{fmtMoney(data.mesTotal)}</Text>
      </View>

      <View style={styles.cardsRow}>
        {data.ehMesAtual && <Card styles={styles} label="Esta semana" value={fmtMoney(data.semanaTotal)} />}
        <Card styles={styles} label="Média/dia" value={fmtMoney(data.mediaDia)} />
        {data.ehMesAtual && (
          <Card styles={styles} label="Previsão" value={fmtMoney(data.projecaoMes)} color={colors.previsto} />
        )}
      </View>

      <View style={styles.block}>
        <View style={styles.blockHead}>
          <Text style={styles.blockTitle}>Últimos 6 meses</Text>
          <View style={styles.legend}>
            <LegendDot styles={styles} color={colors.gasto} label="Gasto" />
            <LegendDot styles={styles} color={colors.previsto} label="Previsto" />
          </View>
        </View>

        <View style={styles.chart}>
          {data.meses.map((mes) => {
            const totalComPrevisao = mes.total + mes.projetado;
            const heightPct = Math.max((totalComPrevisao / max) * 100, totalComPrevisao > 0 ? 4 : 0);
            const gastoFlex = mes.total > 0 ? mes.total : 0.001;
            return (
              <View key={`${mes.year}-${mes.month}`} style={styles.barCol}>
                <Text style={styles.barValue}>{totalComPrevisao > 0 ? fmtMoney(totalComPrevisao) : ""}</Text>
                <View style={styles.barWrap}>
                  <View style={[styles.barStack, { height: `${heightPct}%` }]}>
                    <View style={[styles.barSeg, { flex: gastoFlex, backgroundColor: colors.gasto }]} />
                    {mes.projetado > 0 && <View style={[styles.barSeg, { flex: mes.projetado, backgroundColor: colors.previsto }]} />}
                  </View>
                </View>
                <Text style={styles.barLabel}>{mes.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Gasto por categoria (mês)</Text>
        <DonutChart fatias={data.categorias} total={data.mesTotal} />

        {data.categorias.length > 0 && (
          <View style={styles.breakdown}>
            {data.categorias.map((c) => (
              <View key={c.categoria} style={styles.breakdownRow}>
                <View style={styles.breakdownHead}>
                  <View style={styles.breakdownNome}>
                    <View style={[styles.dot, { backgroundColor: c.cor }]} />
                    <Text style={styles.breakdownLabel}>{c.categoria}</Text>
                  </View>
                  <Text style={styles.breakdownValor}>
                    {fmtMoney(c.total)} <Text style={styles.dim}>{c.pct.toFixed(0)}%</Text>
                  </Text>
                </View>
                <View style={styles.breakdownBarBg}>
                  <View style={[styles.breakdownBarFill, { width: `${c.pct}%`, backgroundColor: c.cor }]} />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Gasto vs. salário</Text>
        {data.salario <= 0 ? (
          <Text style={styles.dim}>Defina seu salário na aba Eu para ver essa comparação</Text>
        ) : data.salarioOculto ? (
          <Text style={styles.dim}>•••• (valores ocultos — mude isso na aba Eu)</Text>
        ) : (
          (() => {
            const pct = (data.mesTotal / data.salario) * 100;
            const restante = data.salario - data.mesTotal;
            const pctBarra = Math.min(pct, 100);
            return (
              <>
                <View style={styles.salarioBarBg}>
                  <View
                    style={[
                      styles.salarioBarFill,
                      { width: `${pctBarra}%`, backgroundColor: pct > 100 ? colors.up : colors.accent },
                    ]}
                  />
                </View>
                <View style={styles.salarioLinha}>
                  <Text style={styles.dim}>
                    Gastou <Text style={{ color: colors.text, fontWeight: "700" }}>{pct.toFixed(0)}%</Text> do salário
                  </Text>
                  <Text style={[styles.dim, { color: restante >= 0 ? colors.down : colors.up }]}>
                    {restante >= 0 ? "Sobra" : "Estourou"} {fmtMoney(Math.abs(restante))}
                  </Text>
                </View>
              </>
            );
          })()
        )}
      </View>

      {assinaturas.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Assinaturas ativas</Text>
          {assinaturas.map((a) => (
            <View key={a.id} style={styles.assinaturaRow}>
              <View style={styles.assinaturaInfo}>
                <View style={[styles.assinaturaDot, { backgroundColor: coresCategoria[a.categoria] ?? COR_SEM_CATEGORIA }]} />
                <View>
                  <Text style={styles.assinaturaNome}>{a.nome}</Text>
                  <Text style={styles.assinaturaDetalhe}>
                    {fmtMoney(a.valor)} · todo dia {a.diaMes}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => cancelar(a.id)}>
                <Text style={styles.cancelarBtn}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Maior gasto do mês</Text>
        {data.maiorDia ? (
          <Text style={styles.maiorDia}>
            <Text style={{ fontWeight: "700" }}>{fmtDateBr(data.maiorDia.data)}</Text> — {fmtMoney(data.maiorDia.valor)}
          </Text>
        ) : (
          <Text style={styles.dim}>Nenhum lançamento este mês</Text>
        )}
      </View>
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Card({
  styles,
  label,
  value,
  color,
}: {
  styles: Styles;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function LegendDot({ styles, color, label }: { styles: Styles; color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  filtros: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  mesNav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  mesNavBtn: {
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  mesNavBtnText: {
    color: colors.text,
    fontSize: 16,
  },
  mesNavLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  pickerWrap: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
  },
  picker: {
    color: colors.text,
    height: Platform.OS === "ios" ? undefined : 40,
    fontSize: 12,
  },
  hero: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  heroLabel: {
    color: "#ffffffcc",
    fontSize: 13,
    fontWeight: "600",
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  heroValor: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "800",
  },
  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: "30%",
    flexGrow: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: colors.textDim,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.accent,
  },
  block: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  blockHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  blockTitle: {
    fontSize: 14,
    color: colors.textDim,
    marginBottom: 8,
  },
  legend: {
    flexDirection: "row",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.textDim,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 160,
    gap: 8,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barValue: {
    fontSize: 9,
    color: colors.textDim,
    marginBottom: 4,
  },
  barWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barStack: {
    width: "55%",
    borderRadius: 10,
    overflow: "hidden",
    flexDirection: "column-reverse",
  },
  barSeg: {
    width: "100%",
  },
  barLabel: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 8,
  },
  breakdown: {
    marginTop: 18,
    gap: 12,
  },
  breakdownRow: {
    gap: 6,
  },
  breakdownHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownNome: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  breakdownLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  breakdownValor: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  breakdownBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bg,
    overflow: "hidden",
  },
  breakdownBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  maiorDia: {
    fontSize: 16,
    color: colors.text,
  },
  dim: {
    color: colors.textDim,
  },
  assinaturaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  assinaturaInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  assinaturaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  assinaturaNome: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  assinaturaDetalhe: {
    color: colors.textDim,
    fontSize: 12,
  },
  cancelarBtn: {
    color: colors.up,
    fontSize: 13,
    fontWeight: "600",
  },
  salarioBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.bg,
    overflow: "hidden",
    marginBottom: 10,
  },
  salarioBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  salarioLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
