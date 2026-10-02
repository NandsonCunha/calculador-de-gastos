import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";

const KEY = "ultima_atualizacao_id";

// true só quando o app abriu rodando uma atualização OTA diferente da última vez que foi aberto
export async function foiAtualizadoAgora(): Promise<boolean> {
  const idAtual = Updates.updateId;
  if (!idAtual) return false; // build local/dev, sem update aplicado

  const idAnterior = await AsyncStorage.getItem(KEY);
  await AsyncStorage.setItem(KEY, idAtual);

  return idAnterior !== null && idAnterior !== idAtual;
}
