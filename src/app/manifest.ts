import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alunos SESI · Portfólio & CRM",
    short_name: "Alunos SESI",
    description: "Diretório profissional, crachás digitais e projetos dos estudantes do SESI",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f14",
    theme_color: "#02609e",
    icons: [
      {
        src: "/logo-sesi-icone.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo-sesi-icone.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
