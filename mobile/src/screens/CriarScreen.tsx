import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { createAssinatura } from "../assinaturas";
import { addGasto, getPerfil, getTotalDia, listarCategorias } from "../db";
import { fmtDateBr, fmtMoney, toIso } from "../dateUtils";
import { digitsToDisplay, digitsToValue, onlyDigits } from "../moneyMask";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";
import { useToast } from "../toast";

export default function CriarScreen({ onChanged }: { onChanged: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();

  const [data, setData] = useState(new Date());
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [digitos, setDigitos] = useState("");
  const [categorias, setCategorias] = useState<{ nome: string; cor: string }[]>([]);
  const [categoria, setCategoria] = useState<string>("");
  const [assinaturaAtiva, setAssinaturaAtiva] = useState(false);
  const [nomeAssinatura, setNomeAssinatura] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    listarCategorias().then((cs) => {
      setCategorias(cs);
      setCategoria((atual) => atual || cs[0]?.nome || "");
    });
  }, []);

  const confirmar = async () => {
    const valor = digitsToValue(digitos);
    if (!valor || valor <= 0) return;
    if (!categoria) return;
    if (assinaturaAtiva && !nomeAssinatura.trim()) return;

    setSalvando(true);
    try {
      const dataIso = toIso(data);
      const eraAssinatura = assinaturaAtiva;
      if (assinaturaAtiva) {
        await createAssinatura(nomeAssinatura.trim(), valor, categoria, dataIso);
      } else {
        await addGasto(dataIso, valor, categoria);
      }

      setDigitos("");
      setNomeAssinatura("");
      setAssinaturaAtiva(false);
      setData(new Date());
      onChanged();

      setSucesso(true);
      setTimeout(() => setSucesso(false), 2000);

      if (!eraAssinatura && dataIso === toIso(new Date())) {
        const perfil = await getPerfil();
        if (perfil.limiteDiario > 0) {
          const totalHoje = await getTotalDia(dataIso);
          if (totalHoje > perfil.limiteDiario) {
            showToast(
              `Você passou do limite diário: ${fmtMoney(totalHoje)} de ${fmtMoney(perfil.limiteDiario)}`,
              5000
            );
          }
        }
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>Novo gasto</Text>

      <Text style={styles.label}>Data</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setMostrarDatePicker(true)}>
        <Text style={styles.dateBtnText}>{fmtDateBr(toIso(data))}</Text>
      </TouchableOpacity>

      {mostrarDatePicker && (
        <DateTimePicker
          value={data}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_event, selecionada) => {
            setMostrarDatePicker(Platform.OS === "ios");
            if (selecionada) setData(selecionada);
          }}
        />
      )}

      <Text style={styles.label}>Valor</Text>
      <TextInput
        style={styles.valorInput}
        placeholderTextColor={colors.textDim}
        keyboardType="number-pad"
        value={digitsToDisplay(digitos)}
        onChangeText={(t) => setDigitos(onlyDigits(t))}
      />

      <Text style={styles.label}>Categoria</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={categoria}
          onValueChange={setCategoria}
          style={styles.picker}
          dropdownIconColor={colors.text}
          mode="dropdown"
        >
          {categorias.map((c) => (
            <Picker.Item
              key={c.nome}
              label={c.nome}
              value={c.nome}
              color={Platform.OS === "ios" ? colors.text : undefined}
            />
          ))}
        </Picker>
      </View>

      <TouchableOpacity style={styles.assinaturaToggle} onPress={() => setAssinaturaAtiva((v) => !v)}>
        <View style={[styles.checkbox, assinaturaAtiva && styles.checkboxAtivo]}>
          {assinaturaAtiva && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.assinaturaToggleText}>🔁 É uma assinatura (repete todo mês)</Text>
      </TouchableOpacity>

      {assinaturaAtiva && (
        <TextInput
          style={[styles.valorInput, { fontSize: 16, marginTop: 8 }]}
          placeholder="Nome (ex: Spotify)"
          placeholderTextColor={colors.textDim}
          value={nomeAssinatura}
          onChangeText={setNomeAssinatura}
        />
      )}

      {sucesso && <Text style={styles.sucesso}>✓ Lançamento salvo</Text>}

      <TouchableOpacity style={styles.confirmBtn} onPress={confirmar} disabled={salvando}>
        <Text style={styles.confirmBtnText}>Confirmar</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  label: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 14,
  },
  dateBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dateBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  valorInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  pickerWrap: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    color: colors.text,
    height: Platform.OS === "ios" ? undefined : 46,
  },
  assinaturaToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxAtivo: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxMark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  assinaturaToggleText: {
    color: colors.textDim,
    fontSize: 13,
  },
  sucesso: {
    color: colors.down,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
  },
  confirmBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
