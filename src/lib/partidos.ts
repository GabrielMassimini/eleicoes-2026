// Cores por partido. É o único lugar para mudar a cor de um partido: mapas, barras, placares e o
// modo ao vivo leem daqui.
//
// `secundaria` aparece nas amostras de duas cores (legendas e placares). Preenchimentos de mapa e
// barras usam a principal.
//
// Origem: "definida" = escolhida pelo autor do projeto; "identidade" = cores da identidade visual do
// partido (infobox da Wikipédia ou material do partido); "aproximada" = cor dominante do logotipo,
// sem fonte oficial. Ajuste à vontade.

import { distancia, hexToOklab, oklabToHex } from "./colors";

export interface CorPartido {
  cor: string;
  secundaria?: string;
  origem: "definida" | "identidade" | "aproximada";
}

export const CORES_PARTIDO: Record<string, CorPartido> = {
  PT: { cor: "#d7191c", origem: "definida" }, // vermelho
  PL: { cor: "#1f56c2", origem: "definida" }, // azul
  MISSÃO: { cor: "#f5c400", secundaria: "#111111", origem: "definida" }, // amarelo e preto
  NOVO: { cor: "#f26522", secundaria: "#ffffff", origem: "definida" }, // laranja e branco
  PSD: { cor: "#1e9e4a", secundaria: "#183c8c", origem: "identidade" }, // verde, azul (e amarelo)
  AVANTE: { cor: "#00a9ce", secundaria: "#f7931e", origem: "identidade" }, // ciano e laranja
  PSDB: { cor: "#0a7fd0", secundaria: "#ffd200", origem: "identidade" }, // azul e amarelo
  DC: { cor: "#003f87", secundaria: "#f2b90f", origem: "identidade" }, // azul, branco e amarelo
  MDB: { cor: "#009c3b", secundaria: "#ffdf00", origem: "aproximada" },
  REPUBLICANOS: { cor: "#0068b3", secundaria: "#6cbe45", origem: "aproximada" },
  PODE: { cor: "#2aa9e0", secundaria: "#7dc242", origem: "aproximada" },
  PDT: { cor: "#c8102e", secundaria: "#1d428a", origem: "aproximada" },
  PSB: { cor: "#ffb81c", secundaria: "#e30613", origem: "aproximada" },
  UNIÃO: { cor: "#00338d", secundaria: "#00b5e2", origem: "aproximada" },
  PSOL: { cor: "#fdb913", secundaria: "#e1251b", origem: "aproximada" },
  PP: { cor: "#0095da", secundaria: "#004b8d", origem: "aproximada" },
  MOBILIZA: { cor: "#7a2e8c", origem: "aproximada" },
  SOLIDARIEDADE: { cor: "#f7941d", secundaria: "#003a70", origem: "aproximada" },
  PRD: { cor: "#1c3f94", secundaria: "#ffcd00", origem: "aproximada" },
  AGIR: { cor: "#8dc63f", origem: "aproximada" },
  DEMOCRATA: { cor: "#5b3fa0", origem: "aproximada" },
  REDE: { cor: "#00a19a", origem: "aproximada" },
  PV: { cor: "#2e8b3a", origem: "aproximada" },
  UP: { cor: "#a3121a", secundaria: "#ffd100", origem: "aproximada" },
  CIDADANIA: { cor: "#ec008c", origem: "aproximada" },
  PCDOB: { cor: "#c4161c", secundaria: "#ffd100", origem: "aproximada" },
  PCO: { cor: "#e4002b", secundaria: "#111111", origem: "aproximada" },
  PSTU: { cor: "#e2231a", secundaria: "#111111", origem: "aproximada" },
  PCB: { cor: "#b00000", secundaria: "#ffd100", origem: "aproximada" },
  PRTB: { cor: "#00843d", origem: "aproximada" },
};

const PADRAO: CorPartido = { cor: "#8a8a85", origem: "aproximada" };

export function corDoPartido(sigla: string): CorPartido {
  return CORES_PARTIDO[sigla.toUpperCase()] ?? PADRAO;
}

export interface CorCandidato {
  /** Preenchimento no tema claro. */
  claro: string;
  /** Preenchimento no tema escuro (cores muito escuras são clareadas para aparecer no fundo escuro). */
  escuro: string;
  /** Segunda cor do partido, para amostras de duas cores. */
  secundaria?: string;
}

/** No escuro, cores com pouca luminosidade somem no fundo; sobe a luminosidade mantendo o matiz. */
function paraEscuro(hex: string): string {
  const [L, a, b] = hexToOklab(hex);
  return L < 0.55 ? oklabToHex([0.62, a, b]) : hex;
}

function variar(hex: string, delta: number): string {
  const [L, a, b] = hexToOklab(hex);
  return oklabToHex([Math.min(0.92, Math.max(0.3, L + delta)), a, b]);
}

const MINIMA = 0.11; // distância OKLab abaixo da qual duas cores se confundem num mapa

/**
 * Cores dos candidatos de uma mesma disputa, na ordem dada (normalmente por votos). Cada um recebe a
 * cor do partido; se ficar parecida demais com a de alguém à frente na disputa (dois partidos azuis,
 * ou dois candidatos do mesmo partido ao Senado), tenta a cor secundária do partido e depois
 * variações mais claras ou escuras da principal.
 */
export function coresDaDisputa(candidatos: { sq: string; partido: string }[]): Record<string, CorCandidato> {
  const usadas: string[] = [];
  const out: Record<string, CorCandidato> = {};
  candidatos.forEach((c, i) => {
    const p = corDoPartido(c.partido);
    let escolhida = p.cor;
    if (i < 10) {
      const livre = (hex: string) => usadas.every((u) => distancia(u, hex) >= MINIMA);
      const opcoes = [p.cor];
      if (p.secundaria && !/^#(fff|ffffff|111111|000000)$/i.test(p.secundaria)) opcoes.push(p.secundaria);
      opcoes.push(variar(p.cor, 0.16), variar(p.cor, -0.16), variar(p.cor, 0.28), variar(p.cor, -0.26));
      escolhida = opcoes.find(livre) ?? p.cor;
      usadas.push(escolhida);
    }
    out[c.sq] = { claro: escolhida, escuro: paraEscuro(escolhida), secundaria: p.secundaria };
  });
  return out;
}

/** Cor de um partido isolado (sem disputa para resolver), ex.: barras de bancada. */
export function corDoPartidoTema(sigla: string): CorCandidato {
  const p = corDoPartido(sigla);
  return { claro: p.cor, escuro: paraEscuro(p.cor), secundaria: p.secundaria };
}

/** Estilo inline com as duas variantes; a classe `.cor-cand` (globals.css) escolhe pelo tema. */
export function estiloCor(c: CorCandidato | undefined): React.CSSProperties {
  if (!c) return {};
  return { "--cc": c.claro, "--ce": c.escuro, "--cs": c.secundaria ?? c.claro } as React.CSSProperties;
}
