export type RegiaoId = "N" | "NE" | "CO" | "SE" | "S";

export const REGIOES: Record<RegiaoId, string> = {
  N: "Norte",
  NE: "Nordeste",
  CO: "Centro-Oeste",
  SE: "Sudeste",
  S: "Sul",
};

export interface UfInfo {
  sigla: string;
  nome: string;
  regiao: RegiaoId;
  /** Código IBGE da UF (2 dígitos), usado para casar com as malhas. */
  ibge: string;
}

export const UFS: UfInfo[] = [
  { sigla: "AC", nome: "Acre", regiao: "N", ibge: "12" },
  { sigla: "AL", nome: "Alagoas", regiao: "NE", ibge: "27" },
  { sigla: "AM", nome: "Amazonas", regiao: "N", ibge: "13" },
  { sigla: "AP", nome: "Amapá", regiao: "N", ibge: "16" },
  { sigla: "BA", nome: "Bahia", regiao: "NE", ibge: "29" },
  { sigla: "CE", nome: "Ceará", regiao: "NE", ibge: "23" },
  { sigla: "DF", nome: "Distrito Federal", regiao: "CO", ibge: "53" },
  { sigla: "ES", nome: "Espírito Santo", regiao: "SE", ibge: "32" },
  { sigla: "GO", nome: "Goiás", regiao: "CO", ibge: "52" },
  { sigla: "MA", nome: "Maranhão", regiao: "NE", ibge: "21" },
  { sigla: "MG", nome: "Minas Gerais", regiao: "SE", ibge: "31" },
  { sigla: "MS", nome: "Mato Grosso do Sul", regiao: "CO", ibge: "50" },
  { sigla: "MT", nome: "Mato Grosso", regiao: "CO", ibge: "51" },
  { sigla: "PA", nome: "Pará", regiao: "N", ibge: "15" },
  { sigla: "PB", nome: "Paraíba", regiao: "NE", ibge: "25" },
  { sigla: "PE", nome: "Pernambuco", regiao: "NE", ibge: "26" },
  { sigla: "PI", nome: "Piauí", regiao: "NE", ibge: "22" },
  { sigla: "PR", nome: "Paraná", regiao: "S", ibge: "41" },
  { sigla: "RJ", nome: "Rio de Janeiro", regiao: "SE", ibge: "33" },
  { sigla: "RN", nome: "Rio Grande do Norte", regiao: "NE", ibge: "24" },
  { sigla: "RO", nome: "Rondônia", regiao: "N", ibge: "11" },
  { sigla: "RR", nome: "Roraima", regiao: "N", ibge: "14" },
  { sigla: "RS", nome: "Rio Grande do Sul", regiao: "S", ibge: "43" },
  { sigla: "SC", nome: "Santa Catarina", regiao: "S", ibge: "42" },
  { sigla: "SE", nome: "Sergipe", regiao: "NE", ibge: "28" },
  { sigla: "SP", nome: "São Paulo", regiao: "SE", ibge: "35" },
  { sigla: "TO", nome: "Tocantins", regiao: "N", ibge: "17" },
];

export const UF_POR_SIGLA: Record<string, UfInfo> = Object.fromEntries(UFS.map((u) => [u.sigla, u]));
export const UF_POR_IBGE: Record<string, UfInfo> = Object.fromEntries(UFS.map((u) => [u.ibge, u]));

export function isUf(sigla: string): boolean {
  return sigla.toUpperCase() in UF_POR_SIGLA;
}
