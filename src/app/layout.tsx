import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Apuração Aberta · Eleições 2026", template: "%s · Apuração Aberta" },
  description:
    "Resultados oficiais das Eleições 2026 por estado e município: Presidente, Governador, Senado e Deputados, com dados públicos do TSE.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

const NAV = [
  { href: "/presidente", label: "Presidente" },
  { href: "/estados", label: "Estados" },
  { href: "/ao-vivo", label: "2º turno ao vivo" },
  { href: "/sobre", label: "Sobre os dados" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={archivo.variable}>
      <body className="flex min-h-dvh flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-8 gap-y-2 px-4 py-4 sm:px-6">
            <Link href="/" className="display text-xl">
              Apuração Aberta
            </Link>
            <nav aria-label="Principal" className="-mx-2 flex flex-wrap text-[15px]">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded px-2 py-1 text-ink-2 hover:bg-wash hover:text-ink">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-line">
          <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-ink-2 sm:px-6">
            <p className="max-w-[70ch]">
              Dados oficiais de{" "}
              <a className="underline underline-offset-2" href="https://resultados.tse.jus.br/oficial/app/index.html">
                resultados.tse.jus.br
              </a>{" "}
              e do Portal de Dados Abertos do TSE; malhas municipais do IBGE. Projeto independente, sem vínculo com o
              Tribunal Superior Eleitoral.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
