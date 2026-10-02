import { getDb } from "./db";
import { toIso } from "./dateUtils";
import type { Assinatura } from "./types";

function diasNoMes(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function createAssinatura(
  nome: string,
  valor: number,
  categoria: string,
  dataPrimeiraCobranca: string
): Promise<void> {
  const db = await getDb();
  const dia = Number(dataPrimeiraCobranca.slice(8, 10));

  const cur = await db.runAsync(
    "INSERT INTO assinaturas (nome, valor, categoria, dia_mes, criada_em, ativa) VALUES (?, ?, ?, ?, ?, 1)",
    [nome.trim(), valor, categoria, dia, dataPrimeiraCobranca]
  );
  const assinaturaId = cur.lastInsertRowId;

  await db.runAsync(
    "INSERT INTO gastos (data, valor, categoria, nome, assinatura_id) VALUES (?, ?, ?, ?, ?)",
    [dataPrimeiraCobranca, valor, categoria, nome.trim(), assinaturaId]
  );
}

export async function cancelarAssinatura(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE assinaturas SET ativa = 0, cancelada_em = ? WHERE id = ?", [
    toIso(new Date()),
    id,
  ]);
}

export async function listarAssinaturasAtivas(): Promise<Assinatura[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    nome: string;
    valor: number;
    categoria: string;
    dia_mes: number;
    ativa: number;
  }>("SELECT id, nome, valor, categoria, dia_mes, ativa FROM assinaturas WHERE ativa = 1 ORDER BY nome");
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    valor: r.valor,
    categoria: r.categoria,
    diaMes: r.dia_mes,
    ativa: !!r.ativa,
  }));
}

// Gera os lançamentos dos meses que já passaram desde a criação de cada assinatura ativa.
// Roda toda vez que o app abre; ignora meses que já têm o lançamento gerado.
export async function gerarLancamentosPendentes(): Promise<void> {
  const db = await getDb();
  const assinaturas = await db.getAllAsync<{
    id: number;
    valor: number;
    categoria: string;
    nome: string;
    dia_mes: number;
    criada_em: string;
  }>("SELECT id, valor, categoria, nome, dia_mes, criada_em FROM assinaturas WHERE ativa = 1");

  if (assinaturas.length === 0) return;

  const hoje = new Date();

  await db.withTransactionAsync(async () => {
    for (const a of assinaturas) {
      let ano = Number(a.criada_em.slice(0, 4));
      let mes = Number(a.criada_em.slice(5, 7));

      // avança pro mês seguinte ao da criação (esse já foi lançado na hora de criar)
      mes += 1;
      if (mes > 12) {
        mes = 1;
        ano += 1;
      }

      while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth() + 1)) {
        const dia = Math.min(a.dia_mes, diasNoMes(ano, mes));
        const dataAlvo = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

        const existente = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM gastos WHERE assinatura_id = ? AND data = ?",
          [a.id, dataAlvo]
        );

        if (!existente) {
          await db.runAsync(
            "INSERT INTO gastos (data, valor, categoria, nome, assinatura_id) VALUES (?, ?, ?, ?, ?)",
            [dataAlvo, a.valor, a.categoria, a.nome, a.id]
          );
        }

        mes += 1;
        if (mes > 12) {
          mes = 1;
          ano += 1;
        }
      }
    }
  });
}
