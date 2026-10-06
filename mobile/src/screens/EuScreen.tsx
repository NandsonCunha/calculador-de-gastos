import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
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

import { alterarSenha, gerarNovoCodigoRecuperacao, getUsuarioAtual, temCodigoRecuperacao } from "../auth";
import { getPerfil, salvarLimiteDiario, salvarSalario, setSalarioOculto } from "../db";
import { fmtMoney } from "../dateUtils";
import { digitsToDisplay, digitsToValue, onlyDigits } from "../moneyMask";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";

type ModalAberto = null | "salario" | "limite" | "codigo" | "senha";

export default function EuScreen({ onSair }: { onSair: () => void }) {
  const { mode, colors, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [username, setUsername] = useState("");
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null);

  const [temCodigo, setTemCodigo] = useState(true);
  const [mostrarGerarCodigo, setMostrarGerarCodigo] = useState(false);
  const [senhaParaCodigo, setSenhaParaCodigo] = useState("");
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);

  const [salarioOculto, setSalarioOcultoState] = useState(false);
  const [salarioDigitos, setSalarioDigitos] = useState("");
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

  const fecharModal = () => {
    setModalAberto(null);
    setMostrarGerarCodigo(false);
    setSenhaParaCodigo("");
    setErroCodigo(null);
    setErro(null);
    setSucesso(null);
  };

  const alternarOculto = async () => {
    const novo = !salarioOculto;
    setSalarioOcultoState(novo);
    await setSalarioOculto(novo);
  };

  const salvarSalarioAtual = async () => {
    const valor = digitsToValue(salarioDigitos);
    await salvarSalario(valor);
    setSucessoSalario(true);
    setTimeout(() => setSucessoSalario(false), 2000);
  };

  const definirLimitePorInput = async () => {
    const valor = digitsToValue(limiteDigitos);
    setLimiteDiario(valor);
    await salvarLimiteDiario(valor);
    setSucessoLimite(true);
    setTimeout(() => setSucessoLimite(false), 2000);
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
    <View style={styles.container}>
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

        <View style={styles.lista}>
          <ItemLinha
            styles={styles}
            cor={colors.textDim}
            icone="cash-outline"
            titulo="Salário mensal"
            valor={salarioOculto ? "••••••" : fmtMoney(digitsToValue(salarioDigitos))}
            onPress={() => setModalAberto("salario")}
          />
          <ItemLinha
            styles={styles}
            cor={colors.textDim}
            icone="speedometer-outline"
            titulo="Limite diário de gastos"
            valor={limiteDiario > 0 ? fmtMoney(limiteDiario) : "Nenhum"}
            onPress={() => setModalAberto("limite")}
          />
          <ItemLinha
            styles={styles}
            cor={colors.textDim}
            icone="key-outline"
            titulo="Código de recuperação"
            valor={temCodigo ? "Configurado" : "Não configurado"}
            onPress={() => setModalAberto("codigo")}
          />
          <ItemLinha
            styles={styles}
            cor={colors.textDim}
            icone="lock-closed-outline"
            titulo="Alterar senha"
            onPress={() => setModalAberto("senha")}
            ultimo
          />
        </View>

        <TouchableOpacity style={styles.sairBtn} onPress={onSair}>
          <Text style={styles.sairBtnText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Salário */}
      <ModalBase visible={modalAberto === "salario"} onClose={fecharModal} styles={styles}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitulo}>Salário mensal</Text>
          <TouchableOpacity onPress={alternarOculto}>
            <Ionicons name={salarioOculto ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textDim} />
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.valorInput}
          placeholderTextColor={colors.textDim}
          keyboardType="number-pad"
          value={digitsToDisplay(salarioDigitos)}
          onChangeText={(t) => setSalarioDigitos(onlyDigits(t))}
          autoFocus
        />
        {sucessoSalario && <Text style={styles.sucesso}>Salário salvo</Text>}
        <TouchableOpacity style={styles.btn} onPress={salvarSalarioAtual}>
          <Text style={styles.btnText}>Salvar</Text>
        </TouchableOpacity>
      </ModalBase>

      {/* Limite diário */}
      <ModalBase visible={modalAberto === "limite"} onClose={fecharModal} styles={styles}>
        <Text style={styles.modalTitulo}>Limite diário de gastos</Text>
        <TextInput
          style={styles.valorInput}
          placeholderTextColor={colors.textDim}
          keyboardType="number-pad"
          value={digitsToDisplay(limiteDigitos)}
          onChangeText={(t) => setLimiteDigitos(onlyDigits(t))}
          autoFocus
        />
        <Text style={styles.limiteAviso}>
          Se você ultrapassar esse valor num dia, o app avisa — não impede de lançar.
        </Text>
        {sucessoLimite && <Text style={styles.sucesso}>Limite salvo</Text>}
        <TouchableOpacity style={styles.btn} onPress={definirLimitePorInput}>
          <Text style={styles.btnText}>Definir</Text>
        </TouchableOpacity>
      </ModalBase>

      {/* Código de recuperação */}
      <ModalBase visible={modalAberto === "codigo"} onClose={fecharModal} styles={styles}>
        <Text style={styles.modalTitulo}>Código de recuperação</Text>

        {codigoGerado ? (
          <>
            <Text style={styles.limiteAviso}>Anote esse código — não dá pra ver de novo depois:</Text>
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
              autoFocus
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
            <TouchableOpacity style={[styles.btn, { marginTop: 10 }]} onPress={() => setMostrarGerarCodigo(true)}>
              <Text style={styles.btnText}>{temCodigo ? "Gerar novo código" : "Gerar código"}</Text>
            </TouchableOpacity>
          </>
        )}
      </ModalBase>

      {/* Alterar senha */}
      <ModalBase visible={modalAberto === "senha"} onClose={fecharModal} styles={styles}>
        <Text style={styles.modalTitulo}>Alterar senha</Text>

        <TextInput
          style={styles.input}
          placeholder="Senha atual"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          autoFocus
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
      </ModalBase>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function ItemLinha({
  styles,
  cor,
  icone,
  titulo,
  valor,
  onPress,
  ultimo,
}: {
  styles: Styles;
  cor: string;
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  valor?: string;
  onPress: () => void;
  ultimo?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.itemLinha, ultimo && styles.itemLinhaUltimo]} onPress={onPress}>
      <View style={styles.itemLinhaEsq}>
        <Ionicons name={icone} size={18} color={cor} />
        <Text style={styles.itemLinhaTitulo}>{titulo}</Text>
      </View>
      <View style={styles.itemLinhaDir}>
        {valor && <Text style={styles.itemLinhaValor}>{valor}</Text>}
        <Ionicons name="chevron-forward" size={16} color={cor} />
      </View>
    </TouchableOpacity>
  );
}

function ModalBase({
  visible,
  onClose,
  styles,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  styles: Styles;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet}>{children}</Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
  lista: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 16,
  },
  itemLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemLinhaUltimo: {
    borderBottomWidth: 0,
  },
  itemLinhaEsq: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemLinhaTitulo: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  itemLinhaDir: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemLinhaValor: {
    color: colors.textDim,
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#00000099",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 20,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitulo: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  valorInput: {
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
    marginBottom: 10,
  },
  limiteAviso: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
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
    marginBottom: 10,
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
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  sairBtnText: {
    color: colors.up,
    fontSize: 14,
    fontWeight: "600",
  },
});
