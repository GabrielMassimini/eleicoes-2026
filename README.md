# Apuração Aberta · Eleições 2026

Painel interativo com os resultados oficiais das Eleições Gerais de 2026 no Brasil: Presidente, Governador, Senado e
Deputados, por estado, região e cada um dos 5.571 municípios, com perfil e patrimônio declarado de cada candidato e
**apuração do 2º turno ao vivo** (25/10/2026).

Todos os números vêm do Tribunal Superior Eleitoral. Projeto pessoal e independente, sem vínculo com o TSE.

## O que dá para fazer

- **Mapa clicável** do Brasil por estado ou por município, com três leituras: quem venceu, percentual de um candidato e
  diferença entre os dois primeiros. Clique para descer de Brasil → estado → município.
- **Quem foi para o 2º turno**: Presidente e o mosaico das 27 disputas para governador.
- **Página de cada estado**: Governador, Senado (2 vagas), como o estado votou para Presidente, bancada eleita de
  deputados federais e estaduais (com o quociente eleitoral explicado) e busca por município.
- **Página de cada município** com todos os cargos majoritários e comparecimento.
- **Página de cada candidato**: votação, onde teve mais votos, perfil (idade, escolaridade, ocupação, cor/raça
  declarada) e bens declarados.
- **2º turno ao vivo**: atualiza a cada 30 s com os arquivos do TSE, mostra a totalização e marca quando a vantagem do
  líder já supera os eleitores das seções que faltam (uma conta, não projeção). Há uma
  simulação em `/ao-vivo/simulacao` para ver o comportamento antes do dia.

## Como funciona

```
TSE (resultados.tse.jus.br)  ─┐
TSE Dados Abertos (CSV)      ─┼─> scripts/ (pipeline em TS) ─> public/data/*.json ─> Next.js (páginas estáticas)
IBGE Malha Municipal 2025    ─┘                              └> public/geo/*.json (TopoJSON)

2º turno: navegador ─> /api/ao-vivo (cache 30 s na CDN) ─> arquivos do TSE do 2º turno
```

- **Os dados do 1º turno são estáticos.** O pipeline baixa, valida e normaliza tudo uma vez; o site não depende do TSE
  para funcionar.
- **`src/lib/tse/`** é compartilhado entre o pipeline e a rota ao vivo: URLs, schemas `zod` (se o TSE mudar o formato,
  falha alto em vez de mostrar número errado) e normalização.
- **Validação cruzada** (`npm run data:validate`): soma das UFs + exterior = total nacional, soma dos municípios = total
  de cada UF, malha cobrindo todos os municípios, 2º turno sempre em pares.
- **Ao vivo**: a rota guarda o último resultado bom; se o TSE oscilar, a página continua mostrando os dados anteriores
  com aviso.
- **Cores**: só os candidatos têm cor, com uma paleta validada para daltonismo (até 3 cores por mapa; o resto vira
  "Outros"). A cor segue o candidato em todas as telas.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · MapLibre GL · TopoJSON · zod · Vitest · oxlint ·
mapshaper (simplificação das malhas)

## Rodando localmente

```bash
npm install
npm run dev
```

Os dados gerados já estão no repositório (`public/data`, `public/geo`). Para gerar de novo a partir do TSE e do IBGE:

```bash
npm run data           # municípios, resultados, votos por município, mapas e validação
npm run data:candidatos
```

Os downloads brutos ficam em `.cache/` (fora do git), então rodar de novo é rápido.

```bash
npm test               # testes do parser com arquivos reais do TSE
npm run typecheck
npm run lint
```

## Propostas de governo

O sistema do TSE com as propostas (DivulgaCandContas) não permite acesso automatizado. Para exibir uma proposta na
página do candidato, salve o PDF em `public/propostas/<SQ_CANDIDATO>.pdf` (o número `sq` está na URL da página do
candidato).

## Fontes

- [Resultados do TSE](https://resultados.tse.jus.br/oficial/app/index.html)
- [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br/) (`consulta_cand_2026`, `bem_candidato_2026`)
- [IBGE, Malhas Territoriais 2025](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html)
