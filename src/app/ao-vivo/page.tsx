import type { Metadata } from "next";
import { PainelAoVivo } from "@/components/aovivo/PainelAoVivo";
import { finalistas } from "@/lib/aovivo/finalistas";

export const metadata: Metadata = {
  title: "2º turno ao vivo",
  description: "Apuração do 2º turno das Eleições 2026 em tempo real, com dados oficiais do TSE.",
};

export default async function AoVivoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <h1 className="sr-only">2º turno ao vivo</h1>
      <PainelAoVivo iniciais={await finalistas()} simulacao={false} />
    </div>
  );
}
