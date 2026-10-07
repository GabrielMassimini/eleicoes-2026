import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // Rotas renderizadas sob demanda leem os JSON gerados em public/data com fs.
  outputFileTracingIncludes: {
    "/api/ao-vivo/**": [
      "./public/data/1t/*/presidente.json",
      "./public/data/1t/*/governador.json",
      "./public/data/1t/*/municipios-presidente.json",
      "./public/data/municipios.json",
    ],
    "/candidatos/[sq]": ["./public/data/1t/**/*.json", "./public/data/candidatos/**/*.json", "./public/data/municipios.json"],
  },
};

export default nextConfig;
