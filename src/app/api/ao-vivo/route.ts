import { painelOficial } from "@/lib/aovivo/painel";

// Apuração do 2º turno direto dos arquivos do TSE. A CDN da Vercel guarda a resposta por 30 s,
// então qualquer número de leitores gera no máximo ~1 rodada de requisições ao TSE a cada 30 s.
export const dynamic = "force-dynamic";

export async function GET() {
  const painel = await painelOficial();
  return Response.json(painel, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120" },
  });
}
