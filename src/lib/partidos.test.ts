import { describe, expect, it } from "vitest";
import { distancia, hexToOklab } from "./colors";
import { coresDaDisputa, corDoPartido } from "./partidos";

describe("cores dos partidos", () => {
  it("segue as cores definidas para os presidenciáveis", () => {
    const cores = coresDaDisputa([
      { sq: "flavio", partido: "PL" },
      { sq: "lula", partido: "PT" },
      { sq: "cury", partido: "AVANTE" },
      { sq: "renan", partido: "MISSÃO" },
      { sq: "caiado", partido: "PSD" },
      { sq: "zema", partido: "NOVO" },
    ]);
    expect(cores.flavio.claro).toBe(corDoPartido("PL").cor);
    expect(cores.lula.claro).toBe(corDoPartido("PT").cor);
    expect(cores.renan).toMatchObject({ claro: "#f5c400", secundaria: "#111111" });
    expect(cores.zema).toMatchObject({ claro: "#f26522", secundaria: "#ffffff" });
    // Lula é vermelho (matiz perto de 0°) e Flávio azul (perto de 260°).
    const matiz = (hex: string) => {
      const [, a, b] = hexToOklab(hex);
      return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
    };
    expect(matiz(cores.lula.claro)).toBeLessThan(40);
    expect(matiz(cores.flavio.claro)).toBeGreaterThan(230);
    expect(matiz(cores.flavio.claro)).toBeLessThan(290);
  });

  it("separa candidatos de cores parecidas na mesma disputa", () => {
    const cores = coresDaDisputa([
      { sq: "a", partido: "PL" },
      { sq: "b", partido: "DC" },
      { sq: "c", partido: "PL" },
    ]);
    expect(distancia(cores.a.claro, cores.b.claro)).toBeGreaterThanOrEqual(0.11);
    expect(distancia(cores.a.claro, cores.c.claro)).toBeGreaterThanOrEqual(0.11);
    expect(distancia(cores.b.claro, cores.c.claro)).toBeGreaterThanOrEqual(0.11);
  });

  it("clareia cores escuras no tema escuro", () => {
    const { escuro } = coresDaDisputa([{ sq: "x", partido: "DC" }]).x;
    expect(hexToOklab(escuro)[0]).toBeGreaterThan(hexToOklab(corDoPartido("DC").cor)[0]);
  });

  it("partido desconhecido recebe cinza", () => {
    expect(corDoPartido("XYZ").cor).toBe("#8a8a85");
  });
});
