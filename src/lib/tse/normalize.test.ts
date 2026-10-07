import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { matematicamenteDefinido, normalizarAndamento, normalizarResultado, toFloat } from "./normalize";
import { urlAndamento, urlFoto, urlResultado } from "./urls";

const fixture = (nome: string) =>
  JSON.parse(readFileSync(path.join(import.meta.dirname, "__fixtures__", nome), "utf-8"));

describe("normalizarResultado", () => {
  const br = normalizarResultado(fixture("br-presidente.json"));

  it("lê cargo, abrangência e horário", () => {
    expect(br.cargo).toMatchObject({ codigo: 1, nome: "Presidente", vagas: 1 });
    expect(br.abrangencia).toEqual({ tipo: "br", codigo: "br" });
    expect(br.atualizadoEm).toMatch(/^2026-10-0\dT\d\d:\d\d:\d\d-03:00$/);
    expect(br.finalizado).toBe(true);
  });

  it("ordena candidatos por votos e marca o 2º turno", () => {
    const votos = br.candidatos.map((c) => c.votos);
    expect(votos).toEqual([...votos].sort((a, b) => b - a));
    const segundoTurno = br.candidatos.filter((c) => c.segundoTurno);
    expect(segundoTurno).toHaveLength(2);
    expect(br.candidatos.slice(0, 2).every((c) => c.segundoTurno)).toBe(true);
    expect(br.candidatos.some((c) => c.eleito)).toBe(false);
  });

  it("soma dos votos nominais bate com os válidos", () => {
    const soma = br.candidatos.reduce((s, c) => s + c.votos, 0);
    expect(soma).toBe(br.totais.validos);
    const somaPct = br.candidatos.reduce((s, c) => s + c.pct, 0);
    expect(somaPct).toBeCloseTo(100, 3);
  });

  it("traz vice com partido", () => {
    expect(br.candidatos[0].vices[0]).toMatchObject({ tipo: "vice" });
    expect(br.candidatos[0].vices[0].nome.length).toBeGreaterThan(0);
  });

  it("senado: 2 vagas, 2 eleitos com 2 suplentes cada", () => {
    const sen = normalizarResultado(fixture("rr-senador.json"));
    expect(sen.cargo.vagas).toBe(2);
    const eleitos = sen.candidatos.filter((c) => c.eleito);
    expect(eleitos).toHaveLength(2);
    expect(eleitos[0].vices.map((v) => v.tipo)).toEqual(["suplente1", "suplente2"]);
  });

  it("deputados: quociente, vagas por agremiação e eleitos = vagas", () => {
    const dep = normalizarResultado(fixture("rr-depfederal.json"));
    expect(dep.cargo.quociente).toBeGreaterThan(0);
    const vagas = dep.agremiacoes.reduce((s, a) => s + a.vagas, 0);
    expect(vagas).toBe(dep.cargo.vagas);
    expect(dep.candidatos.filter((c) => c.eleito)).toHaveLength(dep.cargo.vagas);
    expect(dep.candidatos.some((c) => c.situacao === "Suplente" && !c.eleito)).toBe(true);
  });

  it("deputados: agremiações isoladas e federações têm votos, e a soma fecha os válidos", () => {
    const dep = normalizarResultado(fixture("rr-depfederal.json"));
    expect(dep.agremiacoes.some((a) => a.tipo === "isolado")).toBe(true);
    for (const a of dep.agremiacoes) {
      const nominaisDosCandidatos = dep.candidatos.filter((c) => a.partidos.includes(c.partido)).reduce((s, c) => s + c.votos, 0);
      expect(a.votosNominais).toBe(nominaisDosCandidatos);
    }
    const total = dep.agremiacoes.reduce((s, a) => s + a.votosNominais + a.votosLegenda, 0);
    expect(total).toBe(dep.totais.validos);
  });

  it("município: abrangência mu", () => {
    const mu = normalizarResultado(fixture("sp-campinas-presidente.json"));
    expect(mu.abrangencia).toEqual({ tipo: "mu", codigo: "71072" });
  });

  it("falha alto se o formato mudar", () => {
    const quebrado = fixture("br-presidente.json");
    delete quebrado.carg;
    expect(() => normalizarResultado(quebrado)).toThrow();
  });
});

describe("normalizarAndamento", () => {
  it("separa UF e municípios", () => {
    const ab = normalizarAndamento(fixture("rr-andamento.json"));
    expect(ab.uf).toBeDefined();
    expect(ab.municipios).toHaveLength(15);
    expect(ab.municipios.every((m) => m.totais.secoes > 0)).toBe(true);
  });
});

describe("matematicamenteDefinido", () => {
  const base = {
    finalizado: false,
    candidatos: [
      { votos: 1_000 },
      { votos: 400 },
    ] as never,
  };
  const totais = (eleitorado: number, totalizado: number) =>
    ({ eleitorado, eleitoradoTotalizado: totalizado }) as never;

  it("vantagem maior que o eleitorado restante", () => {
    expect(matematicamenteDefinido({ ...base, totais: totais(2_000, 1_500) })).toBe(true);
  });
  it("vantagem menor ou igual ao restante", () => {
    expect(matematicamenteDefinido({ ...base, totais: totais(2_000, 1_400) })).toBe(false);
  });
  it("finalizado é sempre definido", () => {
    expect(matematicamenteDefinido({ ...base, finalizado: true, totais: totais(2_000, 0) })).toBe(true);
  });
});

describe("urls", () => {
  it("monta os caminhos no formato do TSE", () => {
    expect(urlResultado({ cargo: "presidente", turno: 1, abrangencia: "br" })).toBe(
      "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br/br-c0001-e006257-u.json",
    );
    expect(urlResultado({ cargo: "governador", turno: 2, abrangencia: "SP" })).toBe(
      "https://resultados.tse.jus.br/oficial/ele2026/6260/dados/sp/sp-c0003-e006260-u.json",
    );
    expect(urlResultado({ cargo: "presidente", turno: 1, abrangencia: "sp", municipio: "71072" })).toBe(
      "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/sp/sp71072-c0001-e006257-u.json",
    );
    expect(urlAndamento("6257", "RR")).toBe(
      "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/rr/rr-e006257-ab.json",
    );
    expect(urlFoto("presidente", 1, "sp", "123")).toContain("/6257/fotos/br/123.jpeg");
  });

  it("toFloat aceita vírgula decimal", () => {
    expect(toFloat("47,027772356")).toBeCloseTo(47.0277, 3);
  });
});
