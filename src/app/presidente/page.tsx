import type { Metadata } from "next";
import Link from "next/link";
import { BarrasEmpilhadas } from "@/components/BarrasEmpilhadas";
import { MapaPresidente } from "@/components/map/MapaPresidente";
import { Amostra } from "@/components/Amostra";
import { Placar } from "@/components/Placar";
import { Totais, Totalizacao } from "@/components/Totais";
import { presidentePorRegiao, presidentePorUf } from "@/lib/data/agregados";
import { fmtInt, fmtPct, titleCase } from "@/lib/format";
import { coresDaDisputa } from "@/lib/partidos";

export const metadata: Metadata = { title: "Presidente" };

export default async function PresidentePage() {
  const { br, candidatos, areas, porUf } = await presidentePorUf();
  const regioes = await presidentePorRegiao();
  const cores = coresDaDisputa(br.candidatos);
  const [a, b] = br.candidatos;

  const series = [
    { nome: titleCase(a.nome), cor: cores[a.sq] },
    { nome: titleCase(b.nome), cor: cores[b.sq] },
    { nome: "Outros candidatos" },
  ];
  const linhasRegiao = regioes.map((r) => {
    const pa = (r.v[0] / r.validos) * 100;
    const pb = (r.v[1] / r.validos) * 100;
    return { rotulo: r.nome, valores: [pa, pb, Math.max(0, 100 - pa - pb)] };
  });

  const estados = porUf
    .map(({ uf, r }) => {
      const pct = (sq: string) => r.candidatos.find((c) => c.sq === sq)?.pct ?? 0;
      return { uf, pa: pct(a.sq), pb: pct(b.sq), validos: r.totais.validos, vencedor: r.candidatos[0] };
    })
    .sort((x, y) => y.pa - y.pb - (x.pa - x.pb));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="pt-10 pb-8 sm:pt-14">
        <h1 className="display text-4xl sm:text-6xl">Presidente</h1>
        <p className="mt-3 max-w-[60ch] text-ink-2">
          Resultado do 1º turno em todo o país, por estado, região e município. Os dois mais votados voltam a se enfrentar
          em 25 de outubro.
        </p>
        <div className="mt-3">
          <Totalizacao totais={br.totais} atualizadoEm={br.atualizadoEm} />
        </div>
      </header>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <h2 className="sr-only">Mapa</h2>
          <MapaPresidente candidatos={candidatos} areasUf={areas} />
        </div>
        <div>
          <h2 className="mb-5 text-lg font-semibold">Brasil</h2>
          <Placar candidatos={br.candidatos} cargo="presidente" uf="br" destaque={5} />
        </div>
      </section>

      <section className="mt-10">
        <Totais totais={br.totais} />
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="display text-3xl">Por região</h2>
        <p className="mt-2 mb-6 max-w-[60ch] text-ink-2">Percentual dos votos válidos em cada região do país.</p>
        <BarrasEmpilhadas series={series} linhas={linhasRegiao} titulo="Votos válidos por região" />
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="display text-3xl">Por estado</h2>
        <p className="mt-2 mb-6 max-w-[60ch] text-ink-2">
          Ordenado pela diferença entre {titleCase(a.nome)} e {titleCase(b.nome)}, em pontos percentuais.
        </p>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b border-line text-left text-ink-2">
              <tr>
                <th className="px-4 py-2.5 font-normal">Estado</th>
                <th className="px-4 py-2.5 text-right font-normal">{titleCase(a.nome)}</th>
                <th className="px-4 py-2.5 text-right font-normal">{titleCase(b.nome)}</th>
                <th className="px-4 py-2.5 text-right font-normal">Diferença</th>
                <th className="px-4 py-2.5 text-right font-normal">Votos válidos</th>
              </tr>
            </thead>
            <tbody>
              {estados.map((e) => {
                const dif = e.pa - e.pb;
                return (
                  <tr key={e.uf.sigla} className="border-b border-line last:border-0 hover:bg-wash">
                    <td className="px-4 py-2">
                      <Link href={`/estados/${e.uf.sigla.toLowerCase()}`} className="hover:underline">
                        {e.uf.nome}
                      </Link>
                    </td>
                    <td className="num px-4 py-2 text-right">{fmtPct(e.pa, 1)}</td>
                    <td className="num px-4 py-2 text-right">{fmtPct(e.pb, 1)}</td>
                    <td className="num px-4 py-2 text-right font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <Amostra cor={cores[dif >= 0 ? a.sq : b.sq]} className="size-2.5" />
                        {dif >= 0 ? "+" : "−"}
                        {fmtPct(Math.abs(dif), 1).replace("%", " p.p.")}
                      </span>
                    </td>
                    <td className="num px-4 py-2 text-right text-ink-2">{fmtInt(e.validos)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-2">
          Diferença positiva: vantagem de {titleCase(a.nome)}; negativa: vantagem de {titleCase(b.nome)}.
        </p>
      </section>
    </div>
  );
}
