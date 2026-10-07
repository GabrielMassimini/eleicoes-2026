// Cores de apoio dos mapas e rampas. A cor de cada candidato vem do partido (src/lib/partidos.ts);
// a interface em volta é monocromática para não competir com elas.

export type Tema = "claro" | "escuro";

export const SEM_DADOS: Record<Tema, string> = { claro: "#e1e0d9", escuro: "#2c2c2a" };
export const NEUTRO: Record<Tema, string> = { claro: "#f0efec", escuro: "#383835" };
export const SUPERFICIE: Record<Tema, string> = { claro: "#fcfcfb", escuro: "#1a1a19" };

// --- OKLab, para rampas sequenciais e divergentes de um único matiz ---------------------------

type Lab = [number, number, number];

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};

export function hexToOklab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToHex([L, a, b]: Lab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(fromLinear);
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Distância euclidiana em OKLab (0 = iguais; ~0,1 começa a ser distinguível com folga). */
export function distancia(a: string, b: string): number {
  const A = hexToOklab(a);
  const B = hexToOklab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

function mix(a: string, b: string, t: number): string {
  const A = hexToOklab(a);
  const B = hexToOklab(b);
  return oklabToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Escurece levemente o matiz (para o extremo das rampas). */
function aprofundar(hex: string, quanto: number): string {
  const [L, a, b] = hexToOklab(hex);
  return oklabToHex([L - quanto, a, b]);
}

/**
 * Rampa sequencial de um único matiz, do neutro (quase zero) ao matiz escuro, em `passos` classes.
 * No modo escuro a âncora inverte: "pouco" fica perto da superfície escura.
 */
export function rampaSequencial(cor: string, passos: number, tema: Tema): string[] {
  const inicio = NEUTRO[tema];
  const fim = tema === "claro" ? aprofundar(cor, 0.12) : cor;
  return Array.from({ length: passos }, (_, i) => mix(inicio, fim, (i + 1) / passos));
}

/** Rampa divergente: corA ← ... neutro ... → corB, `porLado` passos de cada lado + o meio. */
export function rampaDivergente(corA: string, corB: string, porLado: number, tema: Tema): string[] {
  const meio = NEUTRO[tema];
  const fimA = tema === "claro" ? aprofundar(corA, 0.08) : corA;
  const fimB = tema === "claro" ? aprofundar(corB, 0.08) : corB;
  const ladoA = Array.from({ length: porLado }, (_, i) => mix(meio, fimA, (porLado - i) / porLado));
  const ladoB = Array.from({ length: porLado }, (_, i) => mix(meio, fimB, (i + 1) / porLado));
  return [...ladoA, meio, ...ladoB];
}

/** Texto legível (tinta ou branco) sobre um preenchimento. */
export function tintaSobre(fundo: string): string {
  const [L] = hexToOklab(fundo);
  return L > 0.68 ? "#0b0b0b" : "#ffffff";
}
