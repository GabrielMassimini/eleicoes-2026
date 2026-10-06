const nf = new Intl.NumberFormat("pt-BR");
const pf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pf2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export const fmtInt = (n: number) => nf.format(n);
export const fmtPct = (n: number, casas: 1 | 2 = 2) => `${(casas === 1 ? pf1 : pf2).format(n)}%`;
export const fmtCompact = (n: number) => compact.format(n);

export function fmtHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "SÃO JOSÉ DOS CAMPOS" -> "São José dos Campos" */
export function titleCase(s: string): string {
  const minusculas = new Set(["de", "da", "do", "das", "dos", "e", "d'"]);
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w, i) => (i > 0 && minusculas.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("")
    .replace(/D'([a-z])/g, (_, c: string) => `d'${c.toUpperCase()}`);
}

export function idade(nascimento: string | undefined, em = new Date("2026-10-04T12:00:00-03:00")): number | undefined {
  if (!nascimento) return undefined;
  const [d, m, a] = nascimento.split("/").map(Number);
  if (!a) return undefined;
  let anos = em.getFullYear() - a;
  if (em.getMonth() + 1 < m || (em.getMonth() + 1 === m && em.getDate() < d)) anos--;
  return anos;
}
