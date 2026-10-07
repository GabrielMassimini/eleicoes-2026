import { painelSimulado } from "@/lib/aovivo/painel";

// Ensaio do modo ao vivo com os números do 1º turno e totalização simulada (ciclo de 10 min).
export const dynamic = "force-dynamic";

export async function GET() {
  const painel = await painelSimulado();
  return Response.json(painel, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=3, stale-while-revalidate=2" },
  });
}
