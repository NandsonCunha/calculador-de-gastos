// Extrai só os dígitos de um texto (usado a cada mudança do input mascarado)
export function onlyDigits(text: string): string {
  return text.replace(/\D/g, "");
}

// "" | "1" | "12" | "120" -> 0 | 0.01 | 0.12 | 1.20
export function digitsToValue(digits: string): number {
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

// 0 -> "00,00" | 0.01 -> "00,01" | 0.12 -> "00,12" | 1.2 -> "01,20"
export function digitsToDisplay(digits: string): string {
  const cents = digits ? parseInt(digits, 10) : 0;
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const reaisStr = reais.toLocaleString("pt-BR").padStart(2, "0");
  return `${reaisStr},${String(centavos).padStart(2, "0")}`;
}
