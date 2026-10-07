import Link from "next/link";
import { MapaResultado } from "@/components/map/MapaResultado";
import { ListaDisputas, MosaicoUf } from "@/components/MosaicoUf";
import { Placar } from "@/components/Placar";
import { Totais, Totalizacao } from "@/components/Totais";
import { presidentePorUf } from "@/lib/data/agregados";
import { disputasEstaduais } from "@/lib/data/load";
import { titleCase } from "@/lib/format";

export default async function Home() {
  const { br, candidatos, areas } = await presidentePorUf();
  const governadores = await disputasEstaduais("governador");

  const finalistas = br.candidatos.filter((c) => c.segundoTurno);
  const eleito = br.candidatos.find((c) => c.eleito);
  const manchete =
    finalistas.length === 2
      ? `${titleCase(finalistas[0].nome)} e ${titleCase(finalistas[1].nome)} disputam a Presidência no 2º turno`
      : eleito
        ? `${titleCase(eleito.nome)} é eleito presidente no 1º turno`
        : "Resultado do 1º turno para Presidente";

  const govSegundo = governadores.filter((g) => g.segundoTurno.length === 2).length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <section className="pt-10 pb-8 sm:pt-14">
        <p className="text-sm text-ink-2">Eleições 2026, 1º turno em 4 de outubro</p>
        <h1 className="display mt-3 max-w-[22ch] text-4xl sm:text-6xl">{manchete}</h1>
        <div className="mt-4">
          <Totalizacao totais={br.totais} atualizadoEm={br.atualizadoEm} />
        </div>
        <Link
          href="/ao-vivo"
          className="mt-6 inline-flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm hover:bg-wash"
        >
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-ink" />
          <span>
            <span className="font-semibold">2º turno em 25 de outubro.</span>{" "}
            <span className="text-ink-2">Acompanhe a apuração ao vivo a partir das 17h.</span>
          </span>
        </Link>
      </section>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <h2 className="sr-only">Mapa do resultado para Presidente por estado</h2>
          <MapaResultado geo="/geo/br-uf.json" candidatos={candidatos} areas={areas} unidade="estado" titulo="Presidente por estado" />
          <p className="mt-3 text-sm">
            <Link href="/presidente" className="font-semibold underline underline-offset-2">
              Ver Presidente por município
            </Link>
          </p>
        </div>
        <div>
          <h2 className="mb-5 text-lg font-semibold">Presidente, Brasil</h2>
          <Placar candidatos={br.candidatos} cargo="presidente" uf="br" />
        </div>
      </section>

      <section className="mt-10">
        <Totais totais={br.totais} />
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="display text-3xl sm:text-4xl">
          {govSegundo === 0
            ? "Todos os governadores foram definidos no 1º turno"
            : `${govSegundo} ${govSegundo === 1 ? "estado volta" : "estados voltam"} às urnas para escolher governador`}
        </h2>
        <p className="mt-3 max-w-[60ch] text-ink-2">
          Os quadrados preenchidos são as disputas que vão ao 2º turno em 25 de outubro. Nos demais estados, o governador
          já foi eleito. Toque em um estado para ver o resultado completo, inclusive Senado e deputados.
        </p>
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <MosaicoUf disputas={governadores} cargo="Governador" />
          <ListaDisputas disputas={governadores} />
        </div>
      </section>
    </div>
  );
}
