import type { MetadataRoute } from "next";
import { URL_BASE } from "@/lib/links";

/**
 * A única rota que vale anunciar é a vitrine.
 *
 * Um URL por aluno ficou de fora: o perfil traz nome, bio livre e redes de
 * menor de idade, e as outras duas portas do mesmo aluno (/u/ e /validar/) já
 * são noindex. Anunciar aqui era a contradição que o próprio #7 corrigiu uma vez
 * — sitemap convidando o que o HTML manda não indexar se anula, e o Google acaba
 * entrando pela porta do sitemap.
 *
 * A raiz fica de fora porque é a tela de login do CRM.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${URL_BASE}/alunos`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];
}
