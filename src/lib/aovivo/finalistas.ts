import { disputasEstaduais, resultado } from "@/lib/data/load";
import type { FinalistasIniciais } from "./tipos";

/** Quem disputa o 2º turno, segundo o resultado final do 1º. */
export async function finalistas(): Promise<FinalistasIniciais> {
  const br = await resultado("br", "presidente");
  const gov = await disputasEstaduais("governador");
  const ref = (c: { sq: string; nome: string; partido: string }) => ({ sq: c.sq, nome: c.nome, partido: c.partido });
  return {
    presidente: br.candidatos.filter((c) => c.segundoTurno).map(ref),
    governadores: gov
      .filter((g) => g.segundoTurno.length === 2)
      .map((g) => ({ uf: g.uf.toLowerCase(), candidatos: g.segundoTurno.map(ref) })),
  };
}
