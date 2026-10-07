// O MapLibre 6 resolve o web worker relativo ao próprio módulo, o que não sobrevive ao bundler.
// Copiamos o worker para public/ e apontamos para ele com setWorkerUrl (ver MapaResultado).
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/maplibre", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/maplibre/maplibre-gl-worker.mjs");
