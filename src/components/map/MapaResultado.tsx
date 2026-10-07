"use client";

import { Map as MapLibre, NavigationControl, setWorkerUrl, type MapGeoJSONFeature, type MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { SEM_DADOS, SUPERFICIE } from "@/lib/colors";
import type { CandidatoRef } from "@/lib/data/types";
import { escala, type ModoMapa } from "@/lib/escalas";
import { fmtInt, fmtPct, titleCase } from "@/lib/format";
import { coresDaDisputa } from "@/lib/partidos";
import { temaAtual, useTema } from "@/lib/useTema";

export interface AreaInfo {
  nome: string;
  href?: string;
  validos: number;
  v: number[];
}

interface Props {
  /** URL do TopoJSON com o objeto `areas` (id = código IBGE). */
  geo: string;
  candidatos: CandidatoRef[];
  areas: Record<string, AreaInfo>;
  /** Desenha as divisas estaduais por cima (mapa nacional por município). */
  bordasUf?: boolean;
  /** "estado" ou "município", para textos. */
  unidade: "estado" | "município";
  titulo: string;
  /** Modo inicial. */
  modoInicial?: ModoMapa["tipo"];
  /** Candidato selecionado no modo "percentual". */
  candidatoInicial?: number;
  /** Modos disponíveis (padrão: todos). Com um só, a barra de modos some. */
  modos?: ModoMapa["tipo"][];
  /** Texto da legenda para áreas sem dado (padrão: nada). */
  rotuloSemDados?: string;
}

// Copiado por scripts/copiar-worker.mjs (predev/prebuild).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type Hover = { id: string; x: number; y: number; fixo?: boolean } | null;
type PropsArea = { id: string; uf: string };
type EventoMapa = MapMouseEvent & { features?: MapGeoJSONFeature[] };

const nomeCurto = (c: CandidatoRef) => titleCase(c.nome);

export function MapaResultado({
  geo,
  candidatos,
  areas,
  bordasUf,
  unidade,
  titulo,
  modoInicial = "vencedor",
  candidatoInicial = 0,
  modos = ["vencedor", "percentual", "diferenca"],
  rotuloSemDados,
}: Props) {
  const tema = useTema();
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const idsRef = useRef<string[]>([]);
  const [pronto, setPronto] = useState(false);
  const [hover, setHover] = useState<Hover>(null);
  const [tipo, setTipo] = useState<ModoMapa["tipo"]>(modoInicial);
  const [cand, setCand] = useState(candidatoInicial);

  const temDisputa = candidatos.length >= 2;
  const modo: ModoMapa =
    tipo === "percentual" ? { tipo, candidato: cand } : tipo === "diferenca" && temDisputa ? { tipo, a: 0, b: 1 } : { tipo: "vencedor" };

  const nomes = useMemo(() => candidatos.map(nomeCurto), [candidatos]);
  const lista = useMemo(() => Object.values(areas), [areas]);
  const temLinks = useMemo(() => lista.some((a) => a.href), [lista]);
  // Cor do partido de cada candidato, resolvendo conflitos na ordem da disputa.
  const cores = useMemo(() => {
    const mapa = coresDaDisputa(candidatos);
    return candidatos.map((c) => (tema === "claro" ? mapa[c.sq].claro : mapa[c.sq].escuro));
  }, [candidatos, tema]);
  const esc = useMemo(() => escala(modo, lista, nomes, cores, tema), [modo.tipo, cand, lista, nomes, cores, tema]); // eslint-disable-line

  // Cria o mapa uma vez por geometria.
  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibre({
      container: container.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "fundo", type: "background", paint: { "background-color": SUPERFICIE[temaAtual()] } }],
      },
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      cooperativeGestures: true,
      renderWorldCopies: false,
      fadeDuration: 0,
      locale: {
        "CooperativeGesturesHandler.WindowsHelpText": "Use Ctrl + rolagem para dar zoom no mapa",
        "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + rolagem para dar zoom no mapa",
        "CooperativeGesturesHandler.MobileHelpText": "Use dois dedos para mover o mapa",
        "NavigationControl.ZoomIn": "Aproximar",
        "NavigationControl.ZoomOut": "Afastar",
      },
    });
    map.touchZoomRotate.disableRotation();
    map.on("error", (e) => console.error("[mapa]", e.error));
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    let cancelado = false;
    map.on("load", async () => {
      const topo = (await fetch(geo).then((r) => r.json())) as Topology<{ areas: GeometryCollection<PropsArea> }>;
      if (cancelado) return;
      const fc = feature(topo, topo.objects.areas);
      idsRef.current = fc.features.map((f) => String(f.properties?.id ?? f.id));
      map.addSource("areas", { type: "geojson", data: fc, promoteId: "id" });
      map.addLayer({
        id: "preenchimento",
        type: "fill",
        source: "areas",
        paint: { "fill-color": ["coalesce", ["feature-state", "cor"], "#e1e0d9"] },
      });
      map.addLayer({
        id: "divisas",
        type: "line",
        source: "areas",
        paint: { "line-color": SUPERFICIE[temaAtual()], "line-width": bordasUf ? 0.3 : 0.8 },
      });
      if (bordasUf) {
        const uf = (g: unknown) => (g as { properties?: PropsArea }).properties?.uf;
        const linhas = mesh(topo, topo.objects.areas, (a, b) => uf(a) !== uf(b));
        map.addSource("ufs", { type: "geojson", data: linhas });
        map.addLayer({ id: "ufs", type: "line", source: "ufs", paint: { "line-color": "#52514e", "line-width": 1 } });
      }
      map.addLayer({
        id: "destaque",
        type: "line",
        source: "areas",
        paint: {
          "line-color": "#0b0b0b",
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2, 0],
        },
      });
      if (topo.bbox) {
        const [x0, y0, x1, y1] = topo.bbox;
        map.fitBounds([x0, y0, x1, y1], { padding: 12, animate: false });
        map.setMaxBounds(undefined);
        map.setMinZoom(map.getZoom() - 0.5);
      }
      setPronto(true);
    });

    return () => {
      cancelado = true;
      map.remove();
      mapRef.current = null;
      setPronto(false);
    };
  }, [geo, bordasUf]);

  // Pinta conforme modo e tema.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pronto) return;
    for (const id of idsRef.current) {
      map.setFeatureState({ source: "areas", id }, { cor: esc.corDe(areas[id]) });
    }
    const superficie = SUPERFICIE[tema];
    map.setPaintProperty("fundo", "background-color", superficie);
    map.setPaintProperty("divisas", "line-color", superficie);
    map.setPaintProperty("destaque", "line-color", tema === "claro" ? "#0b0b0b" : "#ffffff");
    if (map.getLayer("ufs")) map.setPaintProperty("ufs", "line-color", tema === "claro" ? "#52514e" : "#c3c2b7");
  }, [esc, areas, pronto, tema]);

  // Interação: hover, toque e clique.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pronto) return;
    let atual: string | null = null;
    const toque = window.matchMedia("(hover: none)").matches;

    const marcar = (id: string | null) => {
      if (atual) map.setFeatureState({ source: "areas", id: atual }, { hover: false });
      if (id) map.setFeatureState({ source: "areas", id }, { hover: true });
      atual = id;
    };
    const idDe = (e: EventoMapa) => {
      const f = e.features?.[0];
      return f ? String(f.properties?.id ?? f.id) : null;
    };

    const mover = (e: EventoMapa) => {
      if (toque) return;
      const id = idDe(e);
      marcar(id);
      map.getCanvas().style.cursor = id && areas[id]?.href ? "pointer" : "";
      setHover(id ? { id, x: e.point.x, y: e.point.y } : null);
    };
    const sair = () => {
      if (toque) return;
      marcar(null);
      map.getCanvas().style.cursor = "";
      setHover(null);
    };
    const clicar = (e: EventoMapa) => {
      const id = idDe(e);
      if (!id) return;
      if (toque) {
        marcar(id);
        setHover({ id, x: e.point.x, y: e.point.y, fixo: true });
        return;
      }
      const href = areas[id]?.href;
      if (href) router.push(href);
    };

    map.on("mousemove", "preenchimento", mover);
    map.on("mouseleave", "preenchimento", sair);
    map.on("click", "preenchimento", clicar);
    return () => {
      // Ao sair da página (ex.: clique num estado), o efeito que cria o mapa já o destruiu antes
      // desta limpeza rodar; mexer nele aqui gerava o "Runtime TypeError".
      if (mapRef.current !== map) return;
      map.off("mousemove", "preenchimento", mover);
      map.off("mouseleave", "preenchimento", sair);
      map.off("click", "preenchimento", clicar);
      marcar(null);
    };
  }, [pronto, areas, router]);

  const area = hover ? areas[hover.id] : undefined;
  const ranking = area
    ? area.v
        .map((votos, i) => ({ i, votos }))
        .sort((a, b) => b.votos - a.votos)
        .slice(0, 3)
    : [];

  return (
    <section aria-label={titulo}>
      {modos.length > 1 && (
      <div className="mb-3 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Como colorir o mapa">
        {modos.includes("vencedor") && (
          <Segmento ativo={tipo === "vencedor"} onClick={() => setTipo("vencedor")}>
            Quem venceu
          </Segmento>
        )}
        {modos.includes("percentual") && (
          <Segmento ativo={tipo === "percentual"} onClick={() => setTipo("percentual")}>
            Votos de um candidato
          </Segmento>
        )}
        {temDisputa && modos.includes("diferenca") && (
          <Segmento ativo={tipo === "diferenca"} onClick={() => setTipo("diferenca")}>
            Diferença entre os dois primeiros
          </Segmento>
        )}
        {tipo === "percentual" && (
          <label className="ml-1 flex items-center gap-2 text-sm text-ink-2">
            <span className="sr-only">Candidato</span>
            <select
              value={cand}
              onChange={(e) => setCand(Number(e.target.value))}
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              {candidatos.map((c, i) => (
                <option key={c.sq} value={i}>
                  {nomeCurto(c)} ({c.partido})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      )}

      <div className="relative overflow-hidden rounded-lg border border-line bg-surface">
        <div ref={container} className="h-[380px] w-full sm:h-[520px]" />
        {!pronto && <p className="absolute inset-0 grid place-items-center text-sm text-ink-2">Carregando mapa…</p>}

        {hover && area && (
          <div
            className="pointer-events-auto absolute z-10 w-64 rounded-md border border-line bg-surface p-3 text-sm shadow-lg"
            style={{
              left: Math.min(hover.x + 14, (container.current?.clientWidth ?? 300) - 270),
              top: Math.max(8, Math.min(hover.y + 14, (container.current?.clientHeight ?? 300) - 170)),
            }}
            role="status"
          >
            <p className="font-semibold">{area.nome}</p>
            <ul className="mt-2 space-y-1.5">
              {ranking.map(({ i, votos }) => (
                <li key={i} className="flex items-center gap-2">
                  <span aria-hidden className="h-0.5 w-3 shrink-0 rounded" style={{ background: cores[i] }} />
                  <span className="min-w-0 flex-1 truncate text-ink-2">{nomes[i]}</span>
                  <span className="num font-semibold">{fmtPct(area.validos ? (votos / area.validos) * 100 : 0, 1)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-2">{fmtInt(area.validos)} votos válidos</p>
            {hover.fixo && area.href && (
              <a href={area.href} className="mt-2 inline-block text-sm font-semibold underline underline-offset-2">
                Ver {unidade}
              </a>
            )}
          </div>
        )}
      </div>

      <Legenda classes={esc.legenda} continua={tipo !== "vencedor"} />
      {rotuloSemDados && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ background: SEM_DADOS[tema] }} />
          {rotuloSemDados}
        </p>
      )}
      <p className="mt-1 text-xs text-ink-2">
        Passe o mouse ou toque em um {unidade} para ver os números{temLinks ? "; clique para abrir a página dele" : ""}.
      </p>
    </section>
  );
}

function Segmento({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        ativo ? "border-ink bg-ink text-page" : "border-line bg-surface text-ink-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Legenda({ classes, continua }: { classes: { cor: string; rotulo: string }[]; continua: boolean }) {
  if (continua) {
    return (
      <div className="mt-3" aria-label="Legenda">
        <div className="flex gap-0.5">
          {classes.map((c) => (
            <span key={c.rotulo} className="h-2.5 flex-1 first:rounded-l last:rounded-r" style={{ background: c.cor }} />
          ))}
        </div>
        <div className="mt-1 flex gap-0.5 text-[11px] leading-tight text-ink-2">
          {classes.map((c) => (
            <span key={c.rotulo} className="num flex-1 text-center">
              {c.rotulo}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2" aria-label="Legenda">
      {classes.map((c) => (
        <li key={c.rotulo} className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-sm" style={{ background: c.cor }} />
          {c.rotulo}
        </li>
      ))}
    </ul>
  );
}
