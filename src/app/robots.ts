import type { MetadataRoute } from "next";
import { URL_BASE } from "@/lib/links";

/**
 * As rotas bloqueadas aqui são as mesmas que se marcam `noindex` na origem —
 * mas o bloqueio é o cinto, não o suspensório: /adm é o painel, /api são as
 * rotas de escrita, e /u e /validar expõem dado pessoal do aluno. Bloquear
 * impede o rastreio; o noindex na página cobre o caso de a URL ser encontrada
 * por um link externo.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/adm", "/api/", "/u/", "/validar/"],
      },
    ],
    sitemap: `${URL_BASE}/sitemap.xml`,
  };
}
