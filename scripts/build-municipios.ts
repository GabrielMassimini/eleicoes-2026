// Lista de municípios com código TSE ↔ IBGE -> public/data/municipios.json
import { MunicipiosBrutoSchema } from "@/lib/tse/schema";
import { ELEICOES, urlMunicipios } from "@/lib/tse/urls";
import { slugify, titleCase } from "@/lib/format";
import type { Municipio } from "@/lib/data/types";
import { fetchJson, writeJson } from "./lib/io";

const raw = MunicipiosBrutoSchema.parse(await fetchJson(urlMunicipios(ELEICOES.federal[1])));

const municipios: Municipio[] = raw.abr
  .filter((a) => a.cd !== "zz")
  .flatMap((a) =>
    a.mu.map((m) => {
      const nome = titleCase(m.nm);
      return { tse: m.cd, ibge: m.cdi, nome, slug: slugify(nome), uf: a.cd.toUpperCase(), capital: m.c === "s" };
    }),
  )
  .sort((a, b) => a.uf.localeCompare(b.uf) || a.nome.localeCompare(b.nome, "pt-BR"));

const semIbge = municipios.filter((m) => !/^\d{7}$/.test(m.ibge));
if (semIbge.length) throw new Error(`Municípios sem código IBGE: ${semIbge.map((m) => m.nome).join(", ")}`);

const file = await writeJson("municipios.json", municipios);
console.log(`${municipios.length} municípios -> ${file}`);
