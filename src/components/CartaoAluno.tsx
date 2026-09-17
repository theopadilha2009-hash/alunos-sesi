"use client";

import Link from "next/link";
import { iniciais, urlGithub } from "@/lib/links";
import type { AlunoNaTela } from "@/lib/tipos";

export function CartaoAluno({
  aluno,
  estrelado,
  ocupado,
  onEstrelar,
}: {
  aluno: AlunoNaTela;
  estrelado: boolean;
  ocupado: boolean;
  onEstrelar: (id: string) => void;
}) {
  const github = urlGithub(aluno.github);

  return (
    <li
      className="aluno"
      data-fixado={aluno.fixado ? "" : undefined}
      style={{ ["--sala" as string]: aluno.cor }}
    >
      <div className="aluno-cabeca">
        <span className="avatar" aria-hidden="true">
          {iniciais(aluno.nome)}
        </span>
        <div>
          <h3 className="aluno-nome">
            <Link href={`/alunos/${aluno.slug}`}>{aluno.nome}</Link>
          </h3>
          {aluno.sala ? <span className="aluno-sala">{aluno.sala}</span> : null}
        </div>
      </div>

      {aluno.bio ? <p className="aluno-bio">{aluno.bio}</p> : null}

      <div className="aluno-pes">
        {aluno.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
        {aluno.destaque ? <span className="selo selo-adm">★ ADM</span> : null}

        {aluno.linkedin ? (
          <a
            className="pes pes-in"
            href={aluno.linkedin}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`LinkedIn de ${aluno.nome}`}
          >
            in
          </a>
        ) : null}

        {github ? (
          <a
            className="pes pes-gh"
            href={github}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`GitHub de ${aluno.nome}`}
          >
            gh
          </a>
        ) : null}

        <button
          type="button"
          className="estrela"
          aria-pressed={estrelado}
          disabled={ocupado}
          onClick={() => onEstrelar(aluno.id)}
          aria-label={
            estrelado
              ? `Tirar a estrela de ${aluno.nome}`
              : `Dar estrela para ${aluno.nome}`
          }
          title={estrelado ? "Tirar a estrela" : "Dar estrela"}
        >
          {estrelado ? "★" : "☆"} {aluno.estrelas}
        </button>
      </div>
    </li>
  );
}
