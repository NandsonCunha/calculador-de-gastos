import * as Crypto from "expo-crypto";

import { getDb } from "./db";

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O, 1/I/L (evita confusão)

function normalizeCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatarCodigo(codigo: string): string {
  return `${codigo.slice(0, 4)}-${codigo.slice(4, 8)}`;
}

export function gerarCodigoRecuperacao(): string {
  let bruto = "";
  for (let i = 0; i < 8; i++) {
    bruto += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return formatarCodigo(bruto);
}

async function hash(texto: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, texto);
}

export async function hasAccount(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM usuario");
  return (row?.count ?? 0) > 0;
}

export async function createAccount(
  username: string,
  senha: string,
  codigoRecuperacao: string
): Promise<void> {
  const db = await getDb();
  const senha_hash = await hash(senha);
  const codigo_hash = await hash(normalizeCodigo(codigoRecuperacao));
  await db.runAsync(
    "INSERT INTO usuario (id, username, senha_hash, codigo_recuperacao_hash) VALUES (1, ?, ?, ?)",
    [username.trim(), senha_hash, codigo_hash]
  );
}

export async function login(username: string, senha: string): Promise<boolean> {
  const db = await getDb();
  const senha_hash = await hash(senha);
  const row = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM usuario WHERE username = ? AND senha_hash = ?",
    [username.trim(), senha_hash]
  );
  return !!row;
}

export async function getUsuarioAtual(): Promise<{ username: string } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ username: string }>("SELECT username FROM usuario WHERE id = 1");
  return row ?? null;
}

export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<boolean> {
  const db = await getDb();
  const senhaAtualHash = await hash(senhaAtual);
  const row = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM usuario WHERE id = 1 AND senha_hash = ?",
    [senhaAtualHash]
  );
  if (!row) return false;

  const novaHash = await hash(novaSenha);
  await db.runAsync("UPDATE usuario SET senha_hash = ? WHERE id = 1", [novaHash]);
  return true;
}

export async function temCodigoRecuperacao(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ codigo_recuperacao_hash: string | null }>(
    "SELECT codigo_recuperacao_hash FROM usuario WHERE id = 1"
  );
  return !!row?.codigo_recuperacao_hash;
}

// gera (ou troca) o código de recuperação de quem já está logado; exige a senha atual
export async function gerarNovoCodigoRecuperacao(senhaAtual: string): Promise<string | null> {
  const db = await getDb();
  const senhaAtualHash = await hash(senhaAtual);
  const row = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM usuario WHERE id = 1 AND senha_hash = ?",
    [senhaAtualHash]
  );
  if (!row) return null;

  const codigo = gerarCodigoRecuperacao();
  const codigo_hash = await hash(normalizeCodigo(codigo));
  await db.runAsync("UPDATE usuario SET codigo_recuperacao_hash = ? WHERE id = 1", [codigo_hash]);
  return codigo;
}

export async function redefinirSenhaComCodigo(
  username: string,
  codigoRecuperacao: string,
  novaSenha: string
): Promise<boolean> {
  const db = await getDb();
  const codigo_hash = await hash(normalizeCodigo(codigoRecuperacao));
  const row = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM usuario WHERE username = ? AND codigo_recuperacao_hash = ?",
    [username.trim(), codigo_hash]
  );
  if (!row) return false;

  const senha_hash = await hash(novaSenha);
  await db.runAsync("UPDATE usuario SET senha_hash = ? WHERE id = 1", [senha_hash]);
  return true;
}
