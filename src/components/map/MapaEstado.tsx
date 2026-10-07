"use client";

import { useState } from "react";
import type { CandidatoRef } from "@/lib/data/types";
import { type AreaInfo, MapaResultado } from "./MapaResultado";

export interface CamadaCargo {
  id: string;
  rotulo: string;
  candidatos: CandidatoRef[];
  areas: Record<string, AreaInfo>;
}

/** Mapa municipal de uma UF com abas por cargo (Governador, Senador, Presidente). */
export function MapaEstado({ uf, camadas }: { uf: string; camadas: CamadaCargo[] }) {
  const [ativa, setAtiva] = useState(camadas[0].id);
  const camada = camadas.find((c) => c.id === ativa) ?? camadas[0];
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-line p-0.5 text-sm" role="group" aria-label="Cargo exibido no mapa">
        {camadas.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === ativa}
            onClick={() => setAtiva(c.id)}
            className={`rounded-md px-3 py-1.5 ${c.id === ativa ? "bg-wash font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}
          >
            {c.rotulo}
          </button>
        ))}
      </div>
      <MapaResultado
        key={camada.id}
        geo={`/geo/uf/${uf}.json`}
        candidatos={camada.candidatos}
        areas={camada.areas}
        unidade="município"
        titulo={`${camada.rotulo} por município`}
      />
    </div>
  );
}
