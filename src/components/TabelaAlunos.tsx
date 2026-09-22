"use client";

import Link from "next/link";
import { corHabilidade } from "@/lib/habilidades";
import { iniciais, urlGithub } from "@/lib/links";
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  alunos: AlunoNaTela[];
  meusVotos: string[];
  ocupado: string | null;
  onEstrelar: (id: string, ev?: React.MouseEvent) => void;
  onAbrirCracha: (aluno: AlunoNaTela) => void;
};

export function TabelaAlunos({
  alunos,
  meusVotos,
  ocupado,
  onEstrelar,
  onAbrirCracha,
}: Props) {
  return (
    <div className="tabela-container">
      <table className="tabela-alunos">
        <thead>
          <tr>
            <th scope="col">Aluno</th>
            <th scope="col">Sala</th>
            <th scope="col">Habilidades</th>
            <th scope="col">Redes</th>
            <th scope="col" style={{ textAlign: "right" }}>
              Estrelas
            </th>
            <th scope="col" style={{ textAlign: "center" }}>
              Crachá
            </th>
          </tr>
        </thead>
        <tbody>
          {alunos.map((aluno) => {
            const estrelado = meusVotos.includes(aluno.id);
            const github = urlGithub(aluno.github);

            return (
              <tr
                key={aluno.id}
                className="tabela-linha"
                style={{ ["--sala-cor" as string]: aluno.cor }}
              >
                <td>
                  <div className="tabela-aluno-celula">
                    <span
                      className="avatar mini-avatar"
                      style={{
                        background: `color-mix(in srgb, ${aluno.cor} 25%, var(--surface-2))`,
                      }}
                      aria-hidden="true"
                    >
                      {iniciais(aluno.nome)}
                    </span>
                    <div>
                      <div className="tabela-nome-wrap">
                        <Link
                          href={`/alunos/${aluno.slug}`}
                          className="tabela-aluno-nome"
                        >
                          {aluno.nome}
                        </Link>
                        {aluno.fixado ? (
                          <span className="selo selo-fixado">Fixado</span>
                        ) : null}
                        {aluno.destaque ? (
                          <span className="selo selo-adm">★ ADM</span>
                        ) : null}
                      </div>
                      {aluno.bio ? (
                        <p className="tabela-aluno-bio">{aluno.bio}</p>
                      ) : null}
                    </div>
                  </div>
                </td>

                <td>
                  {aluno.sala ? (
                    <span
                      className="cracha-sala-pill"
                      style={{ borderColor: aluno.cor }}
                    >
                      <span className="ponto" style={{ background: aluno.cor }} />
                      {aluno.sala}
                    </span>
                  ) : (
                    <span className="tabela-sem-dado">—</span>
                  )}
                </td>

                <td>
                  {aluno.habilidades && aluno.habilidades.length > 0 ? (
                    <div className="tabela-habilidades">
                      {aluno.habilidades.slice(0, 3).map((hab) => (
                        <span
                          key={hab}
                          className="tag-habilidade"
                          style={{
                            ["--cor-tag" as string]: corHabilidade(hab),
                          }}
                        >
                          {hab}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="tabela-sem-dado">—</span>
                  )}
                </td>

                <td>
                  <div className="tabela-redes">
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
                    {!aluno.linkedin && !github ? (
                      <span className="tabela-sem-dado">—</span>
                    ) : null}
                  </div>
                </td>

                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="estrela"
                    aria-pressed={estrelado}
                    disabled={ocupado === aluno.id}
                    onClick={(e) => onEstrelar(aluno.id, e)}
                    aria-label={
                      estrelado
                        ? `Tirar estrela de ${aluno.nome}`
                        : `Dar estrela para ${aluno.nome}`
                    }
                  >
                    {estrelado ? "★" : "☆"} {aluno.estrelas}
                  </button>
                </td>

                <td style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    className="mini botao-cracha-acao"
                    onClick={() => onAbrirCracha(aluno)}
                    title={`Abrir Crachá 3D de ${aluno.nome}`}
                  >
                    📇 Ver Crachá
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
