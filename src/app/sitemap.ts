import type { MetadataRoute } from "next";
import { listarAlunos } from "@/lib/dados";
import { URL_BASE } from "@/lib/links";

export const dynamic = "force-dynamic";

/**
 * Anuncia só o que é público de verdade: a vitrine e um URL por aluno.
 *
 * A raiz ficou de fora porque é a tela de login do CRM — anunciá-la fazia o
 * Google receber um mapa de páginas que o próprio HTML marcava como noindex,
 * que é o pior dos dois mundos (a instrução se anula e a URL entra no índice
 * pela porta do sitemap). Também ficam de fora /u/[slug] e /validar/[slug]:
 * são páginas de identidade e conferência, marcadas noindex na origem.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let alunos: { slug: string; atualizado_em?: string }[] = [];

  try {
    alunos = await listarAlunos();
  } catch {
    alunos = [];
  }

  const rotasAlunos: MetadataRoute.Sitemap = alunos.map((a) => ({
    url: `${URL_BASE}/alunos/${a.slug}`,
    lastModified: a.atualizado_em ? new Date(a.atualizado_em) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: `${URL_BASE}/alunos`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...rotasAlunos,
  ];
}
