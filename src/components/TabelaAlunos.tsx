"use client";

import Link from "next/link";
import { GrupoRedes } from "@/components/RedesBadges";
import { corHabilidade } from "@/lib/habilidades";
import { iniciais } from "@/lib/links";
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  alunos: AlunoNaTela[];
  meusVotos: string[];
  ocupado: string | null;
  onEstrelar: (id: string, ev?: React.MouseEvent) => void;
  onAbrirCracha: (aluno: AlunoNaTela) => void;
  onSelecionarAluno?: (aluno: AlunoNaTela) => void;
  ocultarColunaSala?: boolean;
};

export function TabelaAlunos({
  alunos,
  meusVotos,
  ocupado,
  onEstrelar,
  onAbrirCracha,
  onSelecionarAluno,
  ocultarColunaSala = false,
}: Props) {
  if (alunos.length === 0) {
    return (
      <div className="vazio">
        <b>Nenhum estudante encontrado nesta visualização</b>
        <p>Tente ajustar os filtros ou os termos de busca digitados.</p>
      </div>
    );
  }

  return (
    <div className="tabela-container">
      <table className="tabela-alunos">
        <thead>
          <tr>
            <th scope="col">Aluno</th>
            {!ocultarColunaSala ? <th scope="col">Sala</th> : null}
            <th scope="col">Habilidades & Foco</th>
            <th scope="col" style={{ minWidth: "16rem" }}>
              Redes Profissionais (LinkedIn / GitHub)
            </th>
            <th scope="col" style={{ textAlign: "right" }}>
              Estrelas
            </th>
            <th scope="col" style={{ textAlign: "center" }}>
              Crachá & Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {alunos.map((aluno) => {
            const estrelado = meusVotos.includes(aluno.id);

            return (
              <tr
                key={aluno.id}
                className="tabela-linha"
                style={{ ["--sala-cor" as string]: aluno.cor }}
                onClick={() => onSelecionarAluno?.(aluno)}
              >
                <td>
                  <div className="tabela-aluno-celula">
                    <span
                      className="avatar mini-avatar"
                      style={{
                        background: `color-mix(in srgb, ${aluno.cor} 25%, var(--surface-2))`,
                        border: `1.5px solid ${aluno.cor}`,
                      }}
                      aria-hidden="true"
                    >
                      {iniciais(aluno.nome)}
                    </span>
                    <div>
                      <div className="tabela-nome-wrap">
                        {onSelecionarAluno ? (
                          <button
                            type="button"
                            className="tabela-aluno-nome-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelecionarAluno(aluno);
                            }}
                          >
                            {aluno.nome}
                          </button>
                        ) : (
                          <Link
                            href={`/alunos/${aluno.slug}`}
                            className="tabela-aluno-nome"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {aluno.nome}
                          </Link>
                        )}
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

                {!ocultarColunaSala ? (
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
                ) : null}

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

                {/* Redes Sociais com badges destacados oficiais do LinkedIn e GitHub */}
                <td>
                  <GrupoRedes
                    linkedin={aluno.linkedin}
                    github={aluno.github}
                    instagram={aluno.instagram}
                    nomeAluno={aluno.nome}
                  />
                </td>

                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="estrela"
                    aria-pressed={estrelado}
                    disabled={ocupado === aluno.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEstrelar(aluno.id, e);
                    }}
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
                  <div className="tabela-acoes-botoes" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="mini botao-cracha-acao"
                      onClick={() => onAbrirCracha(aluno)}
                      title={`Abrir Crachá 3D de ${aluno.nome}`}
                    >
                      📇 Ver Crachá
                    </button>
                    {onSelecionarAluno ? (
                      <button
                        type="button"
                        className="mini botao-ver-perfil-acao"
                        onClick={() => onSelecionarAluno(aluno)}
                        title={`Ver perfil completo de ${aluno.nome}`}
                      >
                        Perfil →
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

