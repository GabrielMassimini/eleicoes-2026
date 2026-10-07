// Votação de deputados (federal e estadual/distrital) em cada município -> public/data/1t/{uf}/mun/{ibge}.json
//
// Fonte: os mesmos arquivos por município do site de resultados do TSE. Cada um traz a lista
// inteira de candidatos da UF (~300 KB), então não guardamos o bruto: só a versão compacta, em
// .cache/deputados/, para que rodar de novo não baixe tudo outra vez.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import { normalizarResultado, type Resultado } from "@/lib/tse/normalize";
import { UFS } from "@/lib/tse/regioes";
import { type CargoId, urlResultado } from "@/lib/tse/urls";
import type { DeputadosMunicipio, DeputadosNoMunicipio, Municipio } from "@/lib/data/types";
import { CACHE_DIR, progress, readJson, writeJson } from "./lib/io";

const soUf = process.argv.find((a) => a.startsWith("--uf="))?.slice(5).toUpperCase();
const CACHE = path.join(CACHE_DIR, "deputados");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function baixar(url: string): Promise<unknown> {
  let erro: unknown;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "painel-eleicoes-2026 (projeto de portfolio)" } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      erro = e;
      await sleep(600 * 2 ** i);
    }
  }
  throw erro;
}

/** Compacta o resultado municipal usando os índices do resultado da UF. */
function compactar(r: Resultado, indice: Map<string, number>, legenda: Record<string, number>): DeputadosNoMunicipio {
  const v: [number, number][] = [];
  for (const c of r.candidatos) {
    if (c.votos <= 0) continue;
    const i = indice.get(c.sq);
    if (i === undefined) throw new Error(`candidato ${c.sq} fora da lista da UF`);
    v.push([i, c.votos]);
  }
  // Votos nominais e de legenda por partido, somados a partir das agremiações.
  const porPartido = new Map<string, [number, number]>();
  for (const c of r.candidatos) {
    const acc = porPartido.get(c.partido) ?? [0, 0];
    acc[0] += c.votos;
    porPartido.set(c.partido, acc);
  }
  for (const [sigla, votos] of Object.entries(legenda)) {
    const acc = porPartido.get(sigla) ?? [0, 0];
    acc[1] += votos;
    porPartido.set(sigla, acc);
  }
  return {
    validos: r.totais.validos,
    partidos: [...porPartido.entries()].filter(([, [n, l]]) => n + l > 0).map(([s, [n, l]]) => [s, n, l]),
    v,
  };
}

/** Votos de legenda por partido vêm do arquivo bruto (par[].tvtl); a normalização só guarda o total por agremiação. */
function legendaPorPartido(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const d = raw as { carg: { agr: { par: { sg: string; tvtl?: string }[] }[] }[] };
  for (const agr of d.carg[0].agr) for (const p of agr.par) out[p.sg] = (out[p.sg] ?? 0) + (Number.parseInt(p.tvtl ?? "0", 10) || 0);
  return out;
}

const municipios = await readJson<Municipio[]>("municipios.json");
const ufs = UFS.filter((u) => !soUf || u.sigla === soUf);
const limite = pLimit(12);
const total = ufs.reduce((s, u) => s + municipios.filter((m) => m.uf === u.sigla).length, 0);
const tick = progress("municípios", total);
const falhas: string[] = [];
await mkdir(CACHE, { recursive: true });

for (const uf of ufs) {
  const u = uf.sigla.toLowerCase();
  const cargoLocal: CargoId = uf.sigla === "DF" ? "depDistrital" : "depEstadual";
  const refs = {
    depFederal: await readJson<Resultado>(`1t/${u}/depFederal.json`),
    depLocal: await readJson<Resultado>(`1t/${u}/${cargoLocal}.json`),
  };
  const indices = {
    depFederal: new Map(refs.depFederal.candidatos.map((c, i) => [c.sq, i])),
    depLocal: new Map(refs.depLocal.candidatos.map((c, i) => [c.sq, i])),
  };

  await Promise.all(
    municipios
      .filter((m) => m.uf === uf.sigla)
      .map((m) =>
        limite(async () => {
          const cacheFile = path.join(CACHE, `${u}-${m.tse}.json`);
          try {
            let dados: DeputadosMunicipio;
            if (existsSync(cacheFile)) {
              dados = JSON.parse(await readFile(cacheFile, "utf-8"));
            } else {
              const [rawFed, rawLocal] = await Promise.all([
                baixar(urlResultado({ cargo: "depFederal", turno: 1, abrangencia: u, municipio: m.tse })),
                baixar(urlResultado({ cargo: cargoLocal, turno: 1, abrangencia: u, municipio: m.tse })),
              ]);
              dados = {
                ibge: m.ibge,
                depFederal: compactar(normalizarResultado(rawFed), indices.depFederal, legendaPorPartido(rawFed)),
                depLocal: compactar(normalizarResultado(rawLocal), indices.depLocal, legendaPorPartido(rawLocal)),
              };
              await writeFile(cacheFile, JSON.stringify(dados));
            }
            await writeJson(`1t/${u}/mun/${m.ibge}.json`, dados);
          } catch (e) {
            falhas.push(`${uf.sigla}/${m.nome}: ${(e as Error).message}`);
          } finally {
            tick();
          }
        }),
      ),
  );
}

if (falhas.length) {
  console.error(`\n${falhas.length} falhas:\n${falhas.slice(0, 30).join("\n")}`);
  process.exit(1);
}
console.log("ok");
