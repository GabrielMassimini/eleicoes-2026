"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface ItemMunicipio {
  nome: string;
  href: string;
  /** Nome do vencedor de Presidente no município, para dar contexto na lista. */
  vencedor: string;
  pct: number;
}

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function BuscaMunicipios({ itens, uf }: { itens: ItemMunicipio[]; uf: string }) {
  const [q, setQ] = useState("");
  const [todos, setTodos] = useState(false);
  const filtrados = useMemo(() => {
    const t = normalizar(q.trim());
    return t ? itens.filter((i) => normalizar(i.nome).includes(t)) : itens;
  }, [q, itens]);
  const visiveis = todos || q ? filtrados : filtrados.slice(0, 24);

  return (
    <div>
      <label className="block max-w-sm">
        <span className="text-sm text-ink-2">Buscar município em {uf}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Digite o nome"
          className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-base placeholder:text-muted"
        />
      </label>
      {filtrados.length === 0 ? (
        <p className="mt-4 text-sm text-ink-2">Nenhum município com &quot;{q}&quot;. Confira a grafia, sem precisar de acentos.</p>
      ) : (
        <ul className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((i) => (
            <li key={i.href} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-sm">
              <Link href={i.href} className="truncate hover:underline">
                {i.nome}
              </Link>
              <span className="shrink-0 text-xs text-ink-2">
                {i.vencedor} {i.pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
              </span>
            </li>
          ))}
        </ul>
      )}
      {!todos && !q && filtrados.length > 24 && (
        <button type="button" onClick={() => setTodos(true)} className="mt-4 text-sm font-semibold underline underline-offset-2">
          Mostrar os {filtrados.length} municípios
        </button>
      )}
    </div>
  );
}
