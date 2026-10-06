// Endereços dos arquivos públicos que o próprio site de resultados do TSE consome.
// Formato verificado em 06/10/2026 contra resultados.tse.jus.br/oficial/ele2026.

export const TSE_BASE = "https://resultados.tse.jus.br/oficial";
export const CICLO = "ele2026";

export const ELEICOES = {
  federal: { 1: "6257", 2: "6258" },
  estadual: { 1: "6259", 2: "6260" },
} as const;

export type Turno = 1 | 2;

export const CARGOS = {
  presidente: { codigo: 1, nome: "Presidente", eleicao: "federal" },
  governador: { codigo: 3, nome: "Governador", eleicao: "estadual" },
  senador: { codigo: 5, nome: "Senador", eleicao: "estadual" },
  depFederal: { codigo: 6, nome: "Deputado Federal", eleicao: "estadual" },
  depEstadual: { codigo: 7, nome: "Deputado Estadual", eleicao: "estadual" },
  depDistrital: { codigo: 8, nome: "Deputado Distrital", eleicao: "estadual" },
} as const;

export type CargoId = keyof typeof CARGOS;

export function codigoEleicao(cargo: CargoId, turno: Turno): string {
  return ELEICOES[CARGOS[cargo].eleicao][turno];
}

const pad = (v: string | number, n: number) => String(v).padStart(n, "0");

/** Abrangência em minúsculas: "br", uma UF ("sp") ou "zz" (exterior). */
export function urlResultado(opts: {
  cargo: CargoId;
  turno: Turno;
  abrangencia: string;
  /** Código TSE do município (5 dígitos). Sem ele, o arquivo é o agregado da abrangência. */
  municipio?: string;
}): string {
  const ele = codigoEleicao(opts.cargo, opts.turno);
  const uf = opts.abrangencia.toLowerCase();
  const local = opts.municipio ? `${uf}${pad(opts.municipio, 5)}` : uf;
  return `${TSE_BASE}/${CICLO}/${ele}/dados/${uf}/${local}-c${pad(CARGOS[opts.cargo].codigo, 4)}-e${pad(ele, 6)}-u.json`;
}

/** Andamento da totalização de todos os municípios de uma UF (seções, comparecimento). */
export function urlAndamento(eleicao: string, uf: string): string {
  const u = uf.toLowerCase();
  return `${TSE_BASE}/${CICLO}/${eleicao}/dados/${u}/${u}-e${pad(eleicao, 6)}-ab.json`;
}

/** Lista de municípios com código TSE ↔ IBGE. */
export function urlMunicipios(eleicao: string): string {
  return `${TSE_BASE}/${CICLO}/${eleicao}/config/mun-e${pad(eleicao, 6)}-cm.json`;
}

export function urlFoto(cargo: CargoId, turno: Turno, uf: string, sqcand: string): string {
  const ele = codigoEleicao(cargo, turno);
  const pasta = cargo === "presidente" ? "br" : uf.toLowerCase();
  return `${TSE_BASE}/${CICLO}/${ele}/fotos/${pasta}/${sqcand}.jpeg`;
}

export const URL_CONFIG_ELEICOES = `${TSE_BASE}/comum/config/ele-c.json`;
