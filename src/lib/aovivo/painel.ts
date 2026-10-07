// Monta o painel do 2º turno a partir dos arquivos do TSE (ou de uma simulação baseada no 1º turno).
// Roda só no servidor, dentro das rotas /api/ao-vivo.
import { readFile } from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import type { Municipio, ResultadoMunicipalUf } from "@/lib/data/types";
import { matematicamenteDefinido, normalizarAndamento, normalizarResultado, type Resultado } from "@/lib/tse/normalize";
import { UFS } from "@/lib/tse/regioes";
import { type CargoId, codigoEleicao, urlAndamento, urlResultado } from "@/lib/tse/urls";
import type { DisputaAoVivo, MunicipiosAoVivo, PainelAoVivo } from "./tipos";

// Os arquivos que esta rota lê estão listados em next.config.ts (outputFileTracingIncludes).
// turbopackIgnore impede o bundler de incluir por conta própria os ~23 mil JSON de public/data.
const DATA = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "data");
const lerDados = async <T>(...partes: string[]): Promise<T> =>
  JSON.parse(await readFile(/* turbopackIgnore: true */ path.join(DATA, ...partes), "utf-8")) as T;

async function primeiroTurno(abrangencia: string, cargo: CargoId): Promise<Resultado> {
  return lerDados<Resultado>("1t", abrangencia, `${cargo}.json`);
}

/** UFs com governador no 2º turno, segundo o resultado final do 1º. */
export async function ufsComSegundoTurno(): Promise<string[]> {
  const todas = await Promise.all(
    UFS.map(async (u) => {
      const r = await primeiroTurno(u.sigla.toLowerCase(), "governador");
      return r.candidatos.filter((c) => c.segundoTurno).length === 2 ? u.sigla.toLowerCase() : null;
    }),
  );
  return todas.filter((u): u is string => u !== null);
}

function paraDisputa(abrangencia: string, r: Resultado): DisputaAoVivo {
  return {
    abrangencia,
    atualizadoEm: r.atualizadoEm,
    finalizado: r.finalizado,
    definido: matematicamenteDefinido(r),
    totais: r.totais,
    candidatos: r.candidatos.map((c) => ({ sq: c.sq, nome: c.nome, partido: c.partido, votos: c.votos, pct: c.pct, eleito: c.eleito })),
  };
}

// --- Dados oficiais ------------------------------------------------------------------------------

// Último resultado bom por URL, por instância da função. Se o TSE falhar ou mudar o formato,
// servimos o anterior em vez de derrubar a página.
const ultimoBom = new Map<string, Resultado>();

type Busca = { resultado: Resultado | null; atrasado: boolean; ausente: boolean };

async function buscar(url: string): Promise<Busca> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (res.status === 404 || res.status === 403) return { resultado: ultimoBom.get(url) ?? null, atrasado: false, ausente: true };
    if (!res.ok) throw new Error(`${res.status}`);
    const r = normalizarResultado(await res.json());
    ultimoBom.set(url, r);
    return { resultado: r, atrasado: false, ausente: false };
  } catch {
    const anterior = ultimoBom.get(url) ?? null;
    return { resultado: anterior, atrasado: anterior !== null, ausente: anterior === null };
  }
}

export async function painelOficial(): Promise<PainelAoVivo> {
  const ufsGov = await ufsComSegundoTurno();
  const [br, ...resto] = await Promise.all([
    buscar(urlResultado({ cargo: "presidente", turno: 2, abrangencia: "br" })),
    ...UFS.map((u) => buscar(urlResultado({ cargo: "presidente", turno: 2, abrangencia: u.sigla }))),
    ...ufsGov.map((uf) => buscar(urlResultado({ cargo: "governador", turno: 2, abrangencia: uf }))),
  ]);
  const presUf = resto.slice(0, UFS.length);
  const gov = resto.slice(UFS.length);

  const presidentePorUf: Record<string, DisputaAoVivo> = {};
  UFS.forEach((u, i) => {
    const r = presUf[i].resultado;
    if (r) presidentePorUf[u.sigla.toLowerCase()] = paraDisputa(u.sigla.toLowerCase(), r);
  });

  return {
    modo: br.resultado ? "oficial" : "aguardando",
    geradoEm: new Date().toISOString(),
    atrasado: [br, ...resto].some((b) => b.atrasado),
    presidente: br.resultado ? paraDisputa("br", br.resultado) : null,
    presidentePorUf,
    governadores: gov.flatMap((g, i) => (g.resultado ? [paraDisputa(ufsGov[i], g.resultado)] : [])),
  };
}

// --- Municípios de uma UF (Presidente) -----------------------------------------------------------

async function municipiosDaUf(uf: string): Promise<Municipio[]> {
  const todos = await lerDados<Municipio[]>("municipios.json");
  return todos.filter((m) => m.uf === uf.toUpperCase());
}

async function finalistasPresidente(): Promise<string[]> {
  const br = await primeiroTurno("br", "presidente");
  return br.candidatos.filter((c) => c.segundoTurno).map((c) => c.sq);
}

const cacheMunicipios = new Map<string, MunicipiosAoVivo>();

export async function municipiosOficial(uf: string): Promise<MunicipiosAoVivo> {
  const [muns, finalistas] = await Promise.all([municipiosDaUf(uf), finalistasPresidente()]);
  const eleicao = codigoEleicao("presidente", 2);
  const andamento = await fetch(urlAndamento(eleicao, uf), { cache: "no-store", signal: AbortSignal.timeout(8000) })
    .then(async (r) => (r.ok ? normalizarAndamento(await r.json()) : null))
    .catch(() => null);
  if (!andamento) {
    const anterior = cacheMunicipios.get(uf);
    return anterior ?? { uf, modo: "aguardando", atualizadoEm: new Date().toISOString(), candidatos: finalistas, municipios: {} };
  }
  const progresso = new Map(andamento.municipios.map((m) => [m.codigoTse, m.totais.pctTotalizado]));
  const limite = pLimit(24);
  const out: MunicipiosAoVivo = { uf, modo: "oficial", atualizadoEm: andamento.atualizadoEm, candidatos: finalistas, municipios: {} };
  await Promise.all(
    muns.map((m) =>
      limite(async () => {
        // Só busca o município se já tiver alguma seção totalizada.
        if (!progresso.get(m.tse)) return;
        const { resultado } = await buscar(urlResultado({ cargo: "presidente", turno: 2, abrangencia: uf, municipio: m.tse }));
        if (!resultado) return;
        const votos = new Map(resultado.candidatos.map((c) => [c.sq, c.votos]));
        out.municipios[m.ibge] = {
          nome: m.nome,
          href: `/estados/${uf}/${m.slug}`,
          validos: resultado.totais.validos,
          v: finalistas.map((sq) => votos.get(sq) ?? 0),
          pctTotalizado: resultado.totais.pctTotalizado,
        };
      }),
    ),
  );
  cacheMunicipios.set(uf, out);
  return out;
}

export async function municipiosSimulado(uf: string, agora = Date.now()): Promise<MunicipiosAoVivo> {
  const [muns, finalistas] = await Promise.all([municipiosDaUf(uf), finalistasPresidente()]);
  const mun = await lerDados<ResultadoMunicipalUf>("1t", uf.toLowerCase(), "municipios-presidente.json");
  const indices = finalistas.map((sq) => mun.candidatos.findIndex((c) => c.sq === sq));
  const global = (agora % CICLO_SIMULACAO_MS) / CICLO_SIMULACAO_MS;
  const out: MunicipiosAoVivo = { uf, modo: "simulacao", atualizadoEm: new Date(agora).toISOString(), candidatos: finalistas, municipios: {} };
  for (const m of muns) {
    const r = mun.municipios[m.ibge];
    if (!r) continue;
    const p = Math.min(1, global * ritmo(m.ibge) * 1.1);
    if (p <= 0.02) continue;
    const v = indices.map((i) => Math.round((r.v[i] ?? 0) * p));
    out.municipios[m.ibge] = { nome: m.nome, href: `/estados/${uf}/${m.slug}`, validos: v.reduce((s, x) => s + x, 0), v, pctTotalizado: p * 100 };
  }
  return out;
}

// --- Simulação (ensaio) --------------------------------------------------------------------------

/** Ciclo da simulação: a totalização vai de 0 a 100% em 10 minutos e recomeça. */
export const CICLO_SIMULACAO_MS = 10 * 60 * 1000;

/** Cada UF totaliza num ritmo diferente, de forma determinística. */
function ritmo(abrangencia: string): number {
  let h = 0;
  for (const ch of abrangencia) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return 0.75 + (h % 100) / 110;
}

function simular(abrangencia: string, r1: Resultado, agora: number): DisputaAoVivo {
  const finalistas = r1.candidatos.filter((c) => c.segundoTurno);
  const base = finalistas.length === 2 ? finalistas : r1.candidatos.slice(0, 2);
  const progressoGlobal = (agora % CICLO_SIMULACAO_MS) / CICLO_SIMULACAO_MS;
  const p = Math.min(1, progressoGlobal * ritmo(abrangencia));
  // Contagem começa um pouco enviesada para o 2º colocado e converge para o resultado final.
  const vies = (1 - p) * 0.06;
  const pesos = [1 - vies, 1 + vies];
  const votos = base.map((c, i) => Math.round(c.votos * p * pesos[i]));
  const validos = votos.reduce((s, v) => s + v, 0);
  const t = r1.totais;
  const fator = (n: number) => Math.round(n * p);
  const totais = {
    ...t,
    secoesTotalizadas: fator(t.secoes),
    pctTotalizado: p * 100,
    eleitoradoTotalizado: fator(t.eleitorado),
    comparecimento: fator(t.comparecimento),
    abstencao: fator(t.abstencao),
    validos,
    brancos: fator(t.brancos),
    nulos: fator(t.nulos),
  };
  const candidatos = base
    .map((c, i) => ({ sq: c.sq, nome: c.nome, partido: c.partido, votos: votos[i], pct: validos ? (votos[i] / validos) * 100 : 0, eleito: false }))
    .sort((a, b) => b.votos - a.votos);
  const finalizado = p >= 1;
  if (finalizado) candidatos[0].eleito = true;
  const restante = t.eleitorado - totais.eleitoradoTotalizado;
  return {
    abrangencia,
    atualizadoEm: new Date(agora).toISOString(),
    finalizado,
    definido: finalizado || candidatos[0].votos - candidatos[1].votos > restante,
    totais,
    candidatos,
  };
}

export async function painelSimulado(agora = Date.now()): Promise<PainelAoVivo> {
  const ufsGov = await ufsComSegundoTurno();
  const br = await primeiroTurno("br", "presidente");
  const presidentePorUf: Record<string, DisputaAoVivo> = {};
  await Promise.all(
    UFS.map(async (u) => {
      const s = u.sigla.toLowerCase();
      const r = await primeiroTurno(s, "presidente");
      // No 2º turno só existem os dois finalistas nacionais.
      const finalistas = new Set(br.candidatos.filter((c) => c.segundoTurno).map((c) => c.sq));
      const soFinalistas = { ...r, candidatos: r.candidatos.filter((c) => finalistas.has(c.sq)).map((c) => ({ ...c, segundoTurno: true })) };
      presidentePorUf[s] = simular(s, soFinalistas, agora);
    }),
  );
  // Nacional = soma das UFs simuladas (mais o exterior, que fica fora do mapa).
  const nacional = simular("br", br, agora);
  const somaUf = (sq: string) => Object.values(presidentePorUf).reduce((acc, d) => acc + (d.candidatos.find((c) => c.sq === sq)?.votos ?? 0), 0);
  nacional.candidatos = nacional.candidatos
    .map((c) => ({ ...c, votos: somaUf(c.sq) }))
    .sort((a, b) => b.votos - a.votos);
  const validos = nacional.candidatos.reduce((s, c) => s + c.votos, 0);
  nacional.candidatos.forEach((c) => (c.pct = validos ? (c.votos / validos) * 100 : 0));
  const ufs = Object.values(presidentePorUf);
  const soma = (campo: keyof DisputaAoVivo["totais"]) => ufs.reduce((s, d) => s + (d.totais[campo] as number), 0);
  nacional.totais = {
    ...nacional.totais,
    secoes: soma("secoes"),
    secoesTotalizadas: soma("secoesTotalizadas"),
    eleitorado: soma("eleitorado"),
    eleitoradoTotalizado: soma("eleitoradoTotalizado"),
    comparecimento: soma("comparecimento"),
    abstencao: soma("abstencao"),
    validos,
    brancos: soma("brancos"),
    nulos: soma("nulos"),
  };
  const t = nacional.totais;
  t.pctTotalizado = (t.secoesTotalizadas / t.secoes) * 100;
  t.pctComparecimento = t.eleitoradoTotalizado ? (t.comparecimento / t.eleitoradoTotalizado) * 100 : 0;
  t.pctAbstencao = t.eleitoradoTotalizado ? (t.abstencao / t.eleitoradoTotalizado) * 100 : 0;
  nacional.finalizado = ufs.every((d) => d.finalizado);
  nacional.candidatos.forEach((c, i) => (c.eleito = nacional.finalizado && i === 0));
  nacional.definido =
    nacional.finalizado || nacional.candidatos[0].votos - nacional.candidatos[1].votos > nacional.totais.eleitorado - nacional.totais.eleitoradoTotalizado;

  const governadores = await Promise.all(ufsGov.map(async (uf) => simular(uf, await primeiroTurno(uf, "governador"), agora)));

  return { modo: "simulacao", geradoEm: new Date(agora).toISOString(), atrasado: false, presidente: nacional, presidentePorUf, governadores };
}
