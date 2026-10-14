import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { deleteGasto, editarLancamento, getGasto, listarCategorias } from "../db";
import { fmtDateBr, toIso } from "../dateUtils";
import { digitsToDisplay, digitsToValue, onlyDigits } from "../moneyMask";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";

function dataParaDate(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export default function EditLancamentoModal({
  gastoId,
  onClose,
  onSaved,
}: {
  gastoId: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [categorias, setCategorias] = useState<{ nome: string; cor: string }[]>([]);
  const [digitos, setDigitos] = useState("");
  const [categoria, setCategoria] = useState("");
  const [nome, setNome] = useState<string | null>(null);
  const [data, setData] = useState(new Date());
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!gastoId) {
      setCarregado(false);
      return;
    }
    (async () => {
      const [gasto, cs] = await Promise.all([getGasto(gastoId), listarCategorias()]);
      setCategorias(cs);
      if (gasto) {
        setDigitos(String(Math.round(gasto.valor * 100)));
        setCategoria(gasto.categoria);
        setNome(gasto.nome);
        setData(dataParaDate(gasto.data));
      }
      setErro(null);
      setCarregado(true);
    })();
  }, [gastoId]);

  const salvar = async () => {
    if (!gastoId) return;
    const valor = digitsToValue(digitos);
    if (!valor || valor <= 0) {
      setErro("Valor inválido");
      return;
    }
    try {
      await editarLancamento(gastoId, { valor, categoria, data: toIso(data) });
      onSaved();
      onClose();
    } catch (err: any) {
      setErro(err?.message ?? "Erro ao salvar");
    }
  };

  const apagar = async () => {
    if (!gastoId) return;
    await deleteGasto(gastoId);
    onSaved();
    onClose();
  };

  return (
    <Modal visible={!!gastoId} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>{nome ? `Editar · ${nome}` : "Editar lançamento"}</Text>

            {carregado && (
              <>
                <Text style={styles.label}>Valor</Text>
                <TextInput
                  style={styles.valorInput}
                  placeholderTextColor={colors.textDim}
                  keyboardType="number-pad"
                  value={digitsToDisplay(digitos)}
                  onChangeText={(t) => setDigitos(onlyDigits(t))}
                />

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

                {erro && <Text style={styles.erro}>{erro}</Text>}

                <TouchableOpacity style={styles.btn} onPress={salvar}>
                  <Text style={styles.btnText}>Salvar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.apagarBtn} onPress={apagar}>
                  <Text style={styles.apagarBtnText}>Apagar lançamento</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.fecharBtn} onPress={onClose}>
              <Text style={styles.fecharBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
    flex: {
      flex: 1,
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
      padding: 20,
      paddingBottom: 32,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 16,
    },
    label: {
      color: colors.textDim,
      fontSize: 12,
      marginBottom: 6,
      marginTop: 12,
    },
    valorInput: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
      textAlign: "center",
    },
    dateBtn: {
      backgroundColor: colors.bg,
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
    pickerWrap: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden",
    },
    picker: {
      color: colors.text,
      height: Platform.OS === "ios" ? undefined : 46,
    },
    erro: {
      color: colors.up,
      fontSize: 13,
      marginTop: 12,
      textAlign: "center",
    },
    btn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 18,
    },
    btnText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
    apagarBtn: {
      alignItems: "center",
      paddingVertical: 12,
      marginTop: 4,
    },
    apagarBtnText: {
      color: colors.up,
      fontSize: 13,
      fontWeight: "600",
    },
    fecharBtn: {
      alignItems: "center",
      paddingVertical: 10,
    },
    fecharBtnText: {
      color: colors.textDim,
      fontSize: 13,
    },
  });
