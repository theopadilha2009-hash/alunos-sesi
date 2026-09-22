import type { MetadataRoute } from "next";
import { listarAlunos } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://alunos-sesi.vercel.app";
  let alunos: { slug: string; atualizado_em?: string }[] = [];

  try {
    alunos = await listarAlunos();
  } catch {
    alunos = [];
  }

  const rotasAlunos: MetadataRoute.Sitemap = alunos.map((a) => ({
    url: `${baseUrl}/alunos/${a.slug}`,
    lastModified: a.atualizado_em ? new Date(a.atualizado_em) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/alunos`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...rotasAlunos,
  ];
}
