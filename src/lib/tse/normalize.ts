import { AndamentoBrutoSchema, ResultadoBrutoSchema } from "./schema";

// Modelo enxuto usado pelo app inteiro (páginas estáticas, scripts e rotas ao vivo).

export interface Vice {
  tipo: "vice" | "suplente1" | "suplente2" | string;
  sq: string;
  nome: string;
  partido?: string;
}

export interface Candidato {
  numero: string;
  sq: string;
  nome: string;
  nomeCompleto: string;
  partido: string;
  /** Coligação/federação/partido isolado pela qual concorreu (sigla composta, ex.: "PT/PC do B/PV"). */
  agremiacao: string;
  votos: number;
  /** Percentual dos votos válidos, 0–100. */
  pct: number;
  /** Situação exatamente como o TSE publica ("Eleito", "2º turno", "Suplente"...). */
  situacao: string;
  eleito: boolean;
  segundoTurno: boolean;
  nascimento?: string;
  vices: Vice[];
}

export interface Totais {
  secoes: number;
  secoesTotalizadas: number;
  /** % de seções totalizadas, 0–100. */
  pctTotalizado: number;
  eleitorado: number;
  /** Eleitorado das seções já totalizadas. */
  eleitoradoTotalizado: number;
  comparecimento: number;
  pctComparecimento: number;
  abstencao: number;
  pctAbstencao: number;
  validos: number;
  brancos: number;
  pctBrancos: number;
  nulos: number;
  pctNulos: number;
}

export interface Agremiacao {
  nome: string;
  sigla: string;
  tipo: "isolado" | "federacao" | "coligacao" | string;
  vagas: number;
  votosNominais: number;
  votosLegenda: number;
  partidos: string[];
}

export interface Resultado {
  eleicao: string;
  turno: 1 | 2;
  cargo: { codigo: number; nome: string; vagas: number; quociente?: number };
  abrangencia: { tipo: string; codigo: string };
  /** ISO 8601 no fuso de Brasília. */
  atualizadoEm: string;
  finalizado: boolean;
  totais: Totais;
  /** Ordenados por votos, do maior para o menor. */
  candidatos: Candidato[];
  agremiacoes: Agremiacao[];
}

export function toInt(v: string | undefined): number {
  if (!v) return 0;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export function toFloat(v: string | undefined): number {
  if (!v) return 0;
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** "05/10/2026" + "12:51:47" -> "2026-10-05T12:51:47-03:00" */
export function toIsoBrasilia(data: string, hora: string): string {
  const [d, m, a] = data.split("/");
  return `${a}-${m}-${d}T${hora || "00:00:00"}-03:00`;
}

const TIPO_VICE: Record<string, string> = { v: "vice", s1: "suplente1", s2: "suplente2" };
const TIPO_AGR: Record<string, string> = { i: "isolado", f: "federacao", c: "coligacao" };

export function isEleito(situacao: string): boolean {
  const s = situacao.toLowerCase();
  return s.includes("eleit") && !s.includes("não") && !s.includes("nao");
}

export function isSegundoTurno(situacao: string): boolean {
  return situacao.includes("2º turno") || situacao.toLowerCase().includes("2o turno");
}

export function normalizarTotais(
  s: { ts: string; st: string; pstn: string },
  e: { te: string; est: string; c: string; pcn: string; a: string; pan: string },
  v?: { vv: string; vb: string; pvbn: string; tvn: string; ptvnn: string },
): Totais {
  return {
    secoes: toInt(s.ts),
    secoesTotalizadas: toInt(s.st),
    pctTotalizado: toFloat(s.pstn),
    eleitorado: toInt(e.te),
    eleitoradoTotalizado: toInt(e.est),
    comparecimento: toInt(e.c),
    pctComparecimento: toFloat(e.pcn),
    abstencao: toInt(e.a),
    pctAbstencao: toFloat(e.pan),
    validos: toInt(v?.vv),
    brancos: toInt(v?.vb),
    pctBrancos: toFloat(v?.pvbn),
    nulos: toInt(v?.tvn),
    pctNulos: toFloat(v?.ptvnn),
  };
}

export function normalizarResultado(raw: unknown): Resultado {
  const d = ResultadoBrutoSchema.parse(raw);
  const cargo = d.carg[0];

  const candidatos: Candidato[] = [];
  const agremiacoes: Agremiacao[] = [];

  for (const agr of cargo.agr) {
    agremiacoes.push({
      nome: agr.nm,
      sigla: agr.com,
      tipo: TIPO_AGR[agr.tp] ?? agr.tp,
      vagas: toInt(agr.vag),
      // Federações trazem o total na agremiação; partidos isolados, só no partido.
      votosNominais: agr.tvtn !== undefined ? toInt(agr.tvtn) : agr.par.reduce((s, p) => s + toInt(p.tvtn), 0),
      votosLegenda: agr.tvtl !== undefined ? toInt(agr.tvtl) : agr.par.reduce((s, p) => s + toInt(p.tvtl), 0),
      partidos: agr.par.map((p) => p.sg),
    });
    for (const par of agr.par) {
      for (const c of par.cand) {
        candidatos.push({
          numero: c.n,
          sq: c.sqcand,
          nome: c.nmu,
          nomeCompleto: c.nm,
          partido: par.sg,
          agremiacao: agr.com,
          votos: toInt(c.vap),
          pct: toFloat(c.pvapn),
          situacao: c.st,
          eleito: isEleito(c.st),
          segundoTurno: isSegundoTurno(c.st),
          nascimento: c.dt || undefined,
          vices: (c.vs ?? []).map((v) => ({
            tipo: TIPO_VICE[v.tp] ?? v.tp,
            sq: v.sqcand,
            nome: v.nmu,
            partido: v.sgp,
          })),
        });
      }
    }
  }

  candidatos.sort((a, b) => b.votos - a.votos || Number(a.numero) - Number(b.numero));

  const totais = normalizarTotais(d.s, d.e, d.v);

  return {
    eleicao: d.ele,
    turno: d.t === "2" ? 2 : 1,
    cargo: {
      codigo: toInt(cargo.cd),
      nome: cargo.nmn,
      vagas: toInt(cargo.nv),
      quociente: cargo.qe ? toInt(cargo.qe) : undefined,
    },
    abrangencia: { tipo: d.tpabr, codigo: d.cdabr },
    atualizadoEm: toIsoBrasilia(d.dg, d.hg),
    finalizado: d.and === "f" || (totais.secoes > 0 && totais.secoesTotalizadas === totais.secoes),
    totais,
    candidatos,
    agremiacoes,
  };
}

export interface AndamentoMunicipio {
  codigoTse: string;
  finalizado: boolean;
  totais: Totais;
}

export interface Andamento {
  eleicao: string;
  turno: 1 | 2;
  atualizadoEm: string;
  uf?: AndamentoMunicipio;
  municipios: AndamentoMunicipio[];
}

export function normalizarAndamento(raw: unknown): Andamento {
  const d = AndamentoBrutoSchema.parse(raw);
  const itens = d.abr.map((a) => {
    const totais = normalizarTotais(a.s, a.e);
    return {
      tipo: a.tpabr,
      item: {
        codigoTse: a.cdabr,
        finalizado: a.and === "f" || (totais.secoes > 0 && totais.secoesTotalizadas === totais.secoes),
        totais,
      },
    };
  });
  return {
    eleicao: d.ele,
    turno: d.t === "2" ? 2 : 1,
    atualizadoEm: toIsoBrasilia(d.dg, d.hg),
    uf: itens.find((i) => i.tipo === "uf")?.item,
    municipios: itens.filter((i) => i.tipo === "mun").map((i) => i.item),
  };
}

/**
 * Disputa definida pela aritmética: a vantagem do líder sobre o 2º colocado é maior que o número
 * de eleitores aptos nas seções ainda não totalizadas. Não é projeção estatística.
 */
export function matematicamenteDefinido(r: Pick<Resultado, "candidatos" | "totais" | "finalizado">): boolean {
  if (r.finalizado) return true;
  const [primeiro, segundo] = r.candidatos;
  if (!primeiro || !segundo) return false;
  const restante = Math.max(0, r.totais.eleitorado - r.totais.eleitoradoTotalizado);
  return primeiro.votos - segundo.votos > restante;
}
