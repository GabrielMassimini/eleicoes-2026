import type { Metadata } from "next";
import Link from "next/link";
import { resultado } from "@/lib/data/load";
import { fmtHora } from "@/lib/format";

export const metadata: Metadata = { title: "Sobre os dados" };

const FONTES = [
  {
    nome: "Resultados do TSE (resultados.tse.jus.br)",
    uso: "Votação por país, estado e município de todos os cargos, totalização e fotos dos candidatos. São os mesmos arquivos que alimentam o site oficial de resultados do TSE.",
    href: "https://resultados.tse.jus.br/oficial/app/index.html",
  },
  {
    nome: "Portal de Dados Abertos do TSE",
    uso: "Perfil das candidaturas (consulta_cand_2026) e bens declarados (bem_candidato_2026).",
    href: "https://dadosabertos.tse.jus.br/",
  },
  {
    nome: "IBGE, Malha Municipal 2025",
    uso: "Contornos dos estados e municípios usados nos mapas, simplificados para carregar rápido.",
    href: "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html",
  },
];

export default async function SobrePage() {
  const br = await resultado("br", "presidente");
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <header className="pt-10 pb-8 sm:pt-14">
        <h1 className="display text-4xl sm:text-6xl">Sobre os dados</h1>
        <p className="mt-4 text-lg text-ink-2">
          Este painel reorganiza os resultados oficiais das Eleições 2026 para que dê para explorar por mapa, estado,
          município e candidato. Nenhum número é estimado: tudo vem do Tribunal Superior Eleitoral.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Fontes</h2>
        <ul className="space-y-5">
          {FONTES.map((f) => (
            <li key={f.nome}>
              <a href={f.href} className="font-semibold underline underline-offset-2">
                {f.nome}
              </a>
              <p className="mt-1 text-ink-2">{f.uso}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-2">Resultado do 1º turno conforme publicado pelo TSE em {fmtHora(br.atualizadoEm)}.</p>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold">Como ler os números</h2>
        <ul className="list-disc space-y-3 pl-5 text-ink-2">
          <li>
            <span className="text-ink">Percentuais</span> de candidatos são sobre os votos válidos (sem brancos e nulos), como
            na regra oficial. Brancos e nulos são mostrados sobre o total de votos.
          </li>
          <li>
            <span className="text-ink">Cores</span> identificam os três candidatos mais votados na disputa (Brasil para
            Presidente, o estado para Governador e Senado) e não mudam de um mapa para outro. Os demais aparecem em cinza
            como &quot;Outros&quot;. A paleta foi verificada para leitura por pessoas com daltonismo.
          </li>
          <li>
            <span className="text-ink">Mapas</span> têm três modos: quem venceu, percentual de um candidato (faixas fixas,
            para comparar regiões com a mesma régua) e diferença entre os dois primeiros em pontos percentuais.
          </li>
          <li>
            <span className="text-ink">Deputados</span> são eleitos pelo sistema proporcional: as vagas de cada partido ou
            federação dependem do quociente eleitoral, e só então vão para os mais votados da lista.
          </li>
        </ul>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold">2º turno ao vivo</h2>
        <p className="text-ink-2">
          No dia 25 de outubro, a página{" "}
          <Link href="/ao-vivo" className="text-ink underline underline-offset-2">
            2º turno ao vivo
          </Link>{" "}
          consulta os arquivos de resultado do TSE a cada 5 segundos. Uma disputa aparece como &quot;não pode mais ser
          alcançada&quot; quando a vantagem do líder supera o número de eleitores aptos nas seções que ainda faltam
          totalizar. É uma conta, não uma projeção estatística. O resultado oficial é sempre o divulgado pelo TSE.
        </p>
        <p className="text-ink-2">
          Para ver o comportamento da página antes do dia, há uma{" "}
          <Link href="/ao-vivo/simulacao" className="text-ink underline underline-offset-2">
            simulação
          </Link>{" "}
          que usa os números do 1º turno.
        </p>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold">Independência</h2>
        <p className="text-ink-2">
          Projeto pessoal e independente, sem vínculo com o TSE, partidos ou candidaturas. Os dados públicos foram apenas
          organizados e visualizados. Para fins oficiais, consulte sempre o site do Tribunal Superior Eleitoral.
        </p>
      </section>
    </div>
  );
}
