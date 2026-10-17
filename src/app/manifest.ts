import type { MetadataRoute } from "next";

/**
 * Este é o manifest que o navegador realmente serve.
 *
 * Existia também um `public/manifest.json` mais completo, apontado pelo
 * `metadata.manifest` do layout — mas a convenção de arquivo do Next roda
 * depois e sobrescreve aquele campo, então o que valia era este. O conteúdo
 * melhor dos dois foi trazido para cá e o arquivo morto saiu.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alunos SESI SC · Joinville",
    short_name: "SESI Joinville",
    description: "Plataforma oficial de talentos, crachás digitais e ecossistema escolar do SESI SENAI Joinville - SC.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    categories: ["education", "productivity", "utilities"],
    // Cores do CLARO, o único tema (R1): o escuro aqui era resíduo de quando o
    // app abria escuro.
    background_color: "#f8fafc",
    theme_color: "#f8fafc",
    // Quadrados de verdade, gerados a partir do wordmark oficial pelo
    // `scripts/gerar-icones.mjs` — antes eram os wordmarks (165x64 e 264x64)
    // declarados como 192/512, e o ícone instalava espremido. O maskable leva
    // arte a 60% da largura, que cabe inteira na safe zone circular.
    icons: [
      {
        src: "/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Meu Crachá Digital",
        short_name: "Crachá",
        description: "Acesso rápido ao crachá e identidade estudantil",
        url: "/?aba=cracha",
        icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
      },
      {
        name: "Mural de Desafios",
        short_name: "Desafios",
        description: "Ver hackathons e desafios abertos no SESI",
        url: "/?aba=desafios",
        icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
      },
    ],
  };
}
