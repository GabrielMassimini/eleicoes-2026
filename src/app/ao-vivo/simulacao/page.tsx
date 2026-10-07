import type { Metadata } from "next";
import Link from "next/link";
import { PainelAoVivo } from "@/components/aovivo/PainelAoVivo";
import { finalistas } from "@/lib/aovivo/finalistas";

export const metadata: Metadata = {
  title: "Simulação da apuração",
  robots: { index: false },
};

export default async function SimulacaoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <h1 className="sr-only">Simulação da apuração do 2º turno</h1>
      <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm text-ink-2">
        <strong className="text-ink">Isto é uma simulação, não o resultado do 2º turno.</strong> Os números vêm do 1º turno
        (só os dois finalistas) e a totalização avança de 0 a 100% a cada 10 minutos, para mostrar como a página se comporta
        no dia. A apuração real fica em{" "}
        <Link href="/ao-vivo" className="font-semibold text-ink underline underline-offset-2">
          2º turno ao vivo
        </Link>
        .
      </p>
      <PainelAoVivo iniciais={await finalistas()} simulacao />
    </div>
  );
}
