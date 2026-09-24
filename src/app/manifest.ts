import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alunos SESI SC · Joinville",
    short_name: "SESI Joinville",
    description: "Plataforma oficial de talentos, crachás digitais e ecossistema escolar do SESI SENAI Joinville - SC.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0F17",
    theme_color: "#E30613",
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
        url: "/?aba=cracha",
        icons: [{ src: "/logo-sesi-icone.png", sizes: "192x192" }],
      },
      {
        name: "Mural de Desafios",
        short_name: "Desafios",
        url: "/?aba=desafios",
        icons: [{ src: "/logo-sesi-icone.png", sizes: "192x192" }],
      },
    ],
  };
}
