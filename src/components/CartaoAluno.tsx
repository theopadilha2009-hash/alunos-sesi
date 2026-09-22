"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { corHabilidade } from "@/lib/habilidades";
import { iniciais, urlGithub } from "@/lib/links";
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
  const cardRef = useRef<HTMLLIElement>(null);
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, mouseX: 50, mouseY: 50, ativo: false });
  const github = urlGithub(aluno.github);

  function handleMouseMove(e: React.MouseEvent<HTMLLIElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotX = ((y - rect.height / 2) / (rect.height / 2)) * -6;
    const rotY = ((x - rect.width / 2) / (rect.width / 2)) * 6;

    setTilt({
      rotX,
      rotY,
      mouseX: (x / rect.width) * 100,
      mouseY: (y / rect.height) * 100,
      ativo: true,
    });
  }

  function handleMouseLeave() {
    setTilt({ rotX: 0, rotY: 0, mouseX: 50, mouseY: 50, ativo: false });
  }

  return (
    <li
      ref={cardRef}
      className={`aluno ${tilt.ativo ? "aluno-tilt" : ""}`}
      data-fixado={aluno.fixado ? "" : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        {
          ["--sala" as string]: aluno.cor,
          ["--card-rot-x" as string]: `${tilt.rotX}deg`,
          ["--card-rot-y" as string]: `${tilt.rotY}deg`,
          ["--card-mx" as string]: `${tilt.mouseX}%`,
          ["--card-my" as string]: `${tilt.mouseY}%`,
        } as React.CSSProperties
      }
    >
      <div className="aluno-cabeca">
        <span className="avatar" aria-hidden="true">
          {iniciais(aluno.nome)}
        </span>
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
        {aluno.destaque ? <span className="selo selo-adm">★ ADM</span> : null}

        {onAbrirCracha ? (
          <button
            type="button"
            className="pes pes-cracha"
            onClick={() => onAbrirCracha(aluno)}
            title="Abrir Crachá Holográfico 3D"
          >
            📇 Crachá
          </button>
        ) : null}

        {aluno.linkedin ? (
          <a
            className="pes pes-in"
            href={aluno.linkedin}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`LinkedIn de ${aluno.nome}`}
            title="LinkedIn"
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
            title="GitHub"
          >
            gh
          </a>
        ) : null}

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
          {estrelado ? "★" : "☆"} {aluno.estrelas}
        </button>
      </div>
    </li>
  );
}
