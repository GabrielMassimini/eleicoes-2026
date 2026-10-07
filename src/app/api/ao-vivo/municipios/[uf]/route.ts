import { municipiosOficial, municipiosSimulado } from "@/lib/aovivo/painel";
import { isUf } from "@/lib/tse/regioes";

// Presidente por município de uma UF no 2º turno. ?simulacao=1 usa a simulação com dados do 1º turno.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  if (!isUf(uf)) return Response.json({ erro: "UF inválida" }, { status: 404 });
  const simulacao = new URL(req.url).searchParams.get("simulacao") === "1";
  const dados = simulacao ? await municipiosSimulado(uf.toLowerCase()) : await municipiosOficial(uf.toLowerCase());
  return Response.json(dados, {
    headers: { "Cache-Control": `public, max-age=0, s-maxage=${simulacao ? 5 : 60}, stale-while-revalidate=120` },
  });
}
