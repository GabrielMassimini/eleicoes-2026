import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Placar } from "@/components/Placar";
import { Totais } from "@/components/Totais";
import { municipios, municipiosDoUf, resultado, resultadoMunicipal } from "@/lib/data/load";
import type { ResultadoMunicipalUf } from "@/lib/data/types";
import { titleCase } from "@/lib/format";
import type { Candidato, Resultado, Totais as T } from "@/lib/tse/normalize";
import { UF_POR_SIGLA } from "@/lib/tse/regioes";
import type { CargoId } from "@/lib/tse/urls";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await municipios()).map((m) => ({ uf: m.uf.toLowerCase(), municipio: m.slug }));
}

async function achar(uf: string, slug: string) {
  return (await municipiosDoUf(uf)).find((m) => m.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string; municipio: string }> }): Promise<Metadata> {
  const { uf, municipio } = await params;
  const m = await achar(uf, municipio);
  return m ? { title: `${m.nome} (${m.uf})`, description: `Como ${m.nome} (${m.uf}) votou nas Eleições 2026.` } : {};
}

/** Reconstrói candidatos e totais a partir do formato compacto, mantendo a situação da disputa inteira. */
function doMunicipio(mun: ResultadoMunicipalUf, ibge: string, referencia: Resultado) {
  const r = mun.municipios[ibge];
  if (!r) return null;
  const porSq = new Map(referencia.candidatos.map((c) => [c.sq, c]));
  const candidatos: Candidato[] = mun.candidatos
    .map((ref, i) => {
      const base = porSq.get(ref.sq)!;
      return { ...base, votos: r.v[i], pct: r.validos ? (r.v[i] / r.validos) * 100 : 0 };
    })
    .sort((a, b) => b.votos - a.votos);
  const pct = (n: number, d: number) => (d ? (n / d) * 100 : 0);
  const totais: T = {
    secoes: 0,
    secoesTotalizadas: 0,
    pctTotalizado: 100,
    eleitorado: r.eleitorado,
    eleitoradoTotalizado: r.eleitorado,
    comparecimento: r.comparecimento,
    pctComparecimento: pct(r.comparecimento, r.eleitorado),
    abstencao: r.abstencao,
    pctAbstencao: pct(r.abstencao, r.eleitorado),
    validos: r.validos,
    brancos: r.brancos,
    pctBrancos: pct(r.brancos, r.comparecimento),
    nulos: r.nulos,
    pctNulos: pct(r.nulos, r.comparecimento),
  };
  return { candidatos, totais };
}

export default async function MunicipioPage({ params }: { params: Promise<{ uf: string; municipio: string }> }) {
  const { uf, municipio } = await params;
  const sigla = uf.toUpperCase();
  const m = await achar(uf, municipio);
  if (!m) notFound();
  const info = UF_POR_SIGLA[sigla];

  const cargos: { id: CargoId; rotulo: string; ref: Resultado; mun: ResultadoMunicipalUf }[] = await Promise.all(
    (
      [
        ["presidente", "Presidente"],
        ["governador", "Governador"],
        ["senador", "Senado"],
      ] as const
    ).map(async ([id, rotulo]) => ({
      id,
      rotulo,
      ref: await resultado(id === "presidente" ? "br" : sigla, id),
      mun: await resultadoMunicipal(sigla, id),
    })),
  );
  const blocos = cargos.map((c) => ({ ...c, dados: doMunicipio(c.mun, m.ibge, c.ref) }));
  const pres = blocos[0].dados;
  const vencedor = pres?.candidatos[0];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="pt-8 pb-8 sm:pt-12">
        <p className="text-sm text-ink-2">
          <Link href="/estados" className="hover:underline">
            Estados
          </Link>{" "}
          /{" "}
          <Link href={`/estados/${uf}`} className="hover:underline">
            {info.nome}
          </Link>
        </p>
        <h1 className="display mt-2 text-4xl sm:text-6xl">{m.nome}</h1>
        {vencedor && (
          <p className="mt-4 max-w-[48ch] text-xl">
            {titleCase(vencedor.nome)} ({vencedor.partido}) foi o mais votado para Presidente, com{" "}
            {vencedor.pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% dos votos válidos.
          </p>
        )}
        <p className="mt-2 text-sm text-ink-2">
          {m.capital ? `Capital de ${info.nome}. ` : ""}Resultado final do 1º turno no município.
        </p>
      </header>

      {pres && (
        <section className="mb-12">
          <Totais totais={pres.totais} />
        </section>
      )}

      <div className="space-y-14">
        {blocos.map(
          (b) =>
            b.dados && (
              <section key={b.id} className="border-t border-line pt-8">
                <h2 className="display mb-6 text-2xl">{b.rotulo}</h2>
                <Placar
                  candidatos={b.dados.candidatos}
                  cargo={b.id}
                  uf={b.id === "presidente" ? "br" : sigla}
                  referencia={b.ref.candidatos}
                  destaque={b.id === "senador" ? 4 : 3}
                  mostrarSituacao
                />
                <p className="mt-4 text-xs text-ink-2">
                  Situação ({b.id === "senador" ? "eleitos" : "eleito ou 2º turno"}) refere-se à disputa{" "}
                  {b.id === "presidente" ? "nacional" : `em ${info.nome}`}. Cores seguem o resultado{" "}
                  {b.id === "presidente" ? "nacional" : "estadual"}.
                </p>
              </section>
            ),
        )}
      </div>
    </div>
  );
}
