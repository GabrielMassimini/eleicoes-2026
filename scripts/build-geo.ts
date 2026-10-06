// Malhas do IBGE -> TopoJSON simplificado em public/geo/
//   br-uf.json        27 UFs (dissolvidas a partir dos municípios, então as bordas casam)
//   br-mun.json       todos os municípios, bem simplificado (visão nacional)
//   uf/{UF}.json      municípios de cada UF, com mais detalhe
// Cada feição tem `id` = código IBGE e `uf` = código IBGE da UF.
//
// Fonte: malha municipal 2025 do IBGE (shapefile). A API de malhas (servicodados) ainda não tem
// Boa Esperança do Norte/MT, instalado depois, que tem seção eleitoral desde 2024.
import { execFileSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import mapshaper from "mapshaper";
import unzipper from "unzipper";
import { UFS } from "@/lib/tse/regioes";
import { CACHE_DIR, fetchCached, GEO_DIR, ROOT, writeJson } from "./lib/io";

const URL_SHP =
  "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/BR_Municipios_2025.zip";

const dir = path.join(CACHE_DIR, "geo");
const base = path.join(dir, "br-mun-2025-base.json");

if (!existsSync(base)) {
  await mkdir(dir, { recursive: true });
  console.log("baixando malha municipal 2025 do IBGE (~237 MB)...");
  const zip = await fetchCached(URL_SHP);
  const arquivos = await unzipper.Open.buffer(zip);
  for (const f of arquivos.files) {
    if (/\.(shp|shx|dbf|prj|cpg)$/i.test(f.path)) {
      await pipeline(f.stream(), createWriteStream(path.join(dir, path.basename(f.path))));
    }
  }
  const shp = arquivos.files.map((f) => path.basename(f.path)).find((n) => n.endsWith(".shp"));
  console.log("pré-simplificando com mapshaper-xl...");
  // Uma passada pesada só, com memória extra; o resto do script trabalha sobre esse GeoJSON leve.
  execFileSync(
    process.execPath,
    [
      path.join(ROOT, "node_modules", "mapshaper", "bin", "mapshaper-xl"),
      "8gb",
      "-i", path.join(dir, shp!), "encoding=utf8",
      "-proj", "wgs84",
      "-simplify", "8%", "keep-shapes",
      "-each", "id=CD_MUN, uf=CD_UF",
      "-filter-fields", "id,uf",
      "-o", base, "format=geojson", "precision=0.00001",
    ],
    { stdio: "inherit" },
  );
}

const fonte = await readFile(base, "utf-8");

async function run(cmd: string, out: string, quantization = 100000): Promise<unknown> {
  const res = (await mapshaper.applyCommands(
    `-i in.json ${cmd} -rename-layers areas -o ${out} format=topojson quantization=${quantization} id-field=id bbox`,
    { "in.json": fonte },
  )) as Record<string, string | Buffer>;
  return JSON.parse(res[out].toString());
}

const sizeKb = (o: unknown) => Math.round(JSON.stringify(o).length / 1024);

const brUf = await run(`-dissolve uf -each 'id=uf' -simplify 6% keep-shapes`, "br-uf.json");
await writeJson("br-uf.json", brUf, GEO_DIR);
console.log(`br-uf.json ${sizeKb(brUf)} KB`);

const brMun = await run(`-simplify 6% keep-shapes`, "br-mun.json", 30000);
await writeJson("br-mun.json", brMun, GEO_DIR);
console.log(`br-mun.json ${sizeKb(brMun)} KB`);

for (const uf of UFS) {
  const t = await run(`-filter 'uf=="${uf.ibge}"' -simplify 22% keep-shapes`, `${uf.sigla}.json`);
  await writeJson(`uf/${uf.sigla}.json`, t, GEO_DIR);
  process.stdout.write(`${uf.sigla} ${sizeKb(t)}KB  `);
}
console.log("\nok");
