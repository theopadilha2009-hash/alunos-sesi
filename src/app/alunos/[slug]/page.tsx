import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Rodape, Topo } from "@/components/ds";
import { PerfilInterativo } from "@/components/PerfilInterativo";
import { corDaSala, corDoAluno } from "@/lib/cores";
import { alunoPorSlug, listarSalas, votosDoVisitante } from "@/lib/dados";
import { COOKIE_VISITANTE, abrirAssinado } from "@/lib/sessao";

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

export default async function PerfilPage({ params, searchParams }: Props) {
  const { slug } = await params;
  // Deep-link do botão "Mini-Currículo (A4)" do cartão NFC (`/u/[slug]`). Sem
  // isto o parâmetro chegava e morria: o aluno clicava e caía aqui sem nada
  // abrir, com o botão prometendo um PDF.
  const { curriculo } = await searchParams;

  const jar = await cookies();
  const visitante = abrirAssinado(jar.get(COOKIE_VISITANTE)?.value, "visitante");

  // O voto do visitante entra aqui, junto das outras duas leituras — é o que a
  // vitrine já faz em `/alunos`. Sem isto, quem já tinha estrelado este aluno
  // abria o perfil com a estrela apagada e o clique seguinte mandava um `POST`
  // que o `on conflict do nothing` da rota descartava: confete, nenhum voto
  // novo e nenhum aviso. É o "a estrela mente" que a PR #42 matou no CRM,
  // sobrevivendo aqui por outra porta. Sem cookie o `votosDoVisitante` devolve
  // lista vazia sem ir ao banco, então a visita anônima não paga nada.
  const [aluno, salas, meusVotos] = await Promise.all([
    alunoPorSlug(slug),
    listarSalas(),
    votosDoVisitante(visitante ?? ""),
  ]);
  if (!aluno) notFound();

  const sala = aluno.sala_id
    ? (salas.find((s) => s.id === aluno.sala_id)?.nome ?? null)
    : null;

  return (
    <>
      <Topo voltar={{ href: "/alunos", texto: "← A turma" }} />

      <main className="wrap">
        <PerfilInterativo
          aluno={{
            ...aluno,
            sala,
            cor: corDoAluno(aluno.cor_perfil, sala),
            corSala: corDaSala(sala ?? ""),
          }}
          salaNome={sala}
          estreladoInicial={meusVotos.includes(aluno.id)}
          abrirCurriculo={curriculo === "1"}
        />
      </main>

      <Rodape>Compartilhe este crachá no seu currículo e redes.</Rodape>
    </>
  );
}
