"use client";

import { useMemo } from "react";
import { Avatar } from "@/components/Avatar";
import { BadgeGitHub, BadgeLinkedIn } from "@/components/RedesBadges";
import { IconeCracha, IconeFogo, IconeProjetos } from "@/components/Icones";
import { ordenarAlunos } from "@/lib/ranking";
import type { AlunoNaTela } from "@/lib/tipos";

export type ItemProjetoTop = {
  id: string;
  rank: 1 | 2 | 3;
  titulo: string;
  descricao: string;
  tags: string[];
  /** Capa que o aluno cadastrou. Ausente = cartão sem imagem, nunca banco de imagens. */
  imagem?: string;
  link?: string;
  autor: {
    id: string;
    nome: string;
    sala: string | null;
    cor: string;
    foto: string | null;
    linkedin: string | null;
    github: string | null;
    objetoAluno: AlunoNaTela;
  };
};

type Props = {
  alunos: AlunoNaTela[];
  onAbrirPerfil: (aluno: AlunoNaTela) => void;
  onAbrirCracha: (aluno: AlunoNaTela) => void;
};

const RANKS = [1, 2, 3] as const;

export function TopProjetosTurma({ alunos, onAbrirPerfil, onAbrirCracha }: Props) {
  const top3: ItemProjetoTop[] = useMemo(() => {
    const itens: ItemProjetoTop[] = [];

    // Mesma ordem canônica da Vitrine. A varredura é aluno a aluno e vai
    // preenchendo as três vagas, então quem tem dois projetos ocupa duas
    // posições — é a regra mais simples de explicar a quem olha o pódio.
    for (const aluno of ordenarAlunos(alunos)) {
      for (const projeto of aluno.projetos ?? []) {
        if (itens.length === RANKS.length) break;
        itens.push({
          // O id do projeto é único dentro do perfil, não entre perfis: o
          // sanitizador gera `proj-1` para todo mundo que não mandou id.
          id: `${aluno.id}:${projeto.id}`,
          rank: RANKS[itens.length],
          titulo: projeto.titulo,
          descricao: projeto.descricao,
          tags: aluno.habilidades ?? [],
          imagem: projeto.imagem,
          link: projeto.link,
          autor: {
            id: aluno.id,
            nome: aluno.nome,
            sala: aluno.sala,
            cor: aluno.cor,
            foto: aluno.foto_url ?? null,
            linkedin: aluno.linkedin ?? null,
            github: aluno.github ?? null,
            objetoAluno: aluno,
          },
        });
      }
      if (itens.length === RANKS.length) break;
    }

    return itens;
  }, [alunos]);

  return (
    <section className="top-projetos-secao" aria-label="Top 3 Projetos da Turma">
      <header className="top-projetos-cabecalho">
        <div className="top-projetos-titulo-wrap">
          <span className="top-projetos-tag">
            <IconeFogo tamanho={13} /> DESTAQUES DA ESCOLA
          </span>
          <h2 className="top-projetos-titulo">Top 3 Projetos da Turma</h2>
          <p className="top-projetos-subtitulo">
            Projetos cadastrados pelos estudantes do SESI, na ordem de destaque da turma.
          </p>
        </div>
      </header>

      {top3.length === 0 ? (
        <p className="top-projetos-vazio">
          Nenhum projeto cadastrado pela turma ainda. Cada estudante cadastra os seus na aba
          <strong> Projetos &amp; Criações</strong> do próprio perfil — e eles aparecem aqui.
        </p>
      ) : (
        <div className="top-projetos-grid">
          {top3.map((proj) => (
            <article
              key={proj.id}
              className={`card-top-projeto rank-${proj.rank}`}
              onClick={() => onAbrirPerfil(proj.autor.objetoAluno)}
            >
              {/* Banner com Imagem e Medalha de Destaque */}
              <div className="top-proj-capa-wrap">
                {proj.imagem ? (
                  <img
                    src={proj.imagem}
                    // O título do projeto está logo abaixo, no cartão: descrever
                    // a capa de novo duplicaria o nome para quem usa leitor de tela.
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="top-proj-img"
                  />
                ) : (
                  <div
                    className="top-proj-capa-vazia"
                    style={{ background: `color-mix(in srgb, ${proj.autor.cor} 18%, var(--surface))` }}
                    aria-hidden="true"
                  >
                    <IconeProjetos tamanho={30} />
                  </div>
                )}
                <div className="top-proj-gradiente-overlay" />
                <span className={`badge-rank badge-rank-${proj.rank}`}>
                  {proj.rank === 1 ? "#1 Top Projeto" : proj.rank === 2 ? "#2 Destaque" : "#3 Destaque"}
                </span>
              </div>

              {/* Conteúdo do Projeto */}
              <div className="top-proj-corpo">
                {proj.tags.length > 0 ? (
                  <div className="top-proj-tags">
                    {proj.tags.map((t) => (
                      <span key={t} className="top-tag-pill">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                <h3 className="top-proj-titulo">{proj.titulo}</h3>
                {proj.descricao ? <p className="top-proj-desc">{proj.descricao}</p> : null}

                {/* Informações do Autor com Redes Sociais Bem Visíveis */}
                <div className="top-proj-autor-bloco">
                  <div
                    className="top-autor-info"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAbrirPerfil(proj.autor.objetoAluno);
                    }}
                    role="button"
                    tabIndex={0}
                    title="Ver perfil completo do autor"
                  >
                    <Avatar
                      nome={proj.autor.nome}
                      foto={proj.autor.foto}
                      className="mini-avatar"
                      style={{
                        background: `color-mix(in srgb, ${proj.autor.cor} 25%, var(--surface-2))`,
                        border: `1.5px solid ${proj.autor.cor}`,
                      }}
                    />
                    <div className="top-autor-textos">
                      <span className="top-autor-nome">{proj.autor.nome}</span>
                      <span className="top-autor-sala" style={{ color: proj.autor.cor }}>
                        <span className="ponto" style={{ background: proj.autor.cor }} />
                        {proj.autor.sala}
                      </span>
                    </div>
                  </div>

                  {/* Redes Sociais do Autor (LinkedIn e GitHub em Alto Contraste) */}
                  <div className="top-proj-redes" onClick={(e) => e.stopPropagation()}>
                    <BadgeLinkedIn url={proj.autor.linkedin} nomeAluno={proj.autor.nome} />
                    <BadgeGitHub username={proj.autor.github} nomeAluno={proj.autor.nome} />
                  </div>
                </div>

                {/* Ações do Card */}
                <footer className="top-proj-rodape" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="mini btn-cracha-top"
                    onClick={() => onAbrirCracha(proj.autor.objetoAluno)}
                  >
                    <IconeCracha tamanho={13} />
                    <span>Crachá 3D</span>
                  </button>
                  {proj.link ? (
                    <a
                      href={proj.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="botao botao-primario botao-mini-proj"
                    >
                      Ver Projeto ↗
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="botao botao-primario botao-mini-proj"
                      onClick={() => onAbrirPerfil(proj.autor.objetoAluno)}
                    >
                      Ver Criação →
                    </button>
                  )}
                </footer>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
