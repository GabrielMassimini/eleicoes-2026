import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import type { Totais as T } from "@/lib/tse/normalize";

/** Comparecimento, abstenção, brancos e nulos. */
export function Totais({ totais }: { totais: T }) {
  const pctSobreComparecimento = (n: number) => (totais.comparecimento ? (n / totais.comparecimento) * 100 : 0);
  const itens = [
    { rotulo: "Comparecimento", valor: fmtPct(totais.pctComparecimento, 1), detalhe: `${fmtCompact(totais.comparecimento)} de ${fmtCompact(totais.eleitorado)} eleitores` },
    { rotulo: "Abstenção", valor: fmtPct(totais.pctAbstencao, 1), detalhe: `${fmtInt(totais.abstencao)} eleitores` },
    { rotulo: "Votos brancos", valor: fmtPct(pctSobreComparecimento(totais.brancos), 1), detalhe: `${fmtInt(totais.brancos)} votos` },
    { rotulo: "Votos nulos", valor: fmtPct(pctSobreComparecimento(totais.nulos), 1), detalhe: `${fmtInt(totais.nulos)} votos` },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
      {itens.map((i) => (
        <div key={i.rotulo} className="bg-surface p-4">
          <dt className="text-sm text-ink-2">{i.rotulo}</dt>
          <dd className="mt-1 text-2xl font-bold">{i.valor}</dd>
          <dd className="mt-0.5 text-xs text-ink-2">{i.detalhe}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Totalizacao({ totais, atualizadoEm }: { totais: T; atualizadoEm: string }) {
  const hora = new Date(atualizadoEm).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <p className="text-sm text-ink-2">
      {fmtPct(totais.pctTotalizado, totais.pctTotalizado === 100 ? 1 : 2)} das seções totalizadas, dados do TSE de {hora}
    </p>
  );
}
