"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BadgeGitHub, BadgeLinkedIn } from "@/components/RedesBadges";
import { IconeCracha, IconeEscudo, IconeEstrela } from "@/components/Icones";
import { corHabilidade } from "@/lib/habilidades";
import type { AlunoNaTela } from "@/lib/tipos";

export function CartaoAluno({
  aluno,
  estrelado,
  ocupado,
  onEstrelar,
  onAbrirCracha,
}: {
  aluno: AlunoNaTela;
  estrelado: boolean;
  ocupado: boolean;
  onEstrelar: (id: string, ev?: React.MouseEvent) => void;
  onAbrirCracha?: (aluno: AlunoNaTela) => void;
}) {
  return (
    <li
      className="aluno"
      data-fixado={aluno.fixado ? "" : undefined}
      style={{ ["--sala" as string]: aluno.cor }}
    >
      <div className="aluno-cabeca">
        <Avatar nome={aluno.nome} foto={aluno.foto_url} />
        <div>
          <h3 className="aluno-nome">
            <Link href={`/alunos/${aluno.slug}`}>{aluno.nome}</Link>
          </h3>
          {aluno.sala ? (
            <span className="aluno-sala">
              <span className="ponto" style={{ background: aluno.cor }} />
              {aluno.sala}
            </span>
          ) : null}
        </div>
      </div>

      {aluno.bio ? <p className="aluno-bio">{aluno.bio}</p> : null}

      {aluno.habilidades && aluno.habilidades.length > 0 ? (
        <div className="aluno-habilidades">
          {aluno.habilidades.slice(0, 3).map((hab) => (
            <span
              key={hab}
              className="tag-habilidade"
              style={{ ["--cor-tag" as string]: corHabilidade(hab) }}
            >
              {hab}
            </span>
          ))}
        </div>
      ) : null}

      <div className="aluno-pes">
        {aluno.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
        {aluno.destaque ? (
          <span className="selo selo-adm">
            <IconeEscudo tamanho={10} /> ADM
          </span>
        ) : null}

        {onAbrirCracha ? (
          <button
            type="button"
            className="pes pes-cracha"
            onClick={() => onAbrirCracha(aluno)}
            title="Abrir Crachá Holográfico 3D"
          >
            <IconeCracha tamanho={13} />
            <span>Crachá</span>
          </button>
        ) : null}

        <BadgeLinkedIn url={aluno.linkedin} nomeAluno={aluno.nome} />
        <BadgeGitHub username={aluno.github} nomeAluno={aluno.nome} />

        <button
          type="button"
          className="estrela"
          aria-pressed={estrelado}
          disabled={ocupado}
          onClick={(e) => onEstrelar(aluno.id, e)}
          aria-label={
            estrelado
              ? `Tirar a estrela de ${aluno.nome}`
              : `Dar estrela para ${aluno.nome}`
          }
          title={estrelado ? "Tirar a estrela" : "Dar estrela"}
        >
          <IconeEstrela preenchida={estrelado} tamanho={12} /> {aluno.estrelas}
        </button>
      </div>
    </li>
  );
}

