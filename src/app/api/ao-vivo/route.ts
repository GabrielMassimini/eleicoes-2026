import { painelOficial } from "@/lib/aovivo/painel";

// Apuração do 2º turno direto dos arquivos do TSE. A CDN da Vercel guarda a resposta por 3 s:
// qualquer número de leitores gera no máximo ~1 rodada de consultas ao TSE a cada 3 s, e cada
// consulta é condicional (ETag), então arquivo que não mudou não é baixado de novo.
export const dynamic = "force-dynamic";

export async function GET() {
  const painel = await painelOficial();
  return Response.json(painel, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=3, stale-while-revalidate=2" },
  });
}
