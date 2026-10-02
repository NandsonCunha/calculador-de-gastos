import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { alterarSenha, gerarNovoCodigoRecuperacao, getUsuarioAtual, temCodigoRecuperacao } from "../auth";
import { getPerfil, salvarLimiteDiario, salvarSalario, setSalarioOculto } from "../db";
import { fmtMoney } from "../dateUtils";
import { digitsToDisplay, digitsToValue, onlyDigits } from "../moneyMask";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";

export default function EuScreen({ onSair }: { onSair: () => void }) {
  const { mode, colors, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [username, setUsername] = useState("");

  const [temCodigo, setTemCodigo] = useState(true);
  const [mostrarGerarCodigo, setMostrarGerarCodigo] = useState(false);
  const [senhaParaCodigo, setSenhaParaCodigo] = useState("");
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);

  const [salarioOculto, setSalarioOcultoState] = useState(false);
  const [salarioDigitos, setSalarioDigitos] = useState("");
  const [editandoSalario, setEditandoSalario] = useState(false);
  const [sucessoSalario, setSucessoSalario] = useState(false);

  const [limiteDiario, setLimiteDiario] = useState(0);
  const [limiteDigitos, setLimiteDigitos] = useState("");
  const [sucessoLimite, setSucessoLimite] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    getUsuarioAtual().then((u) => setUsername(u?.username ?? ""));
    temCodigoRecuperacao().then(setTemCodigo);
    getPerfil().then((p) => {
      setSalarioDigitos(p.salario > 0 ? String(Math.round(p.salario * 100)) : "");
      setSalarioOcultoState(p.salarioOculto);
      setLimiteDiario(p.limiteDiario);
      setLimiteDigitos(p.limiteDiario > 0 ? String(Math.round(p.limiteDiario * 100)) : "");
    });
  }, []);

  const alternarOculto = async () => {
    const novo = !salarioOculto;
    setSalarioOcultoState(novo);
    await setSalarioOculto(novo);
  };

  const alterarLimite = async (valor: number) => {
    setLimiteDiario(valor);
    setLimiteDigitos(valor > 0 ? String(Math.round(valor * 100)) : "");
    await salvarLimiteDiario(valor);
    setSucessoLimite(true);
    setTimeout(() => setSucessoLimite(false), 2000);
  };

  const definirLimitePorInput = async () => {
    const valor = digitsToValue(limiteDigitos);
    await alterarLimite(valor);
  };

  const salvarSalarioAtual = async () => {
    const valor = digitsToValue(salarioDigitos);
    await salvarSalario(valor);
    setEditandoSalario(false);
    setSucessoSalario(true);
    setTimeout(() => setSucessoSalario(false), 2000);
  };

  const confirmarGerarCodigo = async () => {
    setErroCodigo(null);
    if (!senhaParaCodigo) {
      setErroCodigo("Digite sua senha atual");
      return;
    }
    const codigo = await gerarNovoCodigoRecuperacao(senhaParaCodigo);
    if (!codigo) {
      setErroCodigo("Senha incorreta");
      return;
    }
    setSenhaParaCodigo("");
    setMostrarGerarCodigo(false);
    setCodigoGerado(codigo);
    setTemCodigo(true);
  };

  const salvarSenha = async () => {
    setErro(null);
    setSucesso(null);
    if (!senhaAtual || !novaSenha || !confirmSenha) {
      setErro("Preencha todos os campos");
      return;
    }
    if (novaSenha !== confirmSenha) {
      setErro("As senhas novas não conferem");
      return;
    }
    const ok = await alterarSenha(senhaAtual, novaSenha);
    if (!ok) {
      setErro("Senha atual incorreta");
      return;
    }
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmSenha("");
    setSucesso("Senha alterada com sucesso");
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <TouchableOpacity style={styles.temaCorner} onPress={toggleTheme}>
        <Ionicons name={mode === "dark" ? "sunny-outline" : "moon-outline"} size={22} color={colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.perfil}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{username.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>{username}</Text>
        </View>

        <View style={styles.block}>
          <View style={styles.salarioHead}>
            <Text style={styles.blockTitle}>Salário mensal</Text>
            <TouchableOpacity onPress={alternarOculto}>
              <Ionicons name={salarioOculto ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {editandoSalario ? (
            <>
              <TextInput
                style={styles.salarioInput}
                placeholderTextColor={colors.textDim}
                keyboardType="number-pad"
                value={digitsToDisplay(salarioDigitos)}
                onChangeText={(t) => setSalarioDigitos(onlyDigits(t))}
                autoFocus
              />
              <TouchableOpacity style={styles.btn} onPress={salvarSalarioAtual}>
                <Text style={styles.btnText}>Salvar salário</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setEditandoSalario(true)}>
              <Text style={styles.salarioValor}>
                {salarioOculto ? "••••••" : `R$ ${digitsToDisplay(salarioDigitos)}`}
              </Text>
              <Text style={styles.salarioEditarText}>Toque para editar</Text>
            </TouchableOpacity>
          )}

          {sucessoSalario && <Text style={styles.sucesso}>Salário salvo</Text>}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Limite diário de gastos</Text>

          <View style={styles.limiteInputRow}>
            <TextInput
              style={styles.limiteInput}
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              value={digitsToDisplay(limiteDigitos)}
              onChangeText={(t) => setLimiteDigitos(onlyDigits(t))}
            />
            <TouchableOpacity style={styles.limiteDefinirBtn} onPress={definirLimitePorInput}>
              <Text style={styles.limiteDefinirBtnText}>Definir</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.limiteValorAtual}>
            Limite atual: {limiteDiario > 0 ? fmtMoney(limiteDiario) : "nenhum"}
          </Text>

          <Text style={styles.limiteAviso}>
            Se você ultrapassar esse valor num dia, o app avisa — não impede de lançar.
          </Text>
          {sucessoLimite && <Text style={styles.sucesso}>Limite salvo</Text>}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Código de recuperação</Text>

          {codigoGerado ? (
            <>
              <Text style={styles.codigoAviso}>
                Anote esse código — não dá pra ver de novo depois:
              </Text>
              <View style={styles.codigoBox}>
                <Text style={styles.codigoTexto}>{codigoGerado}</Text>
              </View>
              <TouchableOpacity style={styles.btn} onPress={() => setCodigoGerado(null)}>
                <Text style={styles.btnText}>Já salvei</Text>
              </TouchableOpacity>
            </>
          ) : mostrarGerarCodigo ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Sua senha atual"
                placeholderTextColor={colors.textDim}
                secureTextEntry
                value={senhaParaCodigo}
                onChangeText={setSenhaParaCodigo}
              />
              {erroCodigo && <Text style={styles.erro}>{erroCodigo}</Text>}
              <TouchableOpacity style={styles.btn} onPress={confirmarGerarCodigo}>
                <Text style={styles.btnText}>Gerar código</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.limiteAviso}>
                {temCodigo
                  ? "Você já tem um código de recuperação configurado."
                  : "Você ainda não tem um código de recuperação — sem ele, não tem como redefinir a senha se esquecer."}
              </Text>
              <TouchableOpacity
                style={[styles.btn, { marginTop: 10 }]}
                onPress={() => setMostrarGerarCodigo(true)}
              >
                <Text style={styles.btnText}>{temCodigo ? "Gerar novo código" : "Gerar código"}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Alterar senha</Text>

          <TextInput
            style={styles.input}
            placeholder="Senha atual"
            placeholderTextColor={colors.textDim}
            secureTextEntry
            value={senhaAtual}
            onChangeText={setSenhaAtual}
          />
          <TextInput
            style={styles.input}
            placeholder="Nova senha"
            placeholderTextColor={colors.textDim}
            secureTextEntry
            value={novaSenha}
            onChangeText={setNovaSenha}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmar nova senha"
            placeholderTextColor={colors.textDim}
            secureTextEntry
            value={confirmSenha}
            onChangeText={setConfirmSenha}
          />

          {erro && <Text style={styles.erro}>{erro}</Text>}
          {sucesso && <Text style={styles.sucesso}>{sucesso}</Text>}

          <TouchableOpacity style={styles.btn} onPress={salvarSenha}>
            <Text style={styles.btnText}>Salvar nova senha</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.sairBtn} onPress={onSair}>
          <Text style={styles.sairBtnText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  perfil: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },
  username: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  block: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  blockTitle: {
    color: colors.textDim,
    fontSize: 14,
    marginBottom: 14,
  },
  temaCorner: {
    position: "absolute",
    top: 16,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  salarioHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  salarioValor: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
  },
  salarioEditarText: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 4,
  },
  salarioInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  limiteInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  limiteInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  limiteDefinirBtn: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  limiteDefinirBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  limiteValorAtual: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 14,
  },
  limiteAviso: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 15,
  },
  codigoAviso: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 12,
  },
  codigoBox: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  codigoTexto: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 2,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: colors.text,
    marginBottom: 10,
  },
  erro: {
    color: colors.up,
    fontSize: 13,
    marginBottom: 10,
    textAlign: "center",
  },
  sucesso: {
    color: colors.down,
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  sairBtn: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  sairBtnText: {
    color: colors.up,
    fontSize: 14,
    fontWeight: "600",
  },
});
