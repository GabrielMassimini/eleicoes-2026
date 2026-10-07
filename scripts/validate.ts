// Checagens cruzadas dos dados gerados. Falha (exit 1) se algo não bater.
import type { Topology } from "topojson-specification";
import type { Resultado } from "@/lib/tse/normalize";
import { UFS } from "@/lib/tse/regioes";
import type { Municipio, ResultadoMunicipalUf } from "@/lib/data/types";
import { GEO_DIR, readJson } from "./lib/io";

const erros: string[] = [];
const ok = (msg: string) => console.log(`✓ ${msg}`);
const check = (cond: boolean, msg: string) => (cond ? ok(msg) : erros.push(msg));

const municipios = await readJson<Municipio[]>("municipios.json");
const r = (abr: string, cargo: string) => readJson<Resultado>(`1t/${abr}/${cargo}.json`);

// 1. Presidente: soma das 27 UFs + exterior = Brasil, candidato a candidato
const br = await r("br", "presidente");
const partes = await Promise.all([...UFS.map((u) => r(u.sigla.toLowerCase(), "presidente")), r("zz", "presidente")]);
const somaPorSq = new Map<string, number>();
for (const p of partes) for (const c of p.candidatos) somaPorSq.set(c.sq, (somaPorSq.get(c.sq) ?? 0) + c.votos);
check(
  br.candidatos.every((c) => somaPorSq.get(c.sq) === c.votos),
  "Presidente: UFs + exterior somam exatamente o total nacional",
);

// 2. Cada UF tem Governador e Senador, e o 2º turno aparece sempre em pares
let paresOk = true;
for (const uf of UFS) {
  const u = uf.sigla.toLowerCase();
  for (const cargo of ["governador", "senador"]) {
    const res = await r(u, cargo);
    if (!res.candidatos.length) erros.push(`${uf.sigla}/${cargo} sem candidatos`);
    const st = res.candidatos.filter((c) => c.segundoTurno).length;
    if (st !== 0 && st !== 2) paresOk = false;
  }
  const gov = await r(u, "governador");
  const eleitos = gov.candidatos.filter((c) => c.eleito).length;
  const segundo = gov.candidatos.filter((c) => c.segundoTurno).length;
  if (!(eleitos === 1 && segundo === 0) && !(eleitos === 0 && segundo === 2)) {
    erros.push(`${uf.sigla}/governador: ${eleitos} eleitos e ${segundo} no 2º turno`);
  }
}
check(paresOk, "2º turno sempre com exatamente 2 candidatos por cargo/UF");
const brSegundo = br.candidatos.filter((c) => c.segundoTurno).length;
check(brSegundo === 2 || br.candidatos.some((c) => c.eleito), "Presidente: eleito ou 2 no 2º turno");

// 3. Municípios: todos com código IBGE presente na malha e nos resultados municipais
const topo = await readJson<Topology>("br-mun.json", GEO_DIR);
const objeto = Object.values(topo.objects)[0] as { geometries: { id?: string | number }[] };
const idsMalha = new Set(objeto.geometries.map((g) => String(g.id)));
const semMalha = municipios.filter((m) => !idsMalha.has(m.ibge));
check(semMalha.length === 0, `Malha cobre os ${municipios.length} municípios${semMalha.length ? ` (faltam: ${semMalha.map((m) => `${m.nome}/${m.uf}`).join(", ")})` : ""}`);

let municipaisOk = true;
for (const uf of UFS) {
  for (const cargo of ["presidente", "governador", "senador"]) {
    const mun = await readJson<ResultadoMunicipalUf>(`1t/${uf.sigla.toLowerCase()}/municipios-${cargo}.json`);
    const esperados = municipios.filter((m) => m.uf === uf.sigla);
    const faltando = esperados.filter((m) => !mun.municipios[m.ibge]);
    if (faltando.length) {
      municipaisOk = false;
      erros.push(`${uf.sigla}/${cargo}: faltam ${faltando.length} municípios`);
    }
    // soma municipal = total da UF
    const ufRes = await r(uf.sigla.toLowerCase(), cargo);
    const porSq = new Map(ufRes.candidatos.map((c) => [c.sq, c.votos]));
    const soma: number[] = Array.from({ length: mun.candidatos.length }, () => 0);
    for (const m of Object.values(mun.municipios)) m.v.forEach((x, i) => (soma[i] += x));
    mun.candidatos.forEach((c, i) => {
      if (porSq.get(c.sq) !== soma[i]) {
        municipaisOk = false;
        erros.push(`${uf.sigla}/${cargo}: soma municipal de ${c.nome} (${soma[i]}) ≠ UF (${porSq.get(c.sq)})`);
      }
    });
  }
}
check(municipaisOk, "Resultados municipais completos e somando o total de cada UF");

// 4. Slugs únicos dentro de cada UF (usados nas URLs)
const slugs = new Set<string>();
const duplicados = municipios.filter((m) => {
  const k = `${m.uf}/${m.slug}`;
  if (slugs.has(k)) return true;
  slugs.add(k);
  return false;
});
check(duplicados.length === 0, "Slugs de município únicos por UF");

if (erros.length) {
  console.error(`\n✗ ${erros.length} problema(s):\n- ${erros.join("\n- ")}`);
  process.exit(1);
}
console.log("\nTudo certo.");
