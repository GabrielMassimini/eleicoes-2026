import type { Metadata } from "next";
import Link from "next/link";
import { ListaDisputas, MosaicoUf } from "@/components/MosaicoUf";
import { disputasEstaduais } from "@/lib/data/load";
import { titleCase } from "@/lib/format";
import { REGIOES, type RegiaoId, UFS } from "@/lib/tse/regioes";

export const metadata: Metadata = { title: "Estados" };

export default async function EstadosPage() {
  const [governadores, senadores] = await Promise.all([disputasEstaduais("governador"), disputasEstaduais("senador")]);
  const segundo = governadores.filter((g) => g.segundoTurno.length === 2).length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <header className="pt-10 pb-8 sm:pt-14">
        <h1 className="display text-4xl sm:text-6xl">Estados</h1>
        <p className="mt-3 max-w-[60ch] text-ink-2">
          {27 - segundo} governadores foram eleitos no 1º turno e {segundo} disputas continuam em 25 de outubro. Escolha um
          estado para ver Governador, Senado, Presidente, deputados e cada município.
        </p>
      </header>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <MosaicoUf disputas={governadores} cargo="Governador" />
        <ListaDisputas disputas={governadores} />
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="display text-3xl">Senadores eleitos</h2>
        <p className="mt-2 mb-6 max-w-[60ch] text-ink-2">Dois por estado, 54 cadeiras renovadas.</p>
        <div className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(REGIOES) as RegiaoId[]).map((reg) => (
            <div key={reg} className="mb-8">
              <h3 className="mb-2 font-semibold">{REGIOES[reg]}</h3>
              <ul className="divide-y divide-line text-sm">
                {UFS.filter((u) => u.regiao === reg).map((u) => {
                  const d = senadores.find((s) => s.uf === u.sigla)!;
                  return (
                    <li key={u.sigla} className="flex gap-3 py-2">
                      <Link href={`/estados/${u.sigla.toLowerCase()}#senado`} className="w-8 shrink-0 font-semibold hover:underline">
                        {u.sigla}
                      </Link>
                      <span className="text-ink-2">
                        {d.eleitos.length
                          ? d.eleitos.map((c, i) => (
                              <span key={c.sq}>
                                {i > 0 && ", "}
                                <span className="text-ink">{titleCase(c.nome)}</span> ({c.partido})
                              </span>
                            ))
                          : "Sem eleitos"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

