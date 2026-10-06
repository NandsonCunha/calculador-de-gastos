import * as SQLite from "expo-sqlite";

import { CATEGORIAS_PADRAO, COR_SEM_CATEGORIA, PALETA_NOVAS_CATEGORIAS, SEM_CATEGORIA } from "./categorias";
import { MONTH_NAMES, WEEKDAY_LABELS, WEEKDAY_SHORT, monthBounds, toIso, weekStart, addDays } from "./dateUtils";
import type { Dashboard, MesResumo, SemanaResumo } from "./types";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("gastos.db");
  }
  return dbPromise;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      valor REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gastos_data ON gastos(data);
    CREATE TABLE IF NOT EXISTS usuario (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      senha_hash TEXT NOT NULL,
      codigo_recuperacao_hash TEXT
    );
    CREATE TABLE IF NOT EXISTS assinaturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor REAL NOT NULL,
      categoria TEXT NOT NULL,
      dia_mes INTEGER NOT NULL,
      criada_em TEXT NOT NULL,
      cancelada_em TEXT,
      ativa INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      cor TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS perfil (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      salario REAL NOT NULL DEFAULT 0,
      salario_oculto INTEGER NOT NULL DEFAULT 0
    );
  `);

  const cols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(gastos)");
  if (!cols.some((c) => c.name === "categoria")) {
    await db.execAsync(
      `ALTER TABLE gastos ADD COLUMN categoria TEXT NOT NULL DEFAULT '${SEM_CATEGORIA}'`
    );
  }
  if (!cols.some((c) => c.name === "nome")) {
    await db.execAsync("ALTER TABLE gastos ADD COLUMN nome TEXT");
  }
  if (!cols.some((c) => c.name === "assinatura_id")) {
    await db.execAsync("ALTER TABLE gastos ADD COLUMN assinatura_id INTEGER");
  }

  const perfilCols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(perfil)");
  if (!perfilCols.some((c) => c.name === "limite_diario")) {
    await db.execAsync("ALTER TABLE perfil ADD COLUMN limite_diario REAL NOT NULL DEFAULT 0");
  }

  const usuarioCols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(usuario)");
  if (usuarioCols.length > 0 && !usuarioCols.some((c) => c.name === "codigo_recuperacao_hash")) {
    // migra do esquema antigo (pergunta secreta) pro novo (código de recuperação)
    await db.withTransactionAsync(async () => {
      await db.execAsync("ALTER TABLE usuario RENAME TO usuario_old");
      await db.execAsync(`
        CREATE TABLE usuario (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          username TEXT NOT NULL,
          senha_hash TEXT NOT NULL,
          codigo_recuperacao_hash TEXT
        )
      `);
      await db.execAsync(
        "INSERT INTO usuario (id, username, senha_hash) SELECT id, username, senha_hash FROM usuario_old"
      );
      await db.execAsync("DROP TABLE usuario_old");
    });
  }

  const catRow = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM categorias");
  if (catRow && catRow.count === 0) {
    await db.withTransactionAsync(async () => {
      for (const c of CATEGORIAS_PADRAO) {
        await db.runAsync("INSERT OR IGNORE INTO categorias (nome, cor) VALUES (?, ?)", [c.nome, c.cor]);
      }
    });
  } else {
    // sincroniza a cor das categorias padrão (caso a paleta tenha mudado numa atualização)
    await db.withTransactionAsync(async () => {
      for (const c of CATEGORIAS_PADRAO) {
        await db.runAsync("UPDATE categorias SET cor = ? WHERE nome = ?", [c.cor, c.nome]);
      }
    });
  }

  await db.runAsync("INSERT OR IGNORE INTO perfil (id, salario, salario_oculto) VALUES (1, 0, 0)");
}

export async function listarCategorias(): Promise<{ id: number; nome: string; cor: string }[]> {
  const db = await getDb();
  return db.getAllAsync<{ id: number; nome: string; cor: string }>(
    "SELECT id, nome, cor FROM categorias ORDER BY id"
  );
}

export async function renomearCategoria(id: number, nomeAtual: string, novoNome: string): Promise<void> {
  const nomeLimpo = novoNome.trim();
  if (!nomeLimpo) throw new Error("Nome da categoria não pode ser vazio");

  const db = await getDb();
  const jaExiste = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM categorias WHERE nome = ? COLLATE NOCASE AND id != ?",
    [nomeLimpo, id]
  );
  if (jaExiste) throw new Error("Já existe uma categoria com esse nome");

  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE categorias SET nome = ? WHERE id = ?", [nomeLimpo, id]);
    await db.runAsync("UPDATE gastos SET categoria = ? WHERE categoria = ?", [nomeLimpo, nomeAtual]);
    await db.runAsync("UPDATE assinaturas SET categoria = ? WHERE categoria = ?", [nomeLimpo, nomeAtual]);
  });
}

export async function excluirCategoria(id: number, nome: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE gastos SET categoria = ? WHERE categoria = ?", [SEM_CATEGORIA, nome]);
    await db.runAsync("UPDATE assinaturas SET categoria = ? WHERE categoria = ?", [SEM_CATEGORIA, nome]);
    await db.runAsync("DELETE FROM categorias WHERE id = ?", [id]);
  });
}

export async function criarCategoria(nome: string): Promise<void> {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error("Nome da categoria não pode ser vazio");

  const db = await getDb();
  const jaExiste = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM categorias WHERE nome = ? COLLATE NOCASE",
    [nomeLimpo]
  );
  if (jaExiste) throw new Error("Já existe uma categoria com esse nome");

  const existentes = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM categorias");
  const cor = PALETA_NOVAS_CATEGORIAS[(existentes?.count ?? 0) % PALETA_NOVAS_CATEGORIAS.length];

  await db.runAsync("INSERT INTO categorias (nome, cor) VALUES (?, ?)", [nomeLimpo, cor]);
}

export async function getPerfil(): Promise<{
  salario: number;
  salarioOculto: boolean;
  limiteDiario: number;
}> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ salario: number; salario_oculto: number; limite_diario: number }>(
    "SELECT salario, salario_oculto, limite_diario FROM perfil WHERE id = 1"
  );
  return {
    salario: row?.salario ?? 0,
    salarioOculto: !!row?.salario_oculto,
    limiteDiario: row?.limite_diario ?? 0,
  };
}

export async function salvarSalario(valor: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE perfil SET salario = ? WHERE id = 1", [valor]);
}

export async function setSalarioOculto(oculto: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE perfil SET salario_oculto = ? WHERE id = 1", [oculto ? 1 : 0]);
}

export async function salvarLimiteDiario(valor: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE perfil SET limite_diario = ? WHERE id = 1", [valor]);
}

export async function getTotalDia(data: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(valor), 0) as total FROM gastos WHERE data = ?",
    [data]
  );
  return row?.total ?? 0;
}

export type FiltroBusca = { categoria?: string; texto?: string };

function clausulaFiltro(filtro?: FiltroBusca): { sql: string; params: string[] } {
  const partes: string[] = [];
  const params: string[] = [];
  if (filtro?.categoria) {
    partes.push("categoria = ?");
    params.push(filtro.categoria);
  }
  if (filtro?.texto) {
    partes.push("(LOWER(COALESCE(nome, '')) LIKE ? OR LOWER(categoria) LIKE ?)");
    const busca = `%${filtro.texto.toLowerCase()}%`;
    params.push(busca, busca);
  }
  return { sql: partes.length ? " AND " + partes.join(" AND ") : "", params };
}

async function getTotals(dateFrom: string, dateTo: string, filtro?: FiltroBusca): Promise<Record<string, number>> {
  const db = await getDb();
  const { sql, params } = clausulaFiltro(filtro);
  const rows = await db.getAllAsync<{ data: string; total: number }>(
    `SELECT data, SUM(valor) as total FROM gastos WHERE data BETWEEN ? AND ?${sql} GROUP BY data`,
    [dateFrom, dateTo, ...params]
  );
  const map: Record<string, number> = {};
  for (const r of rows) map[r.data] = r.total;
  return map;
}

async function getEntries(dateFrom: string, dateTo: string, filtro?: FiltroBusca) {
  const db = await getDb();
  const { sql, params } = clausulaFiltro(filtro);
  const rows = await db.getAllAsync<{
    id: number;
    data: string;
    valor: number;
    categoria: string;
    nome: string | null;
    assinatura_id: number | null;
  }>(
    `SELECT id, data, valor, categoria, nome, assinatura_id FROM gastos WHERE data BETWEEN ? AND ?${sql} ORDER BY id`,
    [dateFrom, dateTo, ...params]
  );
  const map: Record<
    string,
    { id: number; valor: number; categoria: string; nome: string | null; assinaturaId: number | null }[]
  > = {};
  for (const r of rows) {
    if (!map[r.data]) map[r.data] = [];
    map[r.data].push({
      id: r.id,
      valor: r.valor,
      categoria: r.categoria,
      nome: r.nome,
      assinaturaId: r.assinatura_id,
    });
  }
  return map;
}

async function getTotaisPorCategoria(
  dateFrom: string,
  dateTo: string,
  filtro?: FiltroBusca
): Promise<{ categoria: string; total: number; cor: string }[]> {
  const db = await getDb();
  const { sql, params } = clausulaFiltro(filtro);
  const rows = await db.getAllAsync<{ categoria: string; total: number; cor: string | null }>(
    `SELECT g.categoria as categoria, SUM(g.valor) as total, c.cor as cor
     FROM gastos g
     LEFT JOIN categorias c ON c.nome = g.categoria
     WHERE g.data BETWEEN ? AND ?${sql}
     GROUP BY g.categoria
     ORDER BY total DESC`,
    [dateFrom, dateTo, ...params]
  );
  return rows.map((r) => ({ categoria: r.categoria, total: r.total, cor: r.cor ?? COR_SEM_CATEGORIA }));
}

async function sumRange(dateFrom: string, dateTo: string, filtro?: FiltroBusca): Promise<number> {
  const db = await getDb();
  const { sql, params } = clausulaFiltro(filtro);
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(valor), 0) as total FROM gastos WHERE data BETWEEN ? AND ?${sql}`,
    [dateFrom, dateTo, ...params]
  );
  return row?.total ?? 0;
}

export async function addGasto(
  data: string,
  valor: number,
  categoria: string,
  opcoes?: { nome?: string; assinaturaId?: number }
): Promise<void> {
  if (valor <= 0) throw new Error("Valor deve ser maior que zero");
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO gastos (data, valor, categoria, nome, assinatura_id) VALUES (?, ?, ?, ?, ?)",
    [data, valor, categoria, opcoes?.nome ?? null, opcoes?.assinaturaId ?? null]
  );
}

export async function deleteGasto(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM gastos WHERE id = ?", [id]);
}

export async function updateCategoria(id: number, categoria: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE gastos SET categoria = ? WHERE id = ?", [categoria, id]);
}

export async function getGasto(id: number): Promise<{
  id: number;
  data: string;
  valor: number;
  categoria: string;
  nome: string | null;
  assinaturaId: number | null;
} | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: number;
    data: string;
    valor: number;
    categoria: string;
    nome: string | null;
    assinatura_id: number | null;
  }>("SELECT id, data, valor, categoria, nome, assinatura_id FROM gastos WHERE id = ?", [id]);
  if (!row) return null;
  return {
    id: row.id,
    data: row.data,
    valor: row.valor,
    categoria: row.categoria,
    nome: row.nome,
    assinaturaId: row.assinatura_id,
  };
}

export async function editarLancamento(
  id: number,
  dados: { valor: number; categoria: string; data: string }
): Promise<void> {
  if (dados.valor <= 0) throw new Error("Valor deve ser maior que zero");
  const db = await getDb();
  await db.runAsync("UPDATE gastos SET valor = ?, categoria = ?, data = ? WHERE id = ?", [
    dados.valor,
    dados.categoria,
    dados.data,
    id,
  ]);
}

export async function getEntriesForDay(data: string): Promise<
  { id: number; valor: number; categoria: string; nome: string | null; assinatura_id: number | null }[]
> {
  const db = await getDb();
  return db.getAllAsync<{
    id: number;
    valor: number;
    categoria: string;
    nome: string | null;
    assinatura_id: number | null;
  }>("SELECT id, valor, categoria, nome, assinatura_id FROM gastos WHERE data = ? ORDER BY id", [data]);
}

export async function getTodosGastos(): Promise<
  { data: string; valor: number; categoria: string; nome: string | null; assinaturaId: number | null }[]
> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    data: string;
    valor: number;
    categoria: string;
    nome: string | null;
    assinatura_id: number | null;
  }>("SELECT data, valor, categoria, nome, assinatura_id FROM gastos ORDER BY data, id");
  return rows.map((r) => ({
    data: r.data,
    valor: r.valor,
    categoria: r.categoria,
    nome: r.nome,
    assinaturaId: r.assinatura_id,
  }));
}

export async function getWeek(offset: number, filtro?: FiltroBusca): Promise<SemanaResumo> {
  const today = new Date();
  const start = addDays(weekStart(today), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const dateStrs = days.map(toIso);
  const entries = await getEntries(dateStrs[0], dateStrs[6], filtro);

  let total = 0;
  const dias = days.map((d, i) => {
    const iso = toIso(d);
    const lancamentos = entries[iso] ?? [];
    const dayTotal = lancamentos.reduce((s, e) => s + e.valor, 0);
    total += dayTotal;
    return {
      data: iso,
      dia: d.getDate(),
      weekday: WEEKDAY_LABELS[i],
      lancamentos,
      total: dayTotal,
      hoje: isSameDayLocal(d, today),
    };
  });

  return { start: dateStrs[0], end: dateStrs[6], dias, total };
}

function isSameDayLocal(a: Date, b: Date) {
  return toIso(a) === toIso(b);
}

export async function getMonth(year: number, month: number, filtro?: FiltroBusca): Promise<MesResumo> {
  const today = new Date();
  const [firstDay, lastDay] = monthBounds(year, month);
  const gridStart = weekStart(firstDay);
  const gridEnd = addDays(weekStart(lastDay), 6);

  const nWeeks = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000 + 1) / 7;
  const totals = await getTotals(toIso(gridStart), toIso(gridEnd), filtro);

  const weeks: MesResumo["weeks"] = [];
  let cursor = gridStart;
  for (let w = 0; w < nWeeks; w++) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const iso = toIso(cursor);
      week.push({
        data: iso,
        dia: cursor.getDate(),
        weekday: WEEKDAY_SHORT[i],
        valor: totals[iso] ?? 0,
        hoje: isSameDayLocal(cursor, today),
        noMes: cursor.getMonth() === month - 1,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  const monthTotal = await sumRange(toIso(firstDay), toIso(lastDay), filtro);

  return {
    year,
    month,
    monthName: MONTH_NAMES[month - 1],
    weeks,
    total: monthTotal,
  };
}

export async function getDashboard(
  ano?: number,
  mes?: number,
  categoria?: string
): Promise<Dashboard> {
  const today = new Date();
  const selYear = ano ?? today.getFullYear();
  const selMonth = mes ?? today.getMonth() + 1;
  const ehMesAtual = selYear === today.getFullYear() && selMonth === today.getMonth() + 1;
  const filtro: FiltroBusca | undefined = categoria ? { categoria } : undefined;

  let weekTotal = 0;
  if (ehMesAtual) {
    const start = weekStart(today);
    weekTotal = await sumRange(toIso(start), toIso(addDays(start, 6)), filtro);
  }

  const [firstDay, lastDay] = monthBounds(selYear, selMonth);
  const monthTotal = await sumRange(toIso(firstDay), toIso(lastDay), filtro);

  const diasNoMes = Math.round((lastDay.getTime() - firstDay.getTime()) / 86400000) + 1;
  const daysElapsed = ehMesAtual
    ? Math.round((today.getTime() - firstDay.getTime()) / 86400000) + 1
    : diasNoMes;
  const avgPerDay = daysElapsed > 0 ? monthTotal / daysElapsed : 0;

  const meses: Dashboard["meses"] = [];
  for (let i = 5; i >= 0; i--) {
    let mm = selMonth - i;
    let yy = selYear;
    while (mm < 1) {
      mm += 12;
      yy -= 1;
    }
    const [f, l] = monthBounds(yy, mm);
    const total = await sumRange(toIso(f), toIso(l), filtro);
    meses.push({ year: yy, month: mm, label: MONTH_NAMES[mm - 1].slice(0, 3), total, projetado: 0 });
  }

  const diasRestantes = ehMesAtual ? Math.max(diasNoMes - daysElapsed, 0) : 0;
  const projecaoResto = ehMesAtual ? avgPerDay * diasRestantes : 0;
  const projecaoMes = ehMesAtual ? monthTotal + projecaoResto : monthTotal;
  if (ehMesAtual) meses[meses.length - 1].projetado = projecaoResto;

  const mesAtualTotal = meses[meses.length - 1].total;
  const mesAnteriorTotal = meses.length > 1 ? meses[meses.length - 2].total : 0;
  const variacaoPct = mesAnteriorTotal > 0 ? ((mesAtualTotal - mesAnteriorTotal) / mesAnteriorTotal) * 100 : null;

  const totalsMes = await getTotals(toIso(firstDay), toIso(lastDay), filtro);
  let maiorDia: Dashboard["maiorDia"] = null;
  const entriesArr = Object.entries(totalsMes);
  if (entriesArr.length > 0) {
    const [dataMax, valorMax] = entriesArr.reduce((a, b) => (b[1] > a[1] ? b : a));
    maiorDia = { data: dataMax, valor: valorMax };
  }

  const categoriasRaw = await getTotaisPorCategoria(toIso(firstDay), toIso(lastDay), filtro);
  const categorias: Dashboard["categorias"] = categoriasRaw.map((c) => ({
    categoria: c.categoria,
    total: c.total,
    pct: monthTotal > 0 ? (c.total / monthTotal) * 100 : 0,
    cor: c.cor,
  }));

  const perfil = await getPerfil();

  return {
    hoje: toIso(today),
    ehMesAtual,
    semanaTotal: weekTotal,
    mesTotal: monthTotal,
    mesAnteriorTotal,
    variacaoPct,
    mediaDia: avgPerDay,
    maiorDia,
    diasRestantes,
    projecaoResto,
    projecaoMes,
    meses,
    categorias,
    salario: perfil.salario,
    salarioOculto: perfil.salarioOculto,
  };
}
