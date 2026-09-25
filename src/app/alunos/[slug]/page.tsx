import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Rodape, Topo } from "@/components/ds";
import { PerfilInterativo } from "@/components/PerfilInterativo";
import { corDaSala } from "@/lib/cores";
import { alunoPorSlug, listarSalas } from "@/lib/dados";

type Props = PageProps<"/alunos/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const aluno = await alunoPorSlug(slug);
  if (!aluno) return { title: "Aluno · Alunos SESI" };

  const titulo = `${aluno.nome} · Crachá Digital & Portfólio SESI`;
  const descricao =
    aluno.bio ||
    `Conheça as competências, projetos e redes profissionais de ${aluno.nome} na Escola SESI.`;

  return {
    title: titulo,
    description: descricao,
    // Perfil de aluno menor de idade: nome, bio livre e redes fora do índice de
    // busca. A página continua acessível por link direto — o que sai é a
    // descoberta por nome no Google. Alinha as três portas do mesmo aluno, já
    // que /u/ e /validar/ são noindex. `follow` fica ligado para o perfil
    // continuar levando crawler à vitrine.
    robots: { index: false, follow: true },
    openGraph: {
      title: titulo,
      description: descricao,
      type: "profile",
      locale: "pt_BR",
    },
    twitter: {
      card: "summary",
      title: titulo,
      description: descricao,
    },
  };
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
