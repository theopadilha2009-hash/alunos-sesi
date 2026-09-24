import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // O argon2 é um addon nativo (.node). Sem isto o Next tenta empacotá-lo e o
  // build quebra na Vercel — o binário pré-compilado tem que ser resolvido em
  // runtime, não bundlado.
  serverExternalPackages: ["@node-rs/argon2"],

  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          // A CSP saiu daqui de propósito: ela precisa de um nonce por
          // requisição, e isso só o proxy.ts consegue gerar. Manter as duas
          // faria o navegador aplicar a interseção das duas políticas.
          // Ver src/lib/csp.ts.
        ],
      },
      {
        source: "/adm/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
