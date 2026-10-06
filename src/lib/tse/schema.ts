import { z } from "zod";

// Schemas dos arquivos brutos do TSE. Todos os números chegam como string e os decimais usam
// vírgula. Os objetos são "loose" para não quebrar se o TSE acrescentar campos; o que importa é
// falhar alto se um campo que usamos sumir ou mudar de nome.

const num = z.string();

const ViceSchema = z.looseObject({
  tp: z.string(),
  sqcand: z.string(),
  nmu: z.string(),
  sgp: z.string().optional(),
});

const CandidatoSchema = z.looseObject({
  n: z.string(),
  sqcand: z.string(),
  nm: z.string(),
  nmu: z.string(),
  dt: z.string().optional(),
  dvt: z.string(),
  seq: z.string(),
  e: z.string(),
  st: z.string(),
  vap: num,
  pvapn: num,
  vs: z.array(ViceSchema).optional(),
});

const PartidoSchema = z.looseObject({
  n: z.string(),
  sg: z.string(),
  nm: z.string(),
  nfed: z.string().optional(),
  tvtn: num.optional(),
  tvtl: num.optional(),
  cand: z.array(CandidatoSchema),
});

const AgremiacaoSchema = z.looseObject({
  n: z.string(),
  nm: z.string(),
  tp: z.string(),
  com: z.string(),
  vag: num.optional(),
  tvtn: num.optional(),
  tvtl: num.optional(),
  par: z.array(PartidoSchema),
});

const CargoSchema = z.looseObject({
  cd: z.string(),
  nmn: z.string(),
  nv: num,
  qe: num.optional(),
  agr: z.array(AgremiacaoSchema),
});

export const SecoesSchema = z.looseObject({
  ts: num,
  st: num,
  pstn: num,
});

export const EleitoradoSchema = z.looseObject({
  te: num,
  est: num,
  c: num,
  pcn: num,
  a: num,
  pan: num,
});

const VotosSchema = z.looseObject({
  tv: num,
  vv: num,
  vb: num,
  pvbn: num,
  tvn: num,
  ptvnn: num,
});

export const ResultadoBrutoSchema = z.looseObject({
  ele: z.string(),
  t: z.string(),
  tpabr: z.string(),
  cdabr: z.string(),
  dg: z.string(),
  hg: z.string(),
  and: z.string(),
  carg: z.array(CargoSchema).min(1),
  s: SecoesSchema,
  e: EleitoradoSchema,
  v: VotosSchema,
});

export type ResultadoBruto = z.infer<typeof ResultadoBrutoSchema>;

export const AndamentoBrutoSchema = z.looseObject({
  ele: z.string(),
  t: z.string(),
  dg: z.string(),
  hg: z.string(),
  abr: z.array(
    z.looseObject({
      and: z.string(),
      tpabr: z.string(),
      cdabr: z.string(),
      s: SecoesSchema,
      e: EleitoradoSchema,
    }),
  ),
});

export type AndamentoBruto = z.infer<typeof AndamentoBrutoSchema>;

export const MunicipiosBrutoSchema = z.looseObject({
  abr: z.array(
    z.looseObject({
      cd: z.string(),
      ds: z.string(),
      mu: z.array(
        z.looseObject({
          cd: z.string(),
          cdi: z.string(),
          nm: z.string(),
          c: z.string(),
        }),
      ),
    }),
  ),
});
