"use client";

import { useSyncExternalStore } from "react";
import type { Tema } from "./colors";

function ler(): Tema {
  const forcado = document.documentElement.dataset.theme;
  if (forcado === "dark") return "escuro";
  if (forcado === "light") return "claro";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

function assinar(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    mq.removeEventListener("change", cb);
    obs.disconnect();
  };
}

export function useTema(): Tema {
  return useSyncExternalStore(assinar, ler, () => "claro");
}
