import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { getTodosGastos } from "./db";
import { fmtDateBr } from "./dateUtils";

function escapeCsv(valor: string): string {
  if (valor.includes(";") || valor.includes('"') || valor.includes("\n")) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export async function exportarCsv(): Promise<void> {
  const gastos = await getTodosGastos();

  const linhas = [["Data", "Valor", "Categoria", "Nome", "Assinatura"]];
  for (const g of gastos) {
    linhas.push([
      fmtDateBr(g.data),
      g.valor.toFixed(2).replace(".", ","),
      g.categoria,
      g.nome ?? "",
      g.assinaturaId ? "Sim" : "Não",
    ]);
  }

  const csv = linhas.map((linha) => linha.map(escapeCsv).join(";")).join("\n");

  const nomeArquivo = `gastos_${new Date().toISOString().slice(0, 10)}.csv`;
  const uri = FileSystem.cacheDirectory + nomeArquivo;
  await FileSystem.writeAsStringAsync(uri, "﻿" + csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const disponivel = await Sharing.isAvailableAsync();
  if (!disponivel) {
    throw new Error("Compartilhamento não disponível neste dispositivo");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "text/csv",
    dialogTitle: "Exportar gastos",
    UTI: "public.comma-separated-values-text",
  });
}
