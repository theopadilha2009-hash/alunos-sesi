"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { IconeCracha, IconeEstrela } from "@/components/Icones";
import { GrupoRedes } from "@/components/RedesBadges";
import { motivoParaNaoEstrelar } from "@/lib/estrela";
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
            const impedimento = motivoParaNaoEstrelar(aluno);

            return (
              <tr
                key={aluno.id}
                className="tabela-linha"
                style={{ ["--sala-cor" as string]: aluno.cor }}
                onClick={() => onSelecionarAluno?.(aluno)}
              >
                <td>
                  <div className="tabela-aluno-celula">
                    <Avatar
                      nome={aluno.nome}
                      foto={aluno.foto_url}
                      className="mini-avatar"
                      style={{
                        background: `color-mix(in srgb, ${aluno.cor} 25%, var(--surface-2))`,
                        border: `1.5px solid ${aluno.cor}`,
                      }}
                    />
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
                          <span className="selo selo-destaque">
                            <IconeEstrela tamanho={11} /> Destaque
                          </span>
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
                        className="badge-sala-tabela"
                        style={{ ["--sala-cor" as string]: aluno.corSala }}
                      >
                        <span className="ponto-sala" style={{ background: aluno.corSala }} />
                        <span>{aluno.sala}</span>
                      </span>
                    ) : (
                      <span className="tabela-sem-dado">—</span>
                    )}
                  </td>
                ) : null}

                <td>
                  {aluno.habilidades && aluno.habilidades.length > 0 ? (
                    <div className="tabela-habilidades-clean">
                      {aluno.habilidades.slice(0, 3).map((hab) => (
                        <span key={hab} className="tag-habilidade-clean">
                          {hab}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="tabela-sem-dado">Geral</span>
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
                  {/* O motivo do bloqueio mora no `<span>`, não no botão: o Chrome
                      não emite evento de mouse em controle `disabled`, então um
                      `title` no botão nunca vira tooltip — quem enxerga ficava
                      sem o motivo (o `aria-label` abaixo atende o leitor de
                      tela). O envoltório é quem recebe o ponteiro.

                      Duas razões para não deixar clicar: o perfil pendente, que a
                      rota recusa sempre, e um voto já em voo — o `estrelar` do
                      CRM aceita um por vez. Só a primeira rende motivo a
                      explicar; a segunda é transitória. É essa diferença que o
                      `data-bloqueada` marca: sem ele o cursor era `progress` nos
                      dois casos, dizendo "carregando" no que não vai passar. */}
                  <span
                    className="estrela-wrap"
                    title={impedimento ?? undefined}
                    data-bloqueada={impedimento ? "" : undefined}
                  >
                    <button
                      type="button"
                      className="estrela"
                      aria-pressed={estrelado}
                      disabled={impedimento !== null || ocupado !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEstrelar(aluno.id, e);
                      }}
                      aria-label={
                        impedimento ??
                        (estrelado
                          ? `Tirar estrela de ${aluno.nome}`
                          : `Dar estrela para ${aluno.nome}`)
                      }
                    >
                      <IconeEstrela preenchida={estrelado} tamanho={12} /> {aluno.estrelas}
                    </button>
                  </span>
                </td>

                <td style={{ textAlign: "center" }}>
                  <div className="tabela-acoes-botoes" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="mini botao-cracha-acao"
                      onClick={() => onAbrirCracha(aluno)}
                      title={`Abrir Crachá Digital de ${aluno.nome}`}
                    >
                      <IconeCracha tamanho={13} />
                      <span>Crachá</span>
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

