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
    background_color: "#090d12",
    theme_color: "#090d12",
    // atalho: os PNGs abaixo são wordmarks (165x64 e 264x64) declarados como
    // 192 e 512. O app instala porque o Chrome confia no `sizes` declarado, mas
    // o ícone renderiza espremido, e `purpose: "maskable"` recortaria a palavra
    // na forma do sistema. Trocar por ícones quadrados de verdade — é peça de
    // design, o wordmark não vira ícone. Enquanto isso, o `sizes` fica como
    // está: corrigir para o tamanho real (não quadrado) quebraria a instalação.
    icons: [
      {
        src: "/logo-sesi-icone.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo-sesi.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Meu Crachá Digital",
        short_name: "Crachá",
        description: "Acesso rápido ao crachá e identidade estudantil",
        url: "/?aba=cracha",
        icons: [{ src: "/logo-sesi-icone.png", sizes: "192x192" }],
      },
      {
        name: "Mural de Desafios",
        short_name: "Desafios",
        description: "Ver hackathons e desafios abertos no SESI",
        url: "/?aba=desafios",
        icons: [{ src: "/logo-sesi-icone.png", sizes: "192x192" }],
      },
    ],
  };
}
