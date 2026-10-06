// Resultados agregados (BR, exterior e 27 UFs) de todos os cargos do 1º turno -> public/data/1t/{uf}/{cargo}.json
import pLimit from "p-limit";
import { normalizarResultado } from "@/lib/tse/normalize";
import { UFS } from "@/lib/tse/regioes";
import { type CargoId, urlResultado } from "@/lib/tse/urls";
import { fetchJson, progress, writeJson } from "./lib/io";

const fresh = process.argv.includes("--fresh");

const jobs: { abrangencia: string; cargo: CargoId }[] = [
  { abrangencia: "br", cargo: "presidente" },
  { abrangencia: "zz", cargo: "presidente" },
];
for (const uf of UFS) {
  const u = uf.sigla.toLowerCase();
  jobs.push({ abrangencia: u, cargo: "presidente" });
  jobs.push({ abrangencia: u, cargo: "governador" });
  jobs.push({ abrangencia: u, cargo: "senador" });
  jobs.push({ abrangencia: u, cargo: "depFederal" });
  jobs.push({ abrangencia: u, cargo: uf.sigla === "DF" ? "depDistrital" : "depEstadual" });
}

const limit = pLimit(6);
const tick = progress("resultados", jobs.length);

await Promise.all(
  jobs.map((j) =>
    limit(async () => {
      const raw = await fetchJson(urlResultado({ cargo: j.cargo, turno: 1, abrangencia: j.abrangencia }), { fresh });
      const r = normalizarResultado(raw);
      await writeJson(`1t/${j.abrangencia}/${j.cargo}.json`, r);
      tick();
    }),
  ),
);
