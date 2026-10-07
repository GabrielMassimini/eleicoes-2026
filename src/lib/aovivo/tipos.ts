import type { Totais } from "@/lib/tse/normalize";

// Formato que as rotas /api/ao-vivo devolvem ao navegador.

export interface CandidatoAoVivo {
  sq: string;
  nome: string;
  partido: string;
  votos: number;
  pct: number;
  eleito: boolean;
}

export interface DisputaAoVivo {
  /** "br" ou sigla da UF em minúsculas. */
  abrangencia: string;
  atualizadoEm: string;
  finalizado: boolean;
  /** Vantagem do líder já supera o eleitorado ainda não totalizado. */
  definido: boolean;
  totais: Totais;
  candidatos: CandidatoAoVivo[];
}

export interface PainelAoVivo {
  /**
   * oficial: dados do TSE do 2º turno. aguardando: TSE ainda não publicou (antes das 17h de 25/10).
   * simulacao: ensaio com os números do 1º turno e totalização simulada.
   */
  modo: "oficial" | "aguardando" | "simulacao";
  geradoEm: string;
  /** Algum arquivo veio do último snapshot bom porque o TSE falhou agora. */
  atrasado: boolean;
  presidente: DisputaAoVivo | null;
  /** Presidente por UF (sigla minúscula), para o mapa. */
  presidentePorUf: Record<string, DisputaAoVivo>;
  governadores: DisputaAoVivo[];
}

export interface MunicipiosAoVivo {
  uf: string;
  modo: PainelAoVivo["modo"];
  atualizadoEm: string;
  /** sq dos finalistas, na ordem de `v`. */
  candidatos: string[];
  /** Chave: código IBGE. */
  municipios: Record<string, { nome: string; href: string; validos: number; v: number[]; pctTotalizado: number }>;
}

export interface FinalistasIniciais {
  presidente: { sq: string; nome: string; partido: string }[];
  governadores: { uf: string; candidatos: { sq: string; nome: string; partido: string }[] }[];
}
