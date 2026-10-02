export type Lancamento = {
  id: number;
  data: string; // YYYY-MM-DD
  valor: number;
  categoria: string;
  nome: string | null;
  assinaturaId: number | null;
};

export type Assinatura = {
  id: number;
  nome: string;
  valor: number;
  categoria: string;
  diaMes: number;
  ativa: boolean;
};

export type DiaSemana = {
  data: string;
  dia: number;
  weekday: string;
  lancamentos: Omit<Lancamento, "data">[];
  total: number;
  hoje: boolean;
};

export type SemanaResumo = {
  start: string;
  end: string;
  dias: DiaSemana[];
  total: number;
};

export type DiaMes = {
  data: string;
  dia: number;
  weekday: string;
  valor: number;
  hoje: boolean;
  noMes: boolean;
};

export type MesResumo = {
  year: number;
  month: number;
  monthName: string;
  weeks: DiaMes[][];
  total: number;
};

export type MesHistorico = {
  year: number;
  month: number;
  label: string;
  total: number;
  projetado: number;
};

export type CategoriaFatia = {
  categoria: string;
  total: number;
  pct: number;
  cor: string;
};

export type Dashboard = {
  hoje: string;
  semanaTotal: number;
  mesTotal: number;
  mesAnteriorTotal: number;
  variacaoPct: number | null;
  mediaDia: number;
  maiorDia: { data: string; valor: number } | null;
  diasRestantes: number;
  projecaoResto: number;
  projecaoMes: number;
  meses: MesHistorico[];
  categorias: CategoriaFatia[];
  salario: number;
  salarioOculto: boolean;
};
