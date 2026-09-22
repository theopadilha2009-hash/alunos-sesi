import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Rodape, Topo } from "@/components/ds";
import { PerfilInterativo } from "@/components/PerfilInterativo";
import { corDaSala } from "@/lib/cores";
import { alunoPorSlug, listarSalas } from "@/lib/dados";

type Props = PageProps<"/alunos/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug.replace(/-/g, " ")} · Alunos SESI` };
}

export default async function PerfilPage({ params }: Props) {
  const { slug } = await params;

  const [aluno, salas] = await Promise.all([alunoPorSlug(slug), listarSalas()]);
  if (!aluno) notFound();

  const sala = aluno.sala_id
    ? (salas.find((s) => s.id === aluno.sala_id)?.nome ?? null)
    : null;

  return (
    <>
      <Topo voltar={{ href: "/alunos", texto: "← A turma" }} />

      <main className="wrap">
        <PerfilInterativo
          aluno={{ ...aluno, sala, cor: corDaSala(sala ?? "") }}
          salaNome={sala}
        />
      </main>

      <Rodape>Compartilhe este crachá no seu currículo e redes.</Rodape>
    </>
  );
}
