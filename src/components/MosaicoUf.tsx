import Link from "next/link";
import type { DisputaUf } from "@/lib/data/load";
import { titleCase } from "@/lib/format";

// Mosaico do Brasil: cada UF é um quadrado na posição aproximada do mapa. Mostra se a disputa
// terminou no 1º turno ou vai ao 2º, sem cor de candidato (governadores são disputas
// independentes, então cor por candidato não teria significado nacional).
const POSICAO: Record<string, [linha: number, coluna: number]> = {
  RR: [0, 1], AP: [0, 3],
  AM: [1, 1], PA: [1, 2], MA: [1, 3], CE: [1, 4], RN: [1, 5],
  AC: [2, 0], RO: [2, 1], TO: [2, 2], PI: [2, 3], PE: [2, 4], PB: [2, 5],
  MT: [3, 1], GO: [3, 2], BA: [3, 3], SE: [3, 4], AL: [3, 5],
  MS: [4, 1], DF: [4, 2], MG: [4, 3], ES: [4, 4],
  SP: [5, 2], RJ: [5, 3],
  PR: [6, 2],
  RS: [7, 1], SC: [7, 2],
};

const sobrenome = (nome: string) => titleCase(nome).split(" ").slice(-1)[0];

export function MosaicoUf({ disputas, cargo }: { disputas: DisputaUf[]; cargo: string }) {
  return (
    <nav className="grid aspect-[6/8] w-full max-w-[26rem] grid-cols-6 grid-rows-8 gap-1" aria-label={`${cargo} por estado`}>
      {disputas.map((d) => {
        const [linha, coluna] = POSICAO[d.uf];
        const segundo = d.segundoTurno.length === 2;
        return (
          <Link
            key={d.uf}
            href={`/estados/${d.uf.toLowerCase()}`}
            style={{ gridRow: linha + 1, gridColumn: coluna + 1 }}
            className={`group flex min-w-0 flex-col justify-between rounded-md p-1.5 transition-colors sm:p-2 ${
              segundo ? "bg-ink text-page hover:opacity-90" : "border border-line bg-surface hover:bg-wash"
            }`}
            aria-label={
              segundo
                ? `${d.nome}: ${d.segundoTurno.map((c) => titleCase(c.nome)).join(" e ")} no 2º turno`
                : `${d.nome}: ${d.eleito ? `${titleCase(d.eleito.nome)} (${d.eleito.partido}) eleito` : "sem eleito"}`
            }
          >
            <span className="display text-base sm:text-lg">{d.uf}</span>
            <span className={`hidden truncate text-[11px] leading-tight sm:block ${segundo ? "" : "text-ink-2"}`}>
              {segundo ? "2º turno" : d.eleito ? sobrenome(d.eleito.nome) : ""}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function ListaDisputas({ disputas }: { disputas: DisputaUf[] }) {
  const segundo = disputas.filter((d) => d.segundoTurno.length === 2);
  const decididos = disputas.filter((d) => d.segundoTurno.length !== 2);
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <div>
        <h3 className="font-semibold">2º turno em 25 de outubro ({segundo.length})</h3>
        <ul className="mt-2 divide-y divide-line text-sm">
          {segundo.map((d) => (
            <li key={d.uf} className="flex gap-3 py-2">
              <Link href={`/estados/${d.uf.toLowerCase()}`} className="w-8 shrink-0 font-semibold hover:underline">
                {d.uf}
              </Link>
              <span className="text-ink-2">
                {d.segundoTurno.map((c, i) => (
                  <span key={c.sq}>
                    {i > 0 && " e "}
                    <span className="text-ink">{titleCase(c.nome)}</span> ({c.partido})
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold">Decididos no 1º turno ({decididos.length})</h3>
        <ul className="mt-2 divide-y divide-line text-sm">
          {decididos.map((d) => (
            <li key={d.uf} className="flex gap-3 py-2">
              <Link href={`/estados/${d.uf.toLowerCase()}`} className="w-8 shrink-0 font-semibold hover:underline">
                {d.uf}
              </Link>
              <span className="text-ink-2">
                {d.eleito ? (
                  <>
                    <span className="text-ink">{titleCase(d.eleito.nome)}</span> ({d.eleito.partido})
                  </>
                ) : (
                  "Sem eleito"
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
