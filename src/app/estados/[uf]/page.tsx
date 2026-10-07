import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuscaMunicipios } from "@/components/BuscaMunicipios";
import { Bancada, ExplicacaoQuociente, TabelaEleitos } from "@/components/Deputados";
import { MapaEstado } from "@/components/map/MapaEstado";
import { Placar } from "@/components/Placar";
import { Totais, Totalizacao } from "@/components/Totais";
import { areasMunicipais, refs } from "@/lib/data/agregados";
import { cargoDeputadoLocal, municipiosDoUf, resultado, resultadoMunicipal } from "@/lib/data/load";
import { titleCase } from "@/lib/format";
import type { Resultado } from "@/lib/tse/normalize";
import { REGIOES, UF_POR_SIGLA, UFS } from "@/lib/tse/regioes";

export const dynamicParams = false;

export function generateStaticParams() {
  return UFS.map((u) => ({ uf: u.sigla.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  const info = UF_POR_SIGLA[uf.toUpperCase()];
  return info ? { title: info.nome, description: `Resultado das Eleições 2026 em ${info.nome}: Governador, Senado, Presidente e deputados.` } : {};
}

function resumoGovernador(gov: Resultado): string {
  const segundo = gov.candidatos.filter((c) => c.segundoTurno);
  if (segundo.length === 2) {
    return `${titleCase(segundo[0].nome)} (${segundo[0].partido}) e ${titleCase(segundo[1].nome)} (${segundo[1].partido}) disputam o governo no 2º turno`;
  }
  const eleito = gov.candidatos.find((c) => c.eleito);
  return eleito ? `${titleCase(eleito.nome)} (${eleito.partido}) é eleito governador no 1º turno` : "Resultado para Governador";
}

const SECOES = [
  ["governador", "Governador"],
  ["senado", "Senado"],
  ["presidente", "Presidente"],
  ["deputados", "Deputados"],
  ["municipios", "Municípios"],
] as const;

export default async function EstadoPage({ params }: { params: Promise<{ uf: string }> }) {
  const { uf: param } = await params;
  const sigla = param.toUpperCase();
  const info = UF_POR_SIGLA[sigla];
  if (!info) notFound();

  const cargoLocal = cargoDeputadoLocal(sigla);
  const [gov, sen, pres, presBr, depFed, depLocal, municipios, presMun] = await Promise.all([
    resultado(sigla, "governador"),
    resultado(sigla, "senador"),
    resultado(sigla, "presidente"),
    resultado("br", "presidente"),
    resultado(sigla, "depFederal"),
    resultado(sigla, cargoLocal),
    municipiosDoUf(sigla),
    resultadoMunicipal(sigla, "presidente"),
  ]);
  const [mGov, mSen, mPres] = await Promise.all([
    areasMunicipais(sigla, "governador"),
    areasMunicipais(sigla, "senador"),
    areasMunicipais(sigla, "presidente", refs(presBr)),
  ]);

  const itensMunicipios = municipios.map((m) => {
    const r = presMun.municipios[m.ibge];
    let melhor = 0;
    r?.v.forEach((x, i) => x > r.v[melhor] && (melhor = i));
    return {
      nome: m.nome,
      href: `/estados/${param}/${m.slug}`,
      vencedor: r ? titleCase(presMun.candidatos[melhor].nome) : "",
      pct: r && r.validos ? (r.v[melhor] / r.validos) * 100 : 0,
    };
  });
  const rotuloLocal = cargoLocal === "depDistrital" ? "Deputados distritais" : "Deputados estaduais";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="pt-8 pb-6 sm:pt-12">
        <p className="text-sm text-ink-2">
          <Link href="/estados" className="hover:underline">
            Estados
          </Link>{" "}
          / Região {REGIOES[info.regiao]}
        </p>
        <h1 className="display mt-2 text-5xl sm:text-7xl">{info.nome}</h1>
        <p className="mt-4 max-w-[48ch] text-xl">{resumoGovernador(gov)}.</p>
        <div className="mt-3">
          <Totalizacao totais={gov.totais} atualizadoEm={gov.atualizadoEm} />
        </div>
      </header>

      <nav aria-label="Seções" className="sticky top-0 z-20 -mx-4 mb-8 border-y border-line bg-page/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <ul className="flex gap-1 overflow-x-auto py-2 text-sm">
          {SECOES.map(([id, rotulo]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded px-2.5 py-1 whitespace-nowrap text-ink-2 hover:bg-wash hover:text-ink">
                {rotulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="governador" className="scroll-mt-16 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <h2 className="mb-5 text-lg font-semibold">Governador</h2>
          <Placar candidatos={gov.candidatos} cargo="governador" uf={sigla} />
        </div>
        <div>
          <h2 className="sr-only">Mapa por município</h2>
          <MapaEstado
            uf={sigla}
            camadas={[
              { id: "governador", rotulo: "Governador", ...mGov },
              { id: "senador", rotulo: "Senado", ...mSen },
              { id: "presidente", rotulo: "Presidente", ...mPres },
            ]}
          />
        </div>
      </section>

      <section className="mt-10">
        <Totais totais={gov.totais} />
      </section>

      <section id="senado" className="scroll-mt-16 mt-16 border-t border-line pt-10">
        <h2 className="display text-3xl">Senado</h2>
        <p className="mt-2 mb-6 max-w-[60ch] text-ink-2">
          Em 2026 cada estado elegeu {sen.cargo.vagas} senadores, renovando dois terços do Senado. Os dois mais votados
          estão eleitos; não há 2º turno.
        </p>
        <div className="max-w-2xl">
          <Placar candidatos={sen.candidatos} cargo="senador" uf={sigla} destaque={4} />
        </div>
      </section>

      <section id="presidente" className="scroll-mt-16 mt-16 border-t border-line pt-10">
        <h2 className="display text-3xl">Presidente em {info.nome}</h2>
        <p className="mt-2 mb-6 max-w-[60ch] text-ink-2">
          Como o estado votou para Presidente. As cores são as mesmas do{" "}
          <Link href="/presidente" className="underline underline-offset-2">
            resultado nacional
          </Link>
          .
        </p>
        <div className="max-w-2xl">
          <Placar candidatos={pres.candidatos} cargo="presidente" uf="br" referencia={presBr.candidatos} destaque={3} />
        </div>
      </section>

      <section id="deputados" className="scroll-mt-16 mt-16 border-t border-line pt-10">
        <h2 className="display text-3xl">Deputados</h2>
        <div className="mt-3 mb-8">
          <ExplicacaoQuociente resultado={depFed} />
        </div>
        <div className="grid gap-12 lg:grid-cols-2">
          {(
            [
              ["Deputados federais", depFed],
              [rotuloLocal, depLocal],
            ] as const
          ).map(([rotulo, r]) => (
            <div key={rotulo}>
              <h3 className="text-lg font-semibold">
                {rotulo}: {r.cargo.vagas} {r.cargo.vagas === 1 ? "vaga" : "vagas"}
              </h3>
              <p className="mt-1 mb-4 text-sm text-ink-2">
                Cadeiras por partido. Quociente eleitoral: {r.cargo.quociente?.toLocaleString("pt-BR")} votos.
              </p>
              <Bancada resultado={r} />
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-semibold">Ver os {r.cargo.vagas} eleitos</summary>
                <div className="mt-3">
                  <TabelaEleitos resultado={r} uf={sigla} />
                </div>
              </details>
            </div>
          ))}
        </div>
      </section>

      <section id="municipios" className="scroll-mt-16 mt-16 border-t border-line pt-10">
        <h2 className="display text-3xl">Municípios</h2>
        <p className="mt-2 mb-6 max-w-[60ch] text-ink-2">
          {municipios.length === 1
            ? "O Distrito Federal tem um único município, Brasília."
            : `Os ${municipios.length} municípios de ${info.nome}, com quem venceu para Presidente em cada um.`}
        </p>
        <BuscaMunicipios itens={itensMunicipios} uf={sigla} />
      </section>
    </div>
  );
}
