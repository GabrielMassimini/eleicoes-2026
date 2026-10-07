// Perfis dos candidatos (consulta_cand) + patrimônio declarado (bem_candidato), do Portal de Dados
// Abertos do TSE -> public/data/candidatos/{uf}.json e um índice sq -> [uf, cargo].
import { parse } from "csv-parse/sync";
import unzipper from "unzipper";
import type { PerfilCandidato } from "@/lib/data/types";
import type { CargoId } from "@/lib/tse/urls";
import { fetchCached, writeJson } from "./lib/io";

const BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele";
const fresh = process.argv.includes("--fresh");

const CARGO_POR_CODIGO: Record<string, CargoId> = {
  "1": "presidente",
  "3": "governador",
  "5": "senador",
  "6": "depFederal",
  "7": "depEstadual",
  "8": "depDistrital",
};

async function lerCsv(arquivo: string): Promise<Record<string, string>[]> {
  const zip = await unzipper.Open.buffer(await fetchCached(`${BASE}/${arquivo}`, { fresh }));
  const entrada = zip.files.find((f) => /_BRASIL\.csv$/i.test(f.path));
  if (!entrada) throw new Error(`${arquivo}: CSV nacional não encontrado`);
  const texto = new TextDecoder("latin1").decode(await entrada.buffer());
  return parse(texto, { delimiter: ";", columns: true, skip_empty_lines: true, relax_quotes: true });
}

const OCULTO = /^(NÃO DIVULGÁVEL|#NULO|#NE|-1|-3|-4)?$/i;
const limpo = (v: string | undefined) => (v === undefined || OCULTO.test(v.trim()) ? undefined : v.trim());
const valor = (v: string) => Number.parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;

const [cands, bens] = await Promise.all([
  lerCsv("consulta_cand/consulta_cand_2026.zip"),
  lerCsv("bem_candidato/bem_candidato_2026.zip"),
]);

const bensPorSq = new Map<string, { tipo: string; descricao: string; valor: number }[]>();
for (const b of bens) {
  const lista = bensPorSq.get(b.SQ_CANDIDATO) ?? [];
  lista.push({ tipo: b.DS_TIPO_BEM_CANDIDATO, descricao: b.DS_BEM_CANDIDATO.trim(), valor: valor(b.VR_BEM_CANDIDATO) });
  bensPorSq.set(b.SQ_CANDIDATO, lista);
}

const porUf = new Map<string, Record<string, PerfilCandidato>>();
const indice: Record<string, [string, CargoId]> = {};

for (const c of cands) {
  const cargo = CARGO_POR_CODIGO[c.CD_CARGO];
  if (!cargo) continue; // vices e suplentes aparecem no perfil do titular
  const uf = c.SG_UF === "BR" ? "br" : c.SG_UF.toLowerCase();
  const lista = (bensPorSq.get(c.SQ_CANDIDATO) ?? []).sort((a, b) => b.valor - a.valor);
  const perfil: PerfilCandidato = {
    sq: c.SQ_CANDIDATO,
    numero: c.NR_CANDIDATO,
    nome: c.NM_URNA_CANDIDATO,
    nomeCompleto: c.NM_CANDIDATO,
    cargo,
    uf: uf.toUpperCase(),
    partido: c.SG_PARTIDO,
    partidoNome: c.NM_PARTIDO,
    federacao: limpo(c.NM_FEDERACAO),
    coligacao: limpo(c.NM_COLIGACAO),
    composicao: limpo(c.DS_COMPOSICAO_COLIGACAO),
    nascimento: limpo(c.DT_NASCIMENTO),
    ufNascimento: limpo(c.SG_UF_NASCIMENTO),
    genero: limpo(c.DS_GENERO),
    corRaca: limpo(c.DS_COR_RACA),
    instrucao: limpo(c.DS_GRAU_INSTRUCAO),
    estadoCivil: limpo(c.DS_ESTADO_CIVIL),
    ocupacao: limpo(c.DS_OCUPACAO),
    situacaoCandidatura: limpo(c.DS_SITUACAO_CANDIDATURA),
    bens: {
      total: Math.round(lista.reduce((s, b) => s + b.valor, 0) * 100) / 100,
      quantidade: lista.length,
      maiores: lista.slice(0, 8),
    },
  };
  const mapa = porUf.get(uf) ?? {};
  mapa[perfil.sq] = perfil;
  porUf.set(uf, mapa);
  indice[perfil.sq] = [uf, cargo];
}

for (const [uf, mapa] of porUf) await writeJson(`candidatos/${uf}.json`, mapa);
await writeJson("candidatos/indice.json", indice);
console.log(`${Object.keys(indice).length} candidatos em ${porUf.size} arquivos; ${bensPorSq.size} com bens declarados`);
