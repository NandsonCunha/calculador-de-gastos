import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import DayDetailModal from "../components/DayDetailModal";
import { getMonth } from "../db";
import type { FiltroBusca } from "../db";
import { WEEKDAY_SHORT, fmtMoney } from "../dateUtils";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";
import type { MesResumo } from "../types";

const today = new Date();

export default function MesScreen({ filtro }: { filtro?: FiltroBusca }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<MesResumo | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await getMonth(year, month, filtro);
    setData(d);
  }, [year, month, filtro?.categoria, filtro?.texto]);

  useEffect(() => {
    load();
  }, [load]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  if (!data) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navRange}>
          {data.monthName} {data.year}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.total}>
        Total do mês: <Text style={styles.totalValue}>{fmtMoney(data.total)}</Text>
      </Text>

      <View style={styles.headRow}>
        {WEEKDAY_SHORT.map((w) => (
          <Text key={w} style={styles.headCell}>
            {w}
          </Text>
        ))}
      </View>

      {data.weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((dia) => (
            <TouchableOpacity
              key={dia.data}
              style={[styles.cell, dia.noMes && styles.cellOut, dia.hoje && styles.cellToday]}
              onPress={() => setDiaSelecionado(dia.data)}
            >
              <Text style={styles.cellDay}>{dia.dia}</Text>
              {dia.valor > 0 && <Text style={styles.cellValue}>{fmtMoney(dia.valor)}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <DayDetailModal
        data={diaSelecionado}
        onClose={() => setDiaSelecionado(null)}
        onChanged={load}
      />
    </ScrollView>
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
    marginBottom: 12,
  },
  navBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  navBtnText: {
    color: colors.text,
    fontSize: 16,
  },
  navRange: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  total: {
    color: colors.textDim,
    fontSize: 14,
    marginBottom: 14,
  },
  totalValue: {
    color: colors.accent,
    fontWeight: "700",
  },
  headRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  headCell: {
    flex: 1,
    textAlign: "center",
    color: colors.textDim,
    fontSize: 11,
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    minHeight: 54,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 4,
    opacity: 0.35,
  },
  cellOut: {
    opacity: 1,
  },
  cellToday: {
    backgroundColor: colors.today,
    borderColor: colors.accent,
  },
  cellDay: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  cellValue: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
});
