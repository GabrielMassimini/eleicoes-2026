import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapaResultado } from "@/components/map/MapaResultado";
import { areasMunicipais, presidentePorUf, refs } from "@/lib/data/agregados";
import { indiceCandidatos, perfilCandidato, resultado } from "@/lib/data/load";
import { fmtInt, fmtPct, idade, titleCase } from "@/lib/format";
import { CARGOS, urlFoto } from "@/lib/tse/urls";
import { UF_POR_SIGLA } from "@/lib/tse/regioes";

// Majoritários e deputados eleitos são gerados no build; os demais (~18 mil) sob demanda e cacheados.
export const dynamicParams = true;
export const revalidate = false;

export async function generateStaticParams() {
  const indice = await indiceCandidatos();
  const params: { sq: string }[] = [];
  const eleitosPorArquivo = new Map<string, Set<string>>();
  for (const [sq, [uf, cargo]] of Object.entries(indice)) {
    if (cargo === "presidente" || cargo === "governador" || cargo === "senador") {
      params.push({ sq });
      continue;
    }
    const chave = `${uf}/${cargo}`;
    if (!eleitosPorArquivo.has(chave)) {
      const r = await resultado(uf, cargo);
      eleitosPorArquivo.set(chave, new Set(r.candidatos.filter((c) => c.eleito).map((c) => c.sq)));
    }
    if (eleitosPorArquivo.get(chave)!.has(sq)) params.push({ sq });
  }
  return params;
}

async function carregar(sq: string) {
  const indice = await indiceCandidatos();
  const entrada = indice[sq];
  if (!entrada) return null;
  const [uf, cargo] = entrada;
  const [perfil, res] = await Promise.all([perfilCandidato(uf, sq), resultado(uf, cargo)]);
  if (!perfil) return null;
  const posicao = res.candidatos.findIndex((c) => c.sq === sq);
  return { uf, cargo, perfil, res, cand: posicao >= 0 ? res.candidatos[posicao] : undefined, posicao };
}

export async function generateMetadata({ params }: { params: Promise<{ sq: string }> }): Promise<Metadata> {
  const { sq } = await params;
  const d = await carregar(sq);
  if (!d) return {};
  const local = d.uf === "br" ? "" : ` (${d.uf.toUpperCase()})`;
  return {
    title: `${titleCase(d.perfil.nome)}, ${CARGOS[d.cargo].nome}${local}`,
    description: `Votação, perfil e patrimônio declarado de ${titleCase(d.perfil.nomeCompleto)} nas Eleições 2026.`,
  };
}

const fmtMoeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const cap = (s?: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : undefined);

export default async function CandidatoPage({ params }: { params: Promise<{ sq: string }> }) {
  const { sq } = await params;
  const d = await carregar(sq);
  if (!d) notFound();
  const { uf, cargo, perfil, res, cand, posicao } = d;

  const nomeCargo = CARGOS[cargo].nome;
  const local = uf === "br" ? "Brasil" : UF_POR_SIGLA[uf.toUpperCase()].nome;
  const majoritario = cargo === "presidente" || cargo === "governador" || cargo === "senador";
  const anos = idade(perfil.nascimento);
  const temProposta = existsSync(path.join(process.cwd(), "public", "propostas", `${sq}.pdf`));

  let mapa: React.ReactNode = null;
  if (cand && majoritario) {
    if (cargo === "presidente") {
      const { candidatos, areas } = await presidentePorUf();
      mapa = (
        <MapaResultado
          geo="/geo/br-uf.json"
          candidatos={candidatos}
          areas={areas}
          unidade="estado"
          titulo={`Votos de ${titleCase(perfil.nome)} por estado`}
          modoInicial="percentual"
          candidatoInicial={candidatos.findIndex((c) => c.sq === sq)}
        />
      );
    } else {
      const { candidatos, areas } = await areasMunicipais(uf, cargo, refs(res));
      mapa = (
        <MapaResultado
          geo={`/geo/uf/${uf.toUpperCase()}.json`}
          candidatos={candidatos}
          areas={areas}
          unidade="município"
          titulo={`Votos de ${titleCase(perfil.nome)} por município`}
          modoInicial="percentual"
          candidatoInicial={candidatos.findIndex((c) => c.sq === sq)}
        />
      );
    }
  }

  const ficha: [string, string | undefined][] = [
    ["Nome completo", titleCase(perfil.nomeCompleto)],
    ["Número", perfil.numero],
    ["Partido", `${perfil.partidoNome} (${perfil.partido})`],
    ["Federação", perfil.federacao ? titleCase(perfil.federacao) : undefined],
    ["Coligação", perfil.coligacao ? `${titleCase(perfil.coligacao)}${perfil.composicao ? `: ${perfil.composicao}` : ""}` : undefined],
    ["Idade", anos !== undefined ? `${anos} anos` : undefined],
    ["Nascido(a) em", perfil.ufNascimento],
    ["Gênero", cap(perfil.genero)],
    ["Cor/raça declarada", cap(perfil.corRaca)],
    ["Escolaridade", cap(perfil.instrucao)],
    ["Estado civil", cap(perfil.estadoCivil)],
    ["Ocupação declarada", cap(perfil.ocupacao)],
    ["Situação da candidatura", cap(perfil.situacaoCandidatura)],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="grid gap-6 pt-8 pb-10 sm:grid-cols-[8rem_1fr] sm:pt-12">
        <img
          src={urlFoto(cargo, 1, uf, sq)}
          alt={`Foto de ${titleCase(perfil.nome)}`}
          width={128}
          height={172}
          className="h-[172px] w-32 rounded-lg bg-wash object-cover"
        />
        <div>
          <p className="text-sm text-ink-2">
            {nomeCargo}
            {uf !== "br" && (
              <>
                {" "}
                em{" "}
                <Link href={`/estados/${uf}`} className="hover:underline">
                  {local}
                </Link>
              </>
            )}
          </p>
          <h1 className="display mt-1 text-4xl sm:text-6xl">{titleCase(perfil.nome)}</h1>
          <p className="mt-2 text-ink-2">
            {perfil.partido}, número {perfil.numero}
          </p>
          {cand ? (
            <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <p className="text-5xl font-bold">{fmtPct(cand.pct)}</p>
                <p className="mt-1 text-sm text-ink-2">dos votos válidos ({local})</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{fmtInt(cand.votos)}</p>
                <p className="mt-1 text-sm text-ink-2">votos, {posicao + 1}º de {res.candidatos.length}</p>
              </div>
              <p className={`rounded-full px-3 py-1 text-sm font-semibold ${cand.eleito ? "bg-ink text-page" : "border border-line"}`}>
                {cand.segundoTurno ? "Vai ao 2º turno" : cand.situacao}
              </p>
            </div>
          ) : (
            <p className="mt-5 max-w-[55ch] text-ink-2">
              Não há votação nominal registrada para esta candidatura no 1º turno
              {perfil.situacaoCandidatura ? ` (situação: ${cap(perfil.situacaoCandidatura)?.toLowerCase()})` : ""}.
            </p>
          )}
          {cand && cand.vices.length > 0 && (
            <p className="mt-4 text-sm text-ink-2">
              {cand.vices.map((v, i) => (
                <span key={v.sq}>
                  {i > 0 && "; "}
                  {v.tipo === "vice" ? "Vice" : v.tipo === "suplente1" ? "1º suplente" : "2º suplente"}:{" "}
                  <span className="text-ink">{titleCase(v.nome)}</span>
                  {v.partido ? ` (${v.partido})` : ""}
                </span>
              ))}
            </p>
          )}
        </div>
      </header>

      {mapa && (
        <section className="border-t border-line pt-10">
          <h2 className="display mb-2 text-3xl">Onde teve mais votos</h2>
          <p className="mb-6 max-w-[60ch] text-ink-2">
            Percentual dos votos válidos em cada {cargo === "presidente" ? "estado" : "município"}. Troque o modo para comparar
            com os adversários.
          </p>
          {mapa}
        </section>
      )}

      <section className="mt-16 grid gap-12 border-t border-line pt-10 lg:grid-cols-2">
        <div>
          <h2 className="display mb-6 text-3xl">Perfil</h2>
          <dl className="divide-y divide-line text-sm">
            {ficha
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[11rem_1fr] gap-3 py-2">
                  <dt className="text-ink-2">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          <p className="mt-3 text-xs text-ink-2">Dados autodeclarados no registro de candidatura (TSE, consulta_cand_2026).</p>
        </div>

        <div>
          <h2 className="display mb-2 text-3xl">Patrimônio declarado</h2>
          {perfil.bens.quantidade > 0 ? (
            <>
              <p className="text-4xl font-bold">{fmtMoeda(perfil.bens.total)}</p>
              <p className="mt-1 text-sm text-ink-2">
                Soma de {perfil.bens.quantidade} {perfil.bens.quantidade === 1 ? "bem declarado" : "bens declarados"} ao TSE.
              </p>
              <table className="mt-6 w-full text-sm">
                <caption className="mb-2 text-left text-ink-2">
                  {perfil.bens.quantidade > perfil.bens.maiores.length ? "Os maiores bens" : "Bens"}
                </caption>
                <tbody>
                  {perfil.bens.maiores.map((b, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="py-2 pr-4">
                        <span className="block">{cap(b.descricao) || b.tipo}</span>
                        <span className="text-xs text-ink-2">{b.tipo}</span>
                      </td>
                      <td className="num py-2 text-right whitespace-nowrap">{fmtMoeda(b.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-ink-2">Nenhum bem declarado ao TSE.</p>
          )}
        </div>
      </section>

      {(cargo === "presidente" || cargo === "governador") && (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="display mb-2 text-3xl">Proposta de governo</h2>
          {temProposta ? (
            <>
              <p className="mb-4 text-ink-2">Documento registrado no TSE junto com a candidatura.</p>
              <object data={`/propostas/${sq}.pdf`} type="application/pdf" className="h-[80vh] w-full rounded-lg border border-line">
                <a href={`/propostas/${sq}.pdf`} className="underline">
                  Abrir a proposta em PDF
                </a>
              </object>
            </>
          ) : (
            <p className="max-w-[60ch] text-ink-2">
              A proposta registrada pela candidatura está disponível no{" "}
              <a href="https://divulgacandcontas.tse.jus.br/" className="underline underline-offset-2">
                DivulgaCandContas
              </a>
              , o sistema do TSE com registro, bens e prestação de contas de cada candidato.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
