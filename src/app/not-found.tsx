import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <h1 className="display text-4xl sm:text-5xl">Página não encontrada</h1>
      <p className="mt-4 text-ink-2">
        O endereço pode ter um estado, município ou candidato que não existe nos resultados de 2026. Volte para o{" "}
        <Link href="/" className="text-ink underline underline-offset-2">
          início
        </Link>{" "}
        ou procure pelo{" "}
        <Link href="/estados" className="text-ink underline underline-offset-2">
          estado
        </Link>
        .
      </p>
    </div>
  );
}
