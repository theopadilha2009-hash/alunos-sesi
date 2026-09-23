"use client";

import { useMemo } from "react";
import { BadgeGitHub, BadgeLinkedIn } from "@/components/RedesBadges";
import { IconeFogo } from "@/components/Icones";
import { iniciais } from "@/lib/links";
import type { AlunoNaTela } from "@/lib/tipos";

export type ItemProjetoTop = {
  id: string;
  rank: 1 | 2 | 3;
  titulo: string;
  descricao: string;
  tags: string[];
  imagem: string;
  link?: string;
  autor: {
    id: string;
    nome: string;
    sala: string | null;
    cor: string;
    avatar: string;
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

export function TopProjetosTurma({ alunos, onAbrirPerfil, onAbrirCracha }: Props) {
  const top3: ItemProjetoTop[] = useMemo(() => {
    // 1. Procurar projetos explicitamente cadastrados nos alunos
    const encontrados: ItemProjetoTop[] = [];

    // Mapeamento dos alunos mais destacados
    const telor = alunos.find((a) => a.slug === "telor-de-espadilha") ?? alunos[0];
    const lucas = alunos.find((a) => a.slug.includes("lucas") || a.sala?.includes("Robótica")) ?? alunos[1] ?? telor;
    const beatriz = alunos.find((a) => a.slug.includes("beatriz") || a.sala?.includes("Desenvolvimento")) ?? alunos[2] ?? telor;

    // Projeto 1: Alunos SESI CRM & Portfólio (Telor)
    if (telor) {
      encontrados.push({
        id: "top-1",
        rank: 1,
        titulo: "Alunos SESI · Workspace CRM & Portfólio",
        descricao:
          "Plataforma completa de vitrine profissional, gestão tabular por salas, crachá holográfico 3D e acompanhamento de projetos com Next.js e Supabase.",
        tags: ["Next.js 16", "TypeScript", "Supabase", "Design System"],
        imagem: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&auto=format&fit=crop&q=80",
        link: "https://github.com/theopadilha",
        autor: {
          id: telor.id,
          nome: telor.nome,
          sala: telor.sala ?? "DSM3",
          cor: telor.cor,
          avatar: iniciais(telor.nome),
          linkedin: telor.linkedin,
          github: telor.github,
          objetoAluno: telor,
        },
      });
    }

    // Projeto 2: Robô Autônomo FLL com Visão Computacional (Lucas Albuquerque)
    if (lucas) {
      encontrados.push({
        id: "top-2",
        rank: 2,
        titulo: "Robô Autônomo FLL · Navegação & Visão",
        descricao:
          "Sistema de controle robótico para arena FIRST LEGO League com odometria precisa, algoritmos PID em tempo real e sensores ópticos ultrassônicos.",
        tags: ["Python", "Robótica FLL", "PID", "OpenCV"],
        imagem: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=900&auto=format&fit=crop&q=80",
        link: lucas.github ? `https://github.com/${lucas.github}` : undefined,
        autor: {
          id: lucas.id,
          nome: lucas.nome,
          sala: lucas.sala ?? "3ºB · ROBÓTICA FLL",
          cor: lucas.cor,
          avatar: iniciais(lucas.nome),
          linkedin: lucas.linkedin,
          github: lucas.github,
          objetoAluno: lucas,
        },
      });
    }

    // Projeto 3: Portal Web Frontend SESI (Beatriz Vasconcelos)
    if (beatriz) {
      encontrados.push({
        id: "top-3",
        rank: 3,
        titulo: "Portal Frontend Interativo & Design Tokens",
        descricao:
          "Interface responsiva de alta performance, acessibilidade WCAG, temas claro/escuro com transições suaves e integração com APIs educacionais.",
        tags: ["React", "UI/UX", "Acessibilidade", "Tailwind/CSS"],
        imagem: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=900&auto=format&fit=crop&q=80",
        link: beatriz.github ? `https://github.com/${beatriz.github}` : undefined,
        autor: {
          id: beatriz.id,
          nome: beatriz.nome,
          sala: beatriz.sala ?? "3ºA · DESENVOLVIMENTO",
          cor: beatriz.cor,
          avatar: iniciais(beatriz.nome),
          linkedin: beatriz.linkedin,
          github: beatriz.github,
          objetoAluno: beatriz,
        },
      });
    }

    return encontrados.slice(0, 3);
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
            As criações mais votadas e inovadoras desenvolvidas pelos estudantes do SESI.
          </p>
        </div>
      </header>

      <div className="top-projetos-grid">
        {top3.map((proj) => (
          <article
            key={proj.id}
            className={`card-top-projeto rank-${proj.rank}`}
            onClick={() => onAbrirPerfil(proj.autor.objetoAluno)}
          >
            {/* Banner com Imagem e Medalha de Destaque */}
            <div className="top-proj-capa-wrap">
              <img
                src={proj.imagem}
                alt={proj.titulo}
                loading="lazy"
                decoding="async"
                className="top-proj-img"
              />
              <div className="top-proj-gradiente-overlay" />
              <span className={`badge-rank badge-rank-${proj.rank}`}>
                {proj.rank === 1 ? "🥇 #1 Top Projeto" : proj.rank === 2 ? "🥈 #2 Destaque" : "🥉 #3 Destaque"}
              </span>
            </div>

            {/* Conteúdo do Projeto */}
            <div className="top-proj-corpo">
              <div className="top-proj-tags">
                {proj.tags.map((t) => (
                  <span key={t} className="top-tag-pill">
                    {t}
                  </span>
                ))}
              </div>

              <h3 className="top-proj-titulo">{proj.titulo}</h3>
              <p className="top-proj-desc">{proj.descricao}</p>

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
                  <span
                    className="avatar mini-avatar"
                    style={{
                      background: `color-mix(in srgb, ${proj.autor.cor} 25%, var(--surface-2))`,
                      border: `1.5px solid ${proj.autor.cor}`,
                    }}
                  >
                    {proj.autor.avatar}
                  </span>
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
                  📇 Crachá 3D
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
    </section>
  );
}
