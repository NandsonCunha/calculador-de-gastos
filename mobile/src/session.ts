import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sessao_ativa";

export async function setSessionActive(username: string): Promise<void> {
  await AsyncStorage.setItem(KEY, username);
}

export async function getSessionActive(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
