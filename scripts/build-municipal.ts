// Votos por município dos cargos majoritários -> public/data/1t/{uf}/municipios-{cargo}.json
// São ~5.570 arquivos por cargo no TSE; o cache em .cache/ deixa as execuções seguintes instantâneas.
import pLimit from "p-limit";
import { normalizarResultado, type Resultado } from "@/lib/tse/normalize";
import { UFS } from "@/lib/tse/regioes";
import { type CargoId, urlResultado } from "@/lib/tse/urls";
import { compactarTotais, type Municipio, type ResultadoMunicipalUf } from "@/lib/data/types";
import { fetchJson, progress, readJson, writeJson } from "./lib/io";

const CARGOS: CargoId[] = ["presidente", "governador", "senador"];
const fresh = process.argv.includes("--fresh");
const soUf = process.argv.find((a) => /^--uf=/.test(a))?.slice(5).toUpperCase();

const municipios = await readJson<Municipio[]>("municipios.json");
const presidenteBr = await readJson<Resultado>("1t/br/presidente.json");

const limit = pLimit(8);
const ufs = UFS.filter((u) => !soUf || u.sigla === soUf);
const total = ufs.reduce((s, u) => s + municipios.filter((m) => m.uf === u.sigla).length, 0) * CARGOS.length;
const tick = progress("municípios", total);
const falhas: string[] = [];

for (const uf of ufs) {
  const doUf = municipios.filter((m) => m.uf === uf.sigla);
  for (const cargo of CARGOS) {
    const ref = cargo === "presidente" ? presidenteBr : await readJson<Resultado>(`1t/${uf.sigla.toLowerCase()}/${cargo}.json`);
    const candidatos = ref.candidatos.map(({ numero, sq, nome, partido }) => ({ numero, sq, nome, partido }));
    const indice = new Map(candidatos.map((c, i) => [c.sq, i]));

    const out: ResultadoMunicipalUf = { cargo, turno: 1, uf: uf.sigla, atualizadoEm: ref.atualizadoEm, candidatos, municipios: {} };

    await Promise.all(
      doUf.map((m) =>
        limit(async () => {
          try {
            const url = urlResultado({ cargo, turno: 1, abrangencia: uf.sigla, municipio: m.tse });
            const r = normalizarResultado(await fetchJson(url, { fresh }));
            const v = new Array<number>(candidatos.length).fill(0);
            for (const c of r.candidatos) {
              const i = indice.get(c.sq);
              if (i === undefined) throw new Error(`candidato ${c.sq} fora da lista de ${uf.sigla}/${cargo}`);
              v[i] = c.votos;
            }
            out.municipios[m.ibge] = { ...compactarTotais(r.totais), v };
          } catch (err) {
            falhas.push(`${uf.sigla}/${m.nome}/${cargo}: ${(err as Error).message}`);
          } finally {
            tick();
          }
        }),
      ),
    );

    await writeJson(`1t/${uf.sigla.toLowerCase()}/municipios-${cargo}.json`, out);
  }
}

if (falhas.length) {
  console.error(`\n${falhas.length} falhas:\n${falhas.slice(0, 30).join("\n")}`);
  process.exit(1);
}

// Presidente: um arquivo nacional com os 5.570 municípios, para o mapa do Brasil inteiro.
if (!soUf) {
  const nacional: ResultadoMunicipalUf = {
    cargo: "presidente",
    turno: 1,
    uf: "BR",
    atualizadoEm: presidenteBr.atualizadoEm,
    candidatos: presidenteBr.candidatos.map(({ numero, sq, nome, partido }) => ({ numero, sq, nome, partido })),
    municipios: {},
  };
  for (const uf of UFS) {
    const parte = await readJson<ResultadoMunicipalUf>(`1t/${uf.sigla.toLowerCase()}/municipios-presidente.json`);
    Object.assign(nacional.municipios, parte.municipios);
  }
  await writeJson("1t/br/municipios-presidente.json", nacional);
}
console.log("ok");
