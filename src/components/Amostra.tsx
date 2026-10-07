import { type CorCandidato, estiloCor } from "@/lib/partidos";

/** Amostra de cor do partido; com cor secundária, vira um quadrado de duas cores. */
export function Amostra({ cor, className = "size-3" }: { cor: CorCandidato | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={`cor-cand inline-block shrink-0 overflow-hidden rounded-sm ring-1 ring-line ${className}`}
      style={{
        ...estiloCor(cor),
        background: cor?.secundaria ? "linear-gradient(135deg, var(--c) 0 55%, var(--cs) 55% 100%)" : "var(--c)",
      }}
    />
  );
}
