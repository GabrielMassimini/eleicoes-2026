import Link from "next/link";
import { Amostra } from "@/components/Amostra";
import { fmtInt, fmtPct, titleCase } from "@/lib/format";
import { coresDaDisputa, estiloCor } from "@/lib/partidos";
import type { Candidato } from "@/lib/tse/normalize";
import { type CargoId, urlFoto } from "@/lib/tse/urls";

interface Props {
  candidatos: Candidato[];
  cargo: CargoId;
  /** UF usada no caminho da foto (Presidente usa "br"). */
  uf: string;
  /**
   * Disputa de referência para as cores (Brasil para Presidente, a UF para os demais). Garante que
   * um candidato tenha a mesma cor no placar de um município e no resultado geral.
   */
  referencia?: { sq: string; partido: string }[];
  /** Quantos mostrar com foto e barra; os demais viram uma lista compacta. */
  destaque?: number;
  /** Situação (Eleito/2º turno) é da disputa inteira; em municípios fica oculta. */
  mostrarSituacao?: boolean;
}

function Situacao({ c }: { c: Candidato }) {
  if (c.segundoTurno)
    return <span className="rounded-full border border-ink px-2 py-0.5 text-xs font-semibold">Vai ao 2º turno</span>;
  if (c.eleito)
    return (
      <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-page">
        {c.situacao === "Eleito" ? "Eleito" : c.situacao}
      </span>
    );
  return null;
}

export function Placar({ candidatos, cargo, uf, referencia, destaque = 4, mostrarSituacao = true }: Props) {
  const cores = coresDaDisputa(referencia ?? candidatos);
  const max = Math.max(...candidatos.map((c) => c.pct), 1);
  const principais = candidatos.slice(0, destaque);
  const demais = candidatos.slice(destaque);

  return (
    <div>
      <ol className="space-y-5">
        {principais.map((c) => {
          const vice = c.vices.find((v) => v.tipo === "vice");
          return (
            <li key={c.sq} className="grid grid-cols-[3.25rem_1fr] gap-x-3">
              <img
                src={urlFoto(cargo, 1, uf, c.sq)}
                alt=""
                width={52}
                height={70}
                loading="lazy"
                className="row-span-2 h-[70px] w-[52px] rounded-md bg-wash object-cover"
              />
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/candidatos/${c.sq}`} className="font-semibold hover:underline">
                    {titleCase(c.nome)}
                  </Link>
                  <p className="flex items-center gap-1.5 text-sm text-ink-2">
                    <Amostra cor={cores[c.sq]} className="size-2.5" />
                    {c.partido}
                    {vice ? `, vice ${titleCase(vice.nome)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold leading-none">{fmtPct(c.pct)}</p>
                  <p className="num mt-1 text-xs text-ink-2">{fmtInt(c.votos)} votos</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2.5 flex-1" aria-hidden>
                  <div
                    className="cor-cand h-full rounded-r-[4px]"
                    style={{ ...estiloCor(cores[c.sq]), width: `${(c.pct / max) * 100}%`, minWidth: 2, background: "var(--c)" }}
                  />
                </div>
                {mostrarSituacao && <Situacao c={c} />}
              </div>
            </li>
          );
        })}
      </ol>

      {demais.length > 0 && (
        <details className="group mt-5 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm text-ink-2 hover:text-ink">
            {demais.length === 1 ? "Outro candidato" : `Outros ${demais.length} candidatos`}
          </summary>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {demais.map((c) => (
                <tr key={c.sq} className="border-b border-line last:border-0">
                  <td className="py-1.5">
                    <Link href={`/candidatos/${c.sq}`} className="hover:underline">
                      {titleCase(c.nome)}
                    </Link>{" "}
                    <span className="inline-flex items-center gap-1 text-ink-2">
                      <Amostra cor={cores[c.sq]} className="size-2.5" />
                      {c.partido}
                    </span>
                  </td>
                  <td className="num py-1.5 text-right text-ink-2">{fmtInt(c.votos)}</td>
                  <td className="num w-20 py-1.5 text-right font-semibold">{fmtPct(c.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
