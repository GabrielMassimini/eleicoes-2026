"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Amostra } from "@/components/Amostra";
import { fmtInt, fmtPct, titleCase } from "@/lib/format";
import { corDoPartidoTema } from "@/lib/partidos";

export interface LinhaCandidato {
  sq: string;
  nome: string;
  partido: string;
  votos: number;
  /** % dos votos válidos na abrangência exibida (UF ou município). */
  pct: number;
  /** Situação na disputa da UF ("Eleito por QP", "Suplente"...). */
  situacao: string;
  eleito: boolean;
}

type FiltroSituacao = "todos" | "eleitos" | "suplentes" | "nao-eleitos";

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PASSO = 50;

/** Lista completa e filtrável de candidatos de uma eleição proporcional. */
export function ListaCandidatos({ linhas, rotulo, local }: { linhas: LinhaCandidato[]; rotulo: string; local: string }) {
  const [busca, setBusca] = useState("");
  const [partido, setPartido] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("todos");
  const [limite, setLimite] = useState(PASSO);

  const partidos = useMemo(() => [...new Set(linhas.map((l) => l.partido))].sort((a, b) => a.localeCompare(b)), [linhas]);
  const posicao = useMemo(() => new Map(linhas.map((l, i) => [l.sq, i + 1])), [linhas]);

  const filtradas = useMemo(() => {
    const t = normalizar(busca.trim());
    return linhas.filter(
      (l) =>
        (!t || normalizar(l.nome).includes(t)) &&
        (!partido || l.partido === partido) &&
        (situacao === "todos" ||
          (situacao === "eleitos" && l.eleito) ||
          (situacao === "suplentes" && l.situacao === "Suplente") ||
          (situacao === "nao-eleitos" && !l.eleito && l.situacao !== "Suplente")),
    );
  }, [linhas, busca, partido, situacao]);

  const visiveis = filtradas.slice(0, limite);
  const resetar = () => setLimite(PASSO);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3" role="search" aria-label={`Filtrar ${rotulo}`}>
        <label className="min-w-[12rem] flex-1">
          <span className="text-sm text-ink-2">Nome</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              resetar();
            }}
            placeholder="Buscar candidato"
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-base placeholder:text-muted"
          />
        </label>
        <label>
          <span className="text-sm text-ink-2">Partido</span>
          <select
            value={partido}
            onChange={(e) => {
              setPartido(e.target.value);
              resetar();
            }}
            className="mt-1 block rounded-md border border-line bg-surface px-2 py-2 text-sm"
          >
            <option value="">Todos</option>
            {partidos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm text-ink-2">Situação</span>
          <select
            value={situacao}
            onChange={(e) => {
              setSituacao(e.target.value as FiltroSituacao);
              resetar();
            }}
            className="mt-1 block rounded-md border border-line bg-surface px-2 py-2 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="eleitos">Eleitos</option>
            <option value="suplentes">Suplentes</option>
            <option value="nao-eleitos">Não eleitos</option>
          </select>
        </label>
      </div>

      <p className="mt-4 text-sm text-ink-2" aria-live="polite">
        {filtradas.length === linhas.length
          ? `${fmtInt(linhas.length)} candidatos com votos em ${local}, do mais ao menos votado.`
          : `${fmtInt(filtradas.length)} de ${fmtInt(linhas.length)} candidatos.`}
      </p>

      {filtradas.length === 0 ? (
        <p className="mt-4 text-sm text-ink-2">Nenhum candidato com esses filtros. Limpe a busca ou escolha outro partido.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="border-b border-line text-left text-ink-2">
              <tr>
                <th className="w-12 px-3 py-2.5 text-right font-normal">#</th>
                <th className="px-3 py-2.5 font-normal">Candidato</th>
                <th className="px-3 py-2.5 font-normal">Partido</th>
                <th className="px-3 py-2.5 text-right font-normal">Votos</th>
                <th className="px-3 py-2.5 text-right font-normal">%</th>
                <th className="px-3 py-2.5 font-normal">Situação</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => (
                <tr key={l.sq} className="border-b border-line last:border-0 hover:bg-wash">
                  <td className="num px-3 py-1.5 text-right text-ink-2">{posicao.get(l.sq)}</td>
                  <td className="px-3 py-1.5">
                    <Link href={`/candidatos/${l.sq}`} className={`hover:underline ${l.eleito ? "font-semibold" : ""}`}>
                      {titleCase(l.nome)}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-ink-2">
                      <Amostra cor={corDoPartidoTema(l.partido)} className="size-2.5" />
                      {l.partido}
                    </span>
                  </td>
                  <td className="num px-3 py-1.5 text-right">{fmtInt(l.votos)}</td>
                  <td className="num px-3 py-1.5 text-right text-ink-2">{fmtPct(l.pct)}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-ink-2">{l.eleito ? l.situacao : l.situacao === "Suplente" ? "Suplente" : "Não eleito"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtradas.length > limite && (
        <button type="button" onClick={() => setLimite((n) => n + PASSO * 2)} className="mt-4 text-sm font-semibold underline underline-offset-2">
          Mostrar mais ({fmtInt(filtradas.length - limite)} restantes)
        </button>
      )}
    </div>
  );
}
