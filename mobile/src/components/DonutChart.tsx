import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { fmtMoney } from "../dateUtils";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";
import type { CategoriaFatia } from "../types";

const SIZE = 160;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DonutChart({ fatias, total }: { fatias: CategoriaFatia[]; total: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (fatias.length === 0 || total === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Sem lançamentos este mês</Text>
      </View>
    );
  }

  let acc = 0;

  return (
    <View style={styles.row}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
            {fatias.map((f) => {
              const fracao = f.total / total;
              const dash = fracao * CIRCUMFERENCE;
              const offset = CIRCUMFERENCE - acc;
              acc += dash;
              return (
                <Circle
                  key={f.categoria}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke={f.cor}
                  strokeWidth={STROKE}
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={offset}
                  fill="transparent"
                />
              );
            })}
          </G>
        </Svg>
        <View style={styles.center}>
          <Text style={styles.centerValue}>{fmtMoney(total)}</Text>
          <Text style={styles.centerLabel}>total</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {fatias.map((f) => (
          <View key={f.categoria} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: f.cor }]} />
            <Text style={styles.legendCat} numberOfLines={1}>
              {f.categoria}
            </Text>
            <Text style={styles.legendPct}>{f.pct.toFixed(0)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  centerValue: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  centerLabel: {
    color: colors.textDim,
    fontSize: 10,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendCat: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  legendPct: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "600",
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textDim,
  },
});
