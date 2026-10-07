import { rampaDivergente, rampaSequencial, SEM_DADOS, type Tema } from "./colors";

// Classes (bins) dos mapas. Classes fixas e legíveis em vez de quantis: o leitor compara
// mapas de estados diferentes com a mesma régua.

export type ModoMapa = { tipo: "vencedor" } | { tipo: "percentual"; candidato: number } | { tipo: "diferenca"; a: number; b: number };

export interface AreaVotos {
  validos: number;
  v: number[];
}

export interface Classe {
  cor: string;
  rotulo: string;
}

export interface Escala {
  corDe: (area: AreaVotos | undefined) => string;
  legenda: Classe[];
}

const pct = (area: AreaVotos, i: number) => (area.validos > 0 ? (area.v[i] / area.validos) * 100 : 0);

export function vencedor(area: AreaVotos): number {
  let melhor = -1;
  let max = 0;
  area.v.forEach((x, i) => {
    if (x > max) {
      max = x;
      melhor = i;
    }
  });
  return melhor;
}

function limitesPercentual(max: number): number[] {
  if (max >= 50) return [30, 40, 50, 60, 70];
  const passo = [1, 2, 5, 10].find((p) => p * 5 >= max) ?? 10;
  return [1, 2, 3, 4, 5].map((k) => k * passo);
}

function classificar(valor: number, limites: number[]): number {
  let i = 0;
  while (i < limites.length && valor >= limites[i]) i++;
  return i;
}

/**
 * @param cores cor de cada candidato (mesma ordem de `nomes` e de `area.v`), já no tema certo.
 */
export function escala(modo: ModoMapa, areas: AreaVotos[], nomes: string[], cores: string[], tema: Tema): Escala {
  const semDados = SEM_DADOS[tema];

  if (modo.tipo === "vencedor") {
    const presentes = [...new Set(areas.map(vencedor).filter((i) => i >= 0))].sort((a, b) => a - b);
    return {
      corDe: (a) => (a && a.validos > 0 ? cores[vencedor(a)] : semDados),
      legenda: presentes.map((i) => ({ cor: cores[i], rotulo: nomes[i] })),
    };
  }

  if (modo.tipo === "percentual") {
    const i = modo.candidato;
    const max = Math.max(0, ...areas.map((a) => pct(a, i)));
    const limites = limitesPercentual(max);
    const rampa = rampaSequencial(cores[i], limites.length + 1, tema);
    const legenda = rampa.map((cor, k) => ({
      cor,
      rotulo: k === 0 ? `< ${limites[0]}%` : k === limites.length ? `≥ ${limites[k - 1]}%` : `${limites[k - 1]}–${limites[k]}%`,
    }));
    return {
      corDe: (a) => (a && a.validos > 0 ? rampa[classificar(pct(a, i), limites)] : semDados),
      legenda,
    };
  }

  // Diferença em pontos percentuais: A − B. Classe central = disputa equilibrada (±5 p.p.).
  const limites = [-30, -15, -5, 5, 15, 30];
  const rampa = rampaDivergente(cores[modo.a], cores[modo.b], 3, tema);
  // `rampa` vai do A mais forte ao B mais forte; a classe k de (A − B) cresce de B para A.
  const a = nomes[modo.a];
  const b = nomes[modo.b];
  const rotulos = [`${a} +30 p.p.`, `${a} +15 a 30`, `${a} +5 a 15`, "Até 5 p.p.", `${b} +5 a 15`, `${b} +15 a 30`, `${b} +30 p.p.`];
  return {
    corDe: (x) => (x && x.validos > 0 ? rampa[6 - classificar(pct(x, modo.a) - pct(x, modo.b), limites)] : semDados),
    legenda: rampa.map((cor, k) => ({ cor, rotulo: rotulos[k] })),
  };
}
