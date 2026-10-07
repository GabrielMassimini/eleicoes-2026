import { tintaSobre } from "@/lib/colors";
import { fmtPct } from "@/lib/format";
import { type CorCandidato, estiloCor } from "@/lib/partidos";

export interface Serie {
  nome: string;
  /** Cor do candidato; sem ela, a série é neutra (ex.: "Outros"). */
  cor?: CorCandidato;
}

const fundo = (s: Serie) => (s.cor ? { ...estiloCor(s.cor), background: "var(--c)" } : { background: "var(--outros)" });

export interface LinhaEmpilhada {
  rotulo: string;
  href?: string;
  /** Percentuais por série, mesma ordem de `series`; somam ~100. */
  valores: number[];
}

/**
 * Barras 100% empilhadas, uma por linha (ex.: regiões). Separação por 2px de superfície entre
 * segmentos; valor dentro do segmento só quando cabe, senão fica para a tabela abaixo.
 */
export function BarrasEmpilhadas({ series, linhas, titulo }: { series: Serie[]; linhas: LinhaEmpilhada[]; titulo: string }) {
  return (
    <figure>
      <figcaption className="sr-only">{titulo}</figcaption>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Legenda">
        {series.map((s) => (
          <li key={s.nome} className="flex items-center gap-1.5">
            <span aria-hidden className="cor-cand size-3 rounded-sm" style={fundo(s)} />
            {s.nome}
          </li>
        ))}
      </ul>
      <div className="space-y-3">
        {linhas.map((l) => (
          <div key={l.rotulo} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm">
            <span className="truncate">{l.rotulo}</span>
            <div className="flex h-6 gap-[2px]" role="img" aria-label={`${l.rotulo}: ${l.valores.map((v, i) => `${series[i].nome} ${fmtPct(v, 1)}`).join(", ")}`}>
              {l.valores.map((v, i) =>
                v > 0 ? (
                  <div
                    key={series[i].nome}
                    className="cor-cand flex items-center overflow-visible px-1.5 first:rounded-l-[4px] last:rounded-r-[4px]"
                    style={{ ...fundo(series[i]), width: `${v}%` }}
                    title={`${series[i].nome}: ${fmtPct(v, 1)}`}
                  >
                    {v >= 14 && (
                      <span className="num text-xs font-semibold" style={{ color: series[i].cor ? tintaSobre(series[i].cor!.claro) : undefined }}>
                        {fmtPct(v, 1)}
                      </span>
                    )}
                  </div>
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
