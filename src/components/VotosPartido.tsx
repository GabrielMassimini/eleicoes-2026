import { Amostra } from "@/components/Amostra";
import { fmtInt, fmtPct } from "@/lib/format";
import { corDoPartidoTema, estiloCor } from "@/lib/partidos";

export interface LinhaPartido {
  /** Sigla do partido, ou da federação/coligação (ex.: "PT/PC do B/PV"). */
  sigla: string;
  /** Partido usado para a cor (o primeiro, no caso de federações). */
  partidoCor: string;
  nominais: number;
  legenda: number;
  vagas?: number;
}

/** Votos (nominais + legenda) por partido ou federação, em % dos votos válidos, nas cores de cada partido. */
export function VotosPartido({ linhas, validos, mostrarVagas }: { linhas: LinhaPartido[]; validos: number; mostrarVagas?: boolean }) {
  const ordenadas = [...linhas].sort((a, b) => b.nominais + b.legenda - (a.nominais + a.legenda));
  const max = Math.max(...ordenadas.map((l) => l.nominais + l.legenda), 1);
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="border-b border-line text-left text-ink-2">
          <tr>
            <th className="px-3 py-2.5 font-normal">Partido ou federação</th>
            <th className="w-[30%] px-3 py-2.5 font-normal">
              <span className="sr-only">Proporção</span>
            </th>
            <th className="px-3 py-2.5 text-right font-normal">Votos</th>
            <th className="px-3 py-2.5 text-right font-normal">% válidos</th>
            <th className="hidden px-3 py-2.5 text-right font-normal sm:table-cell">Legenda</th>
            {mostrarVagas && <th className="px-3 py-2.5 text-right font-normal">Vagas</th>}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((l) => {
            const total = l.nominais + l.legenda;
            const cor = corDoPartidoTema(l.partidoCor);
            return (
              <tr key={l.sigla} className="border-b border-line last:border-0">
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Amostra cor={cor} className="size-2.5" />
                    {l.sigla}
                  </span>
                </td>
                <td className="px-3 py-1.5" aria-hidden>
                  <span className="block h-2.5">
                    <span
                      className="cor-cand block h-full rounded-r-[4px]"
                      style={{ ...estiloCor(cor), background: "var(--c)", width: `${(total / max) * 100}%`, minWidth: 2 }}
                    />
                  </span>
                </td>
                <td className="num px-3 py-1.5 text-right">{fmtInt(total)}</td>
                <td className="num px-3 py-1.5 text-right font-semibold">{fmtPct(validos ? (total / validos) * 100 : 0)}</td>
                <td className="num hidden px-3 py-1.5 text-right text-ink-2 sm:table-cell">{fmtInt(l.legenda)}</td>
                {mostrarVagas && <td className="num px-3 py-1.5 text-right font-semibold">{l.vagas ?? 0}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
