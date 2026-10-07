import { cache } from "react";
import type { AreaInfo } from "@/components/map/MapaResultado";
import type { Resultado } from "@/lib/tse/normalize";
import { REGIOES, type RegiaoId, UFS } from "@/lib/tse/regioes";
import type { CargoId } from "@/lib/tse/urls";
import { municipiosDoUf, resultado, resultadoMunicipal } from "./load";
import type { CandidatoRef } from "./types";

export const refs = (r: Resultado): CandidatoRef[] => r.candidatos.map(({ numero, sq, nome, partido }) => ({ numero, sq, nome, partido }));

/** Presidente por UF, na ordem de identidade nacional, para o mapa do Brasil. */
export const presidentePorUf = cache(async () => {
  const br = await resultado("br", "presidente");
  const candidatos = refs(br);
  const porUf = await Promise.all(UFS.map(async (u) => ({ uf: u, r: await resultado(u.sigla, "presidente") })));
  const areas: Record<string, AreaInfo> = {};
  for (const { uf, r } of porUf) {
    const votos = new Map(r.candidatos.map((c) => [c.sq, c.votos]));
    areas[uf.ibge] = {
      nome: uf.nome,
      href: `/estados/${uf.sigla.toLowerCase()}`,
      validos: r.totais.validos,
      v: candidatos.map((c) => votos.get(c.sq) ?? 0),
    };
  }
  return { br, candidatos, areas, porUf };
});

/** Votos de Presidente somados por região. */
export async function presidentePorRegiao() {
  const { candidatos, porUf } = await presidentePorUf();
  const soma = new Map<RegiaoId, { validos: number; v: number[] }>();
  for (const { uf, r } of porUf) {
    const acc = soma.get(uf.regiao) ?? { validos: 0, v: candidatos.map(() => 0) };
    acc.validos += r.totais.validos;
    const votos = new Map(r.candidatos.map((c) => [c.sq, c.votos]));
    candidatos.forEach((c, i) => (acc.v[i] += votos.get(c.sq) ?? 0));
    soma.set(uf.regiao, acc);
  }
  return (Object.keys(REGIOES) as RegiaoId[]).map((id) => ({ id, nome: REGIOES[id], ...soma.get(id)! }));
}

/** Áreas municipais de um cargo numa UF, prontas para o mapa. */
export async function areasMunicipais(uf: string, cargo: CargoId, ordem?: CandidatoRef[]) {
  const [mun, municipios] = await Promise.all([resultadoMunicipal(uf, cargo), municipiosDoUf(uf)]);
  const candidatos = ordem ?? mun.candidatos;
  const indice = mun.candidatos.map((c) => candidatos.findIndex((o) => o.sq === c.sq));
  const areas: Record<string, AreaInfo> = {};
  for (const m of municipios) {
    const r = mun.municipios[m.ibge];
    if (!r) continue;
    const v = candidatos.map(() => 0);
    r.v.forEach((x, i) => indice[i] >= 0 && (v[indice[i]] = x));
    areas[m.ibge] = { nome: m.nome, href: `/estados/${uf.toLowerCase()}/${m.slug}`, validos: r.validos, v };
  }
  return { candidatos, areas };
}
