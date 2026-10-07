import type { CargoId, Turno } from "@/lib/tse/urls";
import type { Totais } from "@/lib/tse/normalize";

// Formatos dos arquivos gerados pelo pipeline em public/data/.

export interface Municipio {
  /** Código TSE (5 dígitos). */
  tse: string;
  /** Código IBGE (7 dígitos), chave das malhas. */
  ibge: string;
  nome: string;
  slug: string;
  uf: string;
  capital: boolean;
}

export interface CandidatoRef {
  numero: string;
  sq: string;
  nome: string;
  partido: string;
}

/** Totais por município em formato compacto (sem percentuais, que são derivados). */
export interface TotaisCompactos {
  eleitorado: number;
  comparecimento: number;
  abstencao: number;
  validos: number;
  brancos: number;
  nulos: number;
}

export interface ResultadoMunicipalUf {
  cargo: CargoId;
  turno: Turno;
  uf: string;
  atualizadoEm: string;
  /** Ordem dos candidatos; `municipios[ibge].v[i]` são os votos de `candidatos[i]`. */
  candidatos: CandidatoRef[];
  municipios: Record<string, TotaisCompactos & { v: number[] }>;
}

/** Votação de deputados num município. `v` é esparso: [índice no resultado da UF, votos], só quem teve voto. */
export interface DeputadosNoMunicipio {
  validos: number;
  /** [sigla, votos nominais, votos de legenda] por partido. */
  partidos: [string, number, number][];
  v: [number, number][];
}

/** public/data/1t/{uf}/mun/{ibge}.json */
export interface DeputadosMunicipio {
  ibge: string;
  depFederal: DeputadosNoMunicipio;
  /** Deputado estadual, ou distrital no DF. */
  depLocal: DeputadosNoMunicipio;
}

export interface PerfilCandidato {
  sq: string;
  numero: string;
  nome: string;
  nomeCompleto: string;
  cargo: CargoId;
  /** "BR" para Presidente. */
  uf: string;
  partido: string;
  partidoNome: string;
  federacao?: string;
  coligacao?: string;
  composicao?: string;
  nascimento?: string;
  ufNascimento?: string;
  genero?: string;
  corRaca?: string;
  instrucao?: string;
  estadoCivil?: string;
  ocupacao?: string;
  situacaoCandidatura?: string;
  bens: {
    total: number;
    quantidade: number;
    maiores: { tipo: string; descricao: string; valor: number }[];
  };
}

export function compactarTotais(t: Totais): TotaisCompactos {
  return {
    eleitorado: t.eleitorado,
    comparecimento: t.comparecimento,
    abstencao: t.abstencao,
    validos: t.validos,
    brancos: t.brancos,
    nulos: t.nulos,
  };
}
