"use client";

import { useEffect, useState } from "react";
import type { CandidatoRef, Municipio, ResultadoMunicipalUf } from "@/lib/data/types";
import { type AreaInfo, MapaResultado } from "./MapaResultado";

type Nivel = "uf" | "municipio";

/** Mapa nacional de Presidente com troca entre estados e os 5.570 municípios (carregados sob demanda). */
export function MapaPresidente({ candidatos, areasUf }: { candidatos: CandidatoRef[]; areasUf: Record<string, AreaInfo> }) {
  const [nivel, setNivel] = useState<Nivel>("uf");
  const [areasMun, setAreasMun] = useState<Record<string, AreaInfo> | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (nivel !== "municipio" || areasMun) return;
    let cancelado = false;
    Promise.all([
      fetch("/data/1t/br/municipios-presidente.json").then((r) => r.json() as Promise<ResultadoMunicipalUf>),
      fetch("/data/municipios.json").then((r) => r.json() as Promise<Municipio[]>),
    ])
      .then(([res, muns]) => {
        if (cancelado) return;
        const areas: Record<string, AreaInfo> = {};
        for (const m of muns) {
          const r = res.municipios[m.ibge];
          if (!r) continue;
          areas[m.ibge] = { nome: `${m.nome} (${m.uf})`, href: `/estados/${m.uf.toLowerCase()}/${m.slug}`, validos: r.validos, v: r.v };
        }
        setAreasMun(areas);
      })
      .catch(() => !cancelado && setErro(true));
    return () => {
      cancelado = true;
    };
  }, [nivel, areasMun]);

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-line p-0.5 text-sm" role="group" aria-label="Nível do mapa">
        {(
          [
            ["uf", "Por estado"],
            ["municipio", "Por município"],
          ] as const
        ).map(([n, rotulo]) => (
          <button
            key={n}
            type="button"
            aria-pressed={nivel === n}
            onClick={() => setNivel(n)}
            className={`rounded-md px-3 py-1.5 ${nivel === n ? "bg-wash font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {nivel === "uf" && (
        <MapaResultado geo="/geo/br-uf.json" candidatos={candidatos} areas={areasUf} unidade="estado" titulo="Presidente por estado" />
      )}
      {nivel === "municipio" &&
        (areasMun ? (
          <MapaResultado
            geo="/geo/br-mun.json"
            candidatos={candidatos}
            areas={areasMun}
            bordasUf
            unidade="município"
            titulo="Presidente por município"
          />
        ) : (
          <div className="grid h-[380px] place-items-center rounded-lg border border-line bg-surface text-sm text-ink-2 sm:h-[520px]">
            {erro ? "Não foi possível carregar os municípios. Recarregue a página para tentar de novo." : "Carregando 5.570 municípios…"}
          </div>
        ))}
    </div>
  );
}
