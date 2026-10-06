import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const CACHE_DIR = path.join(ROOT, ".cache");
/** JSON gerado, servido estaticamente e lido pelas páginas no build. */
export const DATA_DIR = path.join(ROOT, "public", "data");
export const GEO_DIR = path.join(ROOT, "public", "geo");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET com retry exponencial e cache em disco (.cache/), para que rodar o pipeline de novo não
 * bata no TSE outra vez. `fresh: true` ignora o cache.
 */
export async function fetchCached(url: string, opts: { fresh?: boolean; tries?: number } = {}): Promise<Buffer> {
  const key = createHash("sha1").update(url).digest("hex");
  const file = path.join(CACHE_DIR, key.slice(0, 2), `${key}${path.extname(new URL(url).pathname) || ".bin"}`);
  if (!opts.fresh && existsSync(file)) return readFile(file);

  const tries = opts.tries ?? 5;
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "painel-eleicoes-2026 (projeto de portfolio)" } });
      if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { status: 404 });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, buf);
      return buf;
    } catch (err) {
      lastErr = err;
      if ((err as { status?: number }).status === 404) break;
      await sleep(500 * 2 ** i);
    }
  }
  throw lastErr;
}

export async function fetchJson<T = unknown>(url: string, opts?: { fresh?: boolean }): Promise<T> {
  const buf = await fetchCached(url, opts);
  return JSON.parse(buf.toString("utf-8")) as T;
}

export async function writeJson(rel: string, data: unknown, base = DATA_DIR): Promise<string> {
  const file = path.join(base, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data));
  return file;
}

export async function readJson<T = unknown>(rel: string, base = DATA_DIR): Promise<T> {
  return JSON.parse(await readFile(path.join(base, rel), "utf-8")) as T;
}

export function progress(label: string, total: number) {
  let done = 0;
  let last = 0;
  return () => {
    done++;
    const now = Date.now();
    if (done === total || now - last > 1500) {
      last = now;
      process.stdout.write(`\r${label}: ${done}/${total}   `);
      if (done === total) process.stdout.write("\n");
    }
  };
}
