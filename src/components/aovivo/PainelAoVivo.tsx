"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MapaResultado, type AreaInfo } from "@/components/map/MapaResultado";
import type { DisputaAoVivo, FinalistasIniciais, MunicipiosAoVivo, PainelAoVivo as Painel } from "@/lib/aovivo/tipos";
import { Amostra } from "@/components/Amostra";
import { fmtInt, fmtPct, titleCase } from "@/lib/format";
import { coresDaDisputa, type CorCandidato, estiloCor } from "@/lib/partidos";
import { UF_POR_SIGLA, UFS } from "@/lib/tse/regioes";
import { type CargoId, urlFoto } from "@/lib/tse/urls";

const INICIO_APURACAO = new Date("2026-10-25T17:00:00-03:00").getTime();

function usePainel(url: string, intervalo: number) {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [ultimaBusca, setUltimaBusca] = useState(0);

  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setTimeout>;
    const buscar = async () => {
      setCarregando(true);
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const p = (await res.json()) as Painel;
        if (vivo) {
          setPainel(p);
          setErro(false);
        }
      } catch {
        if (vivo) setErro(true);
      } finally {
        if (vivo) {
          setCarregando(false);
          setUltimaBusca(Date.now());
          timer = setTimeout(buscar, document.hidden ? intervalo * 2 : intervalo);
        }
      }
    };
    buscar();
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [url, intervalo]);

  return { painel, erro, carregando, ultimaBusca };
}

function useAgora(passo = 1000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), passo);
    return () => clearInterval(t);
  }, [passo]);
  return agora;
}

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function PainelAoVivo({ iniciais, simulacao }: { iniciais: FinalistasIniciais; simulacao: boolean }) {
  // A cada 5 s; com a aba em segundo plano, a cada 10 s.
  const intervalo = 5_000;
  const { painel, erro, carregando, ultimaBusca } = usePainel(simulacao ? "/api/ao-vivo/simulacao" : "/api/ao-vivo", intervalo);
  const agora = useAgora();
  const ordemPres = iniciais.presidente.map((c) => c.sq);
  const coresPres = useMemo(() => coresDaDisputa(iniciais.presidente), [iniciais]);

  if (!painel) {
    return <p className="py-20 text-center text-ink-2">{erro ? "Não foi possível falar com o servidor. Tentando de novo…" : "Carregando a apuração…"}</p>;
  }

  if (painel.modo === "aguardando" || !painel.presidente) {
    return <Aguardando iniciais={iniciais} agora={agora} />;
  }

  const proxima = Math.max(0, Math.ceil((ultimaBusca + intervalo - agora) / 1000));

  return (
    <div className={carregando ? "transition-opacity" : ""}>
      <BarraStatus painel={painel} disputa={painel.presidente} proxima={proxima} erro={erro} simulacao={simulacao} />
      <Confronto disputa={painel.presidente} ordem={ordemPres} cores={coresPres} cargo="presidente" uf="br" titulo="Presidente" grande />
      <MapaAoVivo painel={painel} iniciais={iniciais} />
      <MunicipiosAoVivoSecao iniciais={iniciais} simulacao={simulacao} intervalo={intervalo} />
      {painel.governadores.length > 0 && (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="display text-3xl">Governadores</h2>
          <p className="mt-2 mb-8 max-w-[60ch] text-ink-2">
            {painel.governadores.length} estados escolhem o governador no 2º turno. Cada quadro tem a própria totalização.
          </p>
          <div className="grid gap-x-10 gap-y-12 md:grid-cols-2">
            {painel.governadores.map((g) => {
              const ini = iniciais.governadores.find((x) => x.uf === g.abrangencia);
              return (
                <Confronto
                  key={g.abrangencia}
                  disputa={g}
                  ordem={ini?.candidatos.map((c) => c.sq) ?? g.candidatos.map((c) => c.sq)}
                  cores={coresDaDisputa(ini?.candidatos ?? g.candidatos)}
                  cargo="governador"
                  uf={g.abrangencia}
                  titulo={UF_POR_SIGLA[g.abrangencia.toUpperCase()].nome}
                  href={`/estados/${g.abrangencia}`}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function BarraStatus({ painel, disputa, proxima, erro, simulacao }: { painel: Painel; disputa: DisputaAoVivo; proxima: number; erro: boolean; simulacao: boolean }) {
  const pct = disputa.totais.pctTotalizado;
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-line bg-page/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2 font-semibold">
          <span aria-hidden className={`size-2 shrink-0 rounded-full bg-ink ${disputa.finalizado ? "" : "animate-pulse"}`} />
          {simulacao ? "Simulação" : disputa.finalizado ? "Apuração encerrada" : "Ao vivo"}
        </span>
        <span className="num" aria-live="polite">
          {fmtPct(pct, pct === 100 ? 1 : 2)} das seções totalizadas
        </span>
        <span className="text-ink-2">Dados de {hora(disputa.atualizadoEm)}</span>
        {!disputa.finalizado && <span className="num text-ink-2">Atualiza em {proxima}s</span>}
        {(erro || painel.atrasado) && <span className="text-ink-2">Conexão instável: exibindo os últimos dados recebidos.</span>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Seções totalizadas">
        <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Confronto({
  disputa,
  ordem,
  cores,
  cargo,
  uf,
  titulo,
  href,
  grande,
}: {
  disputa: DisputaAoVivo;
  ordem: string[];
  cores: Record<string, CorCandidato>;
  cargo: CargoId;
  uf: string;
  titulo: string;
  href?: string;
  grande?: boolean;
}) {
  // Mantém a posição (esquerda/direita) e a cor de cada candidato fixas durante toda a apuração.
  const [a, b] = [...disputa.candidatos].sort((x, y) => ordem.indexOf(x.sq) - ordem.indexOf(y.sq));
  if (!a || !b) return null;
  const lider = a.votos >= b.votos ? a : b;
  const vantagem = Math.abs(a.votos - b.votos);
  const restante = Math.max(0, disputa.totais.eleitorado - disputa.totais.eleitoradoTotalizado);
  const eleito = disputa.candidatos.find((c) => c.eleito);

  let manchete: string;
  if (eleito && disputa.finalizado) manchete = `${titleCase(eleito.nome)} está eleito${cargo === "presidente" ? " presidente" : " governador"}`;
  else if (disputa.definido) manchete = `${titleCase(lider.nome)} não pode mais ser alcançado`;
  else if (disputa.totais.pctTotalizado === 0) manchete = "A totalização ainda não começou";
  else manchete = `${titleCase(lider.nome)} lidera por ${fmtInt(vantagem)} votos`;

  const explicacao =
    disputa.definido && !disputa.finalizado
      ? `A vantagem de ${fmtInt(vantagem)} votos já é maior que os ${fmtInt(restante)} eleitores das seções que faltam totalizar.`
      : !disputa.finalizado
        ? `Ainda faltam seções com ${fmtInt(restante)} eleitores aptos.`
        : `${fmtInt(disputa.totais.validos)} votos válidos.`;

  return (
    <section aria-label={titulo}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className={grande ? "text-lg font-semibold" : "text-base font-semibold"}>
          {href ? (
            <Link href={href} className="hover:underline">
              {titulo}
            </Link>
          ) : (
            titulo
          )}
        </h2>
        {!grande && <span className="num text-xs text-ink-2">{fmtPct(disputa.totais.pctTotalizado, 1)} totalizado</span>}
      </div>
      <p className={`mt-1 ${grande ? "display text-3xl sm:text-5xl" : "text-xl font-bold"}`} aria-live="polite">
        {manchete}
      </p>
      <p className="mt-2 text-sm text-ink-2">{explicacao}</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {[a, b].map((c, i) => (
          <div key={c.sq} className={`flex gap-3 ${i === 1 ? "flex-row-reverse text-right" : ""}`}>
            <img
              src={urlFoto(cargo, 1, uf, c.sq)}
              alt=""
              width={grande ? 72 : 48}
              height={grande ? 96 : 64}
              className={`${grande ? "h-24 w-[72px]" : "h-16 w-12"} shrink-0 rounded-md bg-wash object-cover`}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold">{titleCase(c.nome)}</p>
              <p className={`flex items-center gap-1.5 text-xs text-ink-2 ${i === 1 ? "justify-end" : ""}`}>
                <Amostra cor={cores[c.sq]} className="size-2.5" />
                {c.partido}
              </p>
              <p className={`mt-1 font-bold leading-none ${grande ? "text-4xl sm:text-6xl" : "text-3xl"}`}>{fmtPct(c.pct)}</p>
              <p className="num mt-1 text-xs text-ink-2">{fmtInt(c.votos)} votos</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-4">
        <div className="flex h-3 gap-[2px]" aria-hidden>
          <div className="cor-cand rounded-l-[4px] transition-[width] duration-700" style={{ ...estiloCor(cores[a.sq]), width: `${a.pct}%`, background: "var(--c)" }} />
          <div className="cor-cand rounded-r-[4px] transition-[width] duration-700" style={{ ...estiloCor(cores[b.sq]), width: `${b.pct}%`, background: "var(--c)" }} />
        </div>
        <span aria-hidden className="absolute -top-1 left-1/2 h-5 w-px bg-ink" />
        <span className="sr-only">Linha central marca 50% dos votos válidos.</span>
      </div>
    </section>
  );
}

function MapaAoVivo({ painel, iniciais }: { painel: Painel; iniciais: FinalistasIniciais }) {
  const candidatos = useMemo(() => iniciais.presidente.map((c) => ({ numero: "", sq: c.sq, nome: c.nome, partido: c.partido })), [iniciais]);
  const areas = useMemo(() => {
    const out: Record<string, AreaInfo> = {};
    for (const u of UFS) {
      const d = painel.presidentePorUf[u.sigla.toLowerCase()];
      if (!d) continue;
      out[u.ibge] = {
        nome: `${u.nome} (${fmtPct(d.totais.pctTotalizado, 1)} totalizado)`,
        href: `/estados/${u.sigla.toLowerCase()}`,
        validos: d.totais.validos,
        v: candidatos.map((c) => d.candidatos.find((x) => x.sq === c.sq)?.votos ?? 0),
      };
    }
    return out;
  }, [painel, candidatos]);

  return (
    <section className="mt-14 border-t border-line pt-10">
      <h2 className="display text-3xl">Presidente por estado</h2>
      <p className="mt-2 mb-6 max-w-[60ch] text-ink-2">Quem lidera em cada estado neste momento. Estados cinza ainda não têm seções totalizadas.</p>
      <MapaResultado geo="/geo/br-uf.json" candidatos={candidatos} areas={areas} unidade="estado" titulo="Presidente por estado, ao vivo" />
    </section>
  );
}

function MunicipiosAoVivoSecao({ iniciais, simulacao, intervalo }: { iniciais: FinalistasIniciais; simulacao: boolean; intervalo: number }) {
  const [uf, setUf] = useState("sp");
  const [dados, setDados] = useState<MunicipiosAoVivo | null>(null);
  const candidatos = useMemo(() => iniciais.presidente.map((c) => ({ numero: "", sq: c.sq, nome: c.nome, partido: c.partido })), [iniciais]);

  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setTimeout>;
    setDados(null);
    const buscar = async () => {
      try {
        const res = await fetch(`/api/ao-vivo/municipios/${uf}${simulacao ? "?simulacao=1" : ""}`, { cache: "no-store" });
        if (res.ok && vivo) setDados((await res.json()) as MunicipiosAoVivo);
      } catch {
        // mantém o último resultado; tenta de novo no próximo ciclo
      } finally {
        if (vivo) timer = setTimeout(buscar, document.hidden ? 20_000 : 10_000);
      }
    };
    buscar();
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [uf, simulacao, intervalo]);

  const areas = useMemo(() => {
    const out: Record<string, AreaInfo> = {};
    if (!dados) return out;
    for (const [ibge, m] of Object.entries(dados.municipios)) {
      const v = candidatos.map((c) => m.v[dados.candidatos.indexOf(c.sq)] ?? 0);
      out[ibge] = { nome: `${m.nome} (${fmtPct(m.pctTotalizado, 1)} totalizado)`, href: m.href, validos: m.validos, v };
    }
    return out;
  }, [dados, candidatos]);
  const contados = Object.keys(areas).length;

  return (
    <section className="mt-14 border-t border-line pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="display text-3xl">Presidente por município</h2>
          <p className="mt-2 max-w-[60ch] text-ink-2">
            Escolha um estado para acompanhar cada cidade. Municípios em cinza ainda não têm seções totalizadas.
          </p>
        </div>
        <label className="text-sm text-ink-2">
          Estado{" "}
          <select
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            className="ml-1 rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
          >
            {UFS.map((u) => (
              <option key={u.sigla} value={u.sigla.toLowerCase()}>
                {u.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="num mt-4 mb-4 text-sm text-ink-2">
        {dados ? `${contados} municípios com votos totalizados` : "Carregando municípios…"}
      </p>
      <MapaResultado
        key={uf}
        geo={`/geo/uf/${uf.toUpperCase()}.json`}
        candidatos={candidatos}
        areas={areas}
        unidade="município"
        titulo={`Presidente por município, ${UF_POR_SIGLA[uf.toUpperCase()].nome}, ao vivo`}
      />
    </section>
  );
}

function Aguardando({ iniciais, agora }: { iniciais: FinalistasIniciais; agora: number }) {
  const falta = INICIO_APURACAO - agora;
  const dias = Math.floor(falta / 86_400_000);
  const horas = Math.floor((falta % 86_400_000) / 3_600_000);
  const minutos = Math.floor((falta % 3_600_000) / 60_000);
  const segundos = Math.floor((falta % 60_000) / 1000);
  return (
    <div className="py-6">
      <p className="text-sm text-ink-2">2º turno em 25 de outubro de 2026</p>
      <h2 className="display mt-3 max-w-[20ch] text-4xl sm:text-6xl">
        {falta > 0 ? "A apuração começa às 17h, horário de Brasília" : "Aguardando os primeiros números do TSE"}
      </h2>
      {falta > 0 && (
        <p className="num mt-6 text-3xl font-bold sm:text-5xl" aria-live="off">
          {dias > 0 && `${dias}d `}
          {String(horas).padStart(2, "0")}h {String(minutos).padStart(2, "0")}m {String(segundos).padStart(2, "0")}s
        </p>
      )}
      <p className="mt-6 max-w-[60ch] text-ink-2">
        Esta página se atualiza sozinha quando o TSE publicar os resultados, a cada 5 segundos. Enquanto isso, veja como ela
        funciona numa{" "}
        <Link href="/ao-vivo/simulacao" className="font-semibold text-ink underline underline-offset-2">
          simulação com os números do 1º turno
        </Link>
        .
      </p>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">Presidente</h3>
          <ul className="mt-3 space-y-3">
            {iniciais.presidente.map((c) => (
              <li key={c.sq} className="flex items-center gap-3">
                <img src={urlFoto("presidente", 1, "br", c.sq)} alt="" width={40} height={54} className="h-[54px] w-10 rounded bg-wash object-cover" />
                <Amostra cor={coresDaDisputa(iniciais.presidente)[c.sq]} className="h-6 w-1.5" />
                <Link href={`/candidatos/${c.sq}`} className="font-semibold hover:underline">
                  {titleCase(c.nome)}
                </Link>
                <span className="text-ink-2">{c.partido}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Governador ({iniciais.governadores.length} estados)</h3>
          <ul className="mt-3 divide-y divide-line text-sm">
            {iniciais.governadores.map((g) => (
              <li key={g.uf} className="flex gap-3 py-2">
                <Link href={`/estados/${g.uf}`} className="w-8 shrink-0 font-semibold uppercase hover:underline">
                  {g.uf}
                </Link>
                <span className="text-ink-2">
                  {g.candidatos.map((c, i) => (
                    <span key={c.sq}>
                      {i > 0 && " × "}
                      <span className="text-ink">{titleCase(c.nome)}</span> ({c.partido})
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
