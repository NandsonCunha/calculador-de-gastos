import { useMemo, useState } from "react";
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

import { createAccount, gerarCodigoRecuperacao, login, redefinirSenhaComCodigo } from "../auth";
import { setSessionActive } from "../session";
import { useTheme } from "../theme";
import type { ColorTheme } from "../theme";

type Props = {
  modo: "criar" | "entrar";
  onAuthenticated: (username: string) => void;
};

type Etapa = "login" | "esqueci" | "mostrar-codigo";

export default function LoginScreen({ modo, onAuthenticated }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [etapa, setEtapa] = useState<Etapa>("login");

  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");

  const [codigoGerado, setCodigoGerado] = useState("");
  const [usernamePendente, setUsernamePendente] = useState("");

  const [recUsername, setRecUsername] = useState("");
  const [recCodigo, setRecCodigo] = useState("");
  const [recNovaSenha, setRecNovaSenha] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const entrarAutenticado = async (nomeUsuario: string) => {
    await setSessionActive(nomeUsuario);
    onAuthenticated(nomeUsuario);
  };

  const submit = async () => {
    setErro(null);
    if (!username.trim() || !senha) {
      setErro("Preencha usuário e senha");
      return;
    }

    setLoading(true);
    try {
      if (modo === "criar") {
        if (senha !== confirmSenha) {
          setErro("As senhas não conferem");
          return;
        }
        const codigo = gerarCodigoRecuperacao();
        await createAccount(username, senha, codigo);
        setCodigoGerado(codigo);
        setUsernamePendente(username.trim());
        setEtapa("mostrar-codigo");
      } else {
        const ok = await login(username, senha);
        if (!ok) {
          setErro("Usuário ou senha incorretos");
          return;
        }
        await entrarAutenticado(username.trim());
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmarCodigoSalvo = async () => {
    await entrarAutenticado(usernamePendente);
  };

  const confirmarRecuperacao = async () => {
    setErro(null);
    if (!recUsername.trim() || !recCodigo.trim() || !recNovaSenha) {
      setErro("Preencha todos os campos");
      return;
    }
    const ok = await redefinirSenhaComCodigo(recUsername, recCodigo, recNovaSenha);
    if (!ok) {
      setErro("Usuário ou código de recuperação incorretos");
      return;
    }
    setAviso("Senha alterada! Faça login com a nova senha.");
    setEtapa("login");
    setUsername(recUsername);
    setSenha("");
  };

  if (etapa === "mostrar-codigo") {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.title}>Guarde seu código</Text>
        <Text style={styles.subtitle}>
          Esse é o único jeito de recuperar sua senha caso esqueça. Anote em algum lugar seguro —
          não tem como ver de novo depois.
        </Text>

        <View style={styles.codigoBox}>
          <Text style={styles.codigoTexto}>{codigoGerado}</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={confirmarCodigoSalvo}>
          <Text style={styles.btnText}>Já salvei, continuar</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  if (etapa === "esqueci") {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>Informe seu usuário e o código de recuperação</Text>

        <TextInput
          style={styles.input}
          placeholder="Usuário"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          value={recUsername}
          onChangeText={setRecUsername}
        />

        <TextInput
          style={styles.input}
          placeholder="Código (ex: ABCD-1234)"
          placeholderTextColor={colors.textDim}
          autoCapitalize="characters"
          value={recCodigo}
          onChangeText={setRecCodigo}
        />

        <TextInput
          style={styles.input}
          placeholder="Nova senha"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={recNovaSenha}
          onChangeText={setRecNovaSenha}
        />

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <TouchableOpacity style={styles.btn} onPress={confirmarRecuperacao}>
          <Text style={styles.btnText}>Redefinir senha</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setEtapa("login"); setErro(null); }}>
          <Text style={styles.link}>Voltar</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={{ backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={styles.title}>Meus Gastos</Text>
        <Text style={styles.subtitle}>
          {modo === "criar" ? "Crie uma conta local pra proteger seus dados" : "Entrar"}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Usuário"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        {modo === "criar" && (
          <TextInput
            style={styles.input}
            placeholder="Confirmar senha"
            placeholderTextColor={colors.textDim}
            secureTextEntry
            value={confirmSenha}
            onChangeText={setConfirmSenha}
          />
        )}

        {aviso && <Text style={styles.avisoOk}>{aviso}</Text>}
        {erro && <Text style={styles.erro}>{erro}</Text>}

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          <Text style={styles.btnText}>{modo === "criar" ? "Criar conta" : "Entrar"}</Text>
        </TouchableOpacity>

        {modo === "entrar" && (
          <TouchableOpacity onPress={() => { setEtapa("esqueci"); setErro(null); }}>
            <Text style={styles.link}>Esqueci minha senha</Text>
          </TouchableOpacity>
        )}

        {modo === "criar" && (
          <Text style={styles.aviso}>
            Depois de criar a conta, você vai receber um código de recuperação — é a única forma
            de redefinir a senha caso esqueça.
          </Text>
        )}
      </KeyboardAvoidingView>
    </ScrollView>
  );
}

const makeStyles = (colors: ColorTheme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
  },
  label: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    marginBottom: 12,
  },
  codigoBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  codigoTexto: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 2,
  },
  erro: {
    color: colors.up,
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  avisoOk: {
    color: colors.down,
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  link: {
    color: colors.accent,
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
  aviso: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 16,
  },
});
