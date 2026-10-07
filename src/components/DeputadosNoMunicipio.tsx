"use client";

import { useState } from "react";
import { ListaCandidatos, type LinhaCandidato } from "@/components/ListaCandidatos";
import type { DeputadosMunicipio } from "@/lib/data/types";
import type { Resultado } from "@/lib/tse/normalize";

/**
 * Lista completa dos candidatos votados no município, carregada sob demanda (o arquivo da UF tem
 * todos os candidatos; o do município, só os votos de cada um ali).
 */
export function TodosDeputadosNoMunicipio(props: {
  uf: string;
  ibge: string;
  /** Arquivo do resultado na UF: depFederal, depEstadual ou depDistrital. */
  arquivoCargo: string;
  chave: "depFederal" | "depLocal";
  rotulo: string;
  municipio: string;
  quantidade: number;
}) {
  const [linhas, setLinhas] = useState<LinhaCandidato[] | null>(null);
  const [estado, setEstado] = useState<"parado" | "carregando" | "erro">("parado");

  const carregar = async () => {
    setEstado("carregando");
    try {
      const u = props.uf.toLowerCase();
      const [mun, uf] = await Promise.all([
        fetch(`/data/1t/${u}/mun/${props.ibge}.json`).then((r) => r.json() as Promise<DeputadosMunicipio>),
        fetch(`/data/1t/${u}/${props.arquivoCargo}.json`).then((r) => r.json() as Promise<Resultado>),
      ]);
      const bloco = mun[props.chave];
      setLinhas(
        bloco.v
          .map(([i, votos]) => {
            const c = uf.candidatos[i];
            return {
              sq: c.sq,
              nome: c.nome,
              partido: c.partido,
              votos,
              pct: bloco.validos ? (votos / bloco.validos) * 100 : 0,
              situacao: c.situacao,
              eleito: c.eleito,
            };
          })
          .sort((a, b) => b.votos - a.votos),
      );
    } catch {
      setEstado("erro");
    }
  };

  if (linhas) return <ListaCandidatos linhas={linhas} rotulo={props.rotulo} local={props.municipio} />;
  return (
    <div>
      <button
        type="button"
        onClick={carregar}
        disabled={estado === "carregando"}
        className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold hover:bg-wash disabled:opacity-60"
      >
        {estado === "carregando" ? "Carregando…" : `Ver todos os ${props.quantidade.toLocaleString("pt-BR")} candidatos votados em ${props.municipio}`}
      </button>
      {estado === "erro" && <p className="mt-2 text-sm text-ink-2">Não foi possível carregar a lista. Tente de novo.</p>}
    </div>
  );
}
