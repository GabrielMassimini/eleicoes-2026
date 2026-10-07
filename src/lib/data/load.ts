// Leitura dos JSON gerados pelo pipeline. Só roda no servidor (build das páginas estáticas).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { Resultado } from "@/lib/tse/normalize";
import { UF_POR_SIGLA, UFS } from "@/lib/tse/regioes";
import type { CargoId } from "@/lib/tse/urls";
import type { Municipio, PerfilCandidato, ResultadoMunicipalUf } from "./types";

const DATA = path.join(process.cwd(), "public", "data");

const lerJson = cache(async (rel: string): Promise<unknown> => JSON.parse(await readFile(path.join(DATA, rel), "utf-8")));

export async function resultado(abrangencia: string, cargo: CargoId): Promise<Resultado> {
  return (await lerJson(`1t/${abrangencia.toLowerCase()}/${cargo}.json`)) as Resultado;
}

export async function resultadoMunicipal(uf: string, cargo: CargoId): Promise<ResultadoMunicipalUf> {
  return (await lerJson(`1t/${uf.toLowerCase()}/municipios-${cargo}.json`)) as ResultadoMunicipalUf;
}

export async function municipios(): Promise<Municipio[]> {
  return (await lerJson("municipios.json")) as Municipio[];
}

export async function municipiosDoUf(uf: string): Promise<Municipio[]> {
  const sigla = uf.toUpperCase();
  return (await municipios()).filter((m) => m.uf === sigla);
}

export async function indiceCandidatos(): Promise<Record<string, [string, CargoId]>> {
  return (await lerJson("candidatos/indice.json")) as Record<string, [string, CargoId]>;
}

export async function perfilCandidato(uf: string, sq: string): Promise<PerfilCandidato | undefined> {
  return ((await lerJson(`candidatos/${uf.toLowerCase()}.json`)) as Record<string, PerfilCandidato>)[sq];
}

export function cargoDeputadoLocal(uf: string): CargoId {
  return uf.toUpperCase() === "DF" ? "depDistrital" : "depEstadual";
}

export interface DisputaUf {
  uf: string;
  nome: string;
  eleito?: Resultado["candidatos"][number];
  /** Todos os eleitos (Senado elege dois). */
  eleitos: Resultado["candidatos"];
  segundoTurno: Resultado["candidatos"];
  lider: Resultado["candidatos"][number];
}

/** Situação da disputa de um cargo majoritário estadual nas 27 UFs. */
export const disputasEstaduais = cache(async (cargo: "governador" | "senador"): Promise<DisputaUf[]> => {
  return Promise.all(
    UFS.map(async (u) => {
      const r = await resultado(u.sigla, cargo);
      return {
        uf: u.sigla,
        nome: UF_POR_SIGLA[u.sigla].nome,
        eleito: r.candidatos.find((c) => c.eleito),
        eleitos: r.candidatos.filter((c) => c.eleito),
        segundoTurno: r.candidatos.filter((c) => c.segundoTurno),
        lider: r.candidatos[0],
      };
    }),
  );
});
