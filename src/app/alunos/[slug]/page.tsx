import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Rodape, Topo } from "@/components/ds";
import { alunoPorSlug, listarSalas } from "@/lib/dados";
import { corDaSala } from "@/lib/cores";
import { handleLinkedin, iniciais, urlGithub } from "@/lib/links";

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
  const github = urlGithub(aluno.github);
  const linkedinHandle = handleLinkedin(aluno.linkedin);

  return (
    <>
      <Topo voltar={{ href: "/alunos", texto: "← A turma" }} />

      <main className="wrap">
        <article
          className="perfil"
          style={{ ["--sala" as string]: corDaSala(sala ?? "") }}
        >
          <div className="perfil-topo">
            <span className="avatar" aria-hidden="true">
              {iniciais(aluno.nome)}
            </span>
            <div>
              <h1>{aluno.nome}</h1>
              {sala ? (
                <span className="sala-tag">
                  <span className="ponto" />
                  {sala}
                </span>
              ) : null}
            </div>
          </div>

          {aluno.fixado || aluno.destaque ? (
            <p style={{ display: "flex", gap: "0.4rem", margin: "0 0 1rem" }}>
              {aluno.fixado ? (
                <span className="selo selo-fixado">Fixado</span>
              ) : null}
              {aluno.destaque ? (
                <span className="selo selo-adm">★ Destaque do ADM</span>
              ) : null}
            </p>
          ) : null}

          {aluno.bio ? (
            <p style={{ fontSize: "1.05rem", color: "var(--dim)" }}>
              {aluno.bio}
            </p>
          ) : null}

          <div className="perfil-links">
            {aluno.linkedin ? (
              <a
                className="pes pes-in"
                href={aluno.linkedin}
                target="_blank"
                rel="noreferrer noopener"
              >
                in · {linkedinHandle ?? "LinkedIn"}
              </a>
            ) : null}

            {github ? (
              <a
                className="pes pes-gh"
                href={github}
                target="_blank"
                rel="noreferrer noopener"
              >
                gh · {aluno.github}
              </a>
            ) : null}

            <span className="estrela" aria-label="Estrelas recebidas">
              ★ {aluno.estrelas}
            </span>
          </div>

          {!aluno.linkedin && !github ? (
            <p style={{ marginTop: "1.5rem", color: "var(--faint)" }}>
              Este aluno ainda não cadastrou LinkedIn nem GitHub.
            </p>
          ) : null}

          <p style={{ marginTop: "2.5rem" }}>
            <Link href="/alunos" className="botao botao-fraco">
              ← Voltar para a turma
            </Link>
          </p>
        </article>
      </main>

      <Rodape>Compartilhe este link no seu currículo.</Rodape>
    </>
  );
}
