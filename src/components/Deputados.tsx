import { Amostra } from "@/components/Amostra";
import { fmtInt } from "@/lib/format";
import { corDoPartidoTema, estiloCor } from "@/lib/partidos";
import type { Resultado } from "@/lib/tse/normalize";

/** Cadeiras conquistadas por partido, a partir dos eleitos, nas cores de cada partido. */
export function Bancada({ resultado }: { resultado: Resultado }) {
  const porPartido = new Map<string, number>();
  for (const c of resultado.candidatos) if (c.eleito) porPartido.set(c.partido, (porPartido.get(c.partido) ?? 0) + 1);
  const linhas = [...porPartido.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const max = Math.max(...linhas.map(([, n]) => n), 1);

  return (
    <div>
      <ul className="space-y-1.5" aria-label="Cadeiras por partido">
        {linhas.map(([partido, n]) => (
          <li key={partido} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 truncate">
              <Amostra cor={corDoPartidoTema(partido)} className="size-2.5" />
              {partido}
            </span>
            <span className="h-3" aria-hidden>
              <span
                className="cor-cand block h-full rounded-r-[4px]"
                style={{ ...estiloCor(corDoPartidoTema(partido)), background: "var(--c)", width: `${(n / max) * 100}%`, minWidth: 3 }}
              />
            </span>
            <span className="num text-right font-semibold">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExplicacaoQuociente({ resultado }: { resultado: Resultado }) {
  if (!resultado.cargo.quociente) return null;
  return (
    <p className="max-w-[65ch] text-sm text-ink-2">
      Em eleições proporcionais, cada partido ou federação recebe cadeiras conforme o total de votos (nominais e na
      legenda) dividido pelo <strong className="font-semibold text-ink">quociente eleitoral</strong>, que aqui foi de{" "}
      <span className="num">{fmtInt(resultado.cargo.quociente)}</span> votos. As vagas que sobram são distribuídas pelas
      maiores médias. Por isso aparecem eleitos &quot;por QP&quot; (quociente partidário) e &quot;por média&quot;.
    </p>
  );
}
