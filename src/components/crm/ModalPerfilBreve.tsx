"use client";

import { useState } from "react";
import { BadgeGitHub, BadgeInstagram, BadgeLinkedIn } from "@/components/RedesBadges";
import {
  IconeCheck,
  IconeCopiar,
  IconeCracha,
  IconeEscudo,
  IconeEstrela,
} from "@/components/Icones";
import { handleLinkedin, iniciais, urlGithub } from "@/lib/links";
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  aluno: AlunoNaTela;
  onFechar: () => void;
  onAbrirCracha?: (aluno: AlunoNaTela) => void;
};

export function ModalPerfilBreve({ aluno, onFechar, onAbrirCracha }: Props) {
  const [copiado, setCopiado] = useState(false);

  const urlPerfil =
    typeof window !== "undefined"
      ? `${window.location.origin}/alunos/${aluno.slug}`
      : `https://alunos-sesi.vercel.app/alunos/${aluno.slug}`;

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlPerfil);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {}
  }

  function handleAbrirCracha() {
    if (onAbrirCracha) {
      onAbrirCracha(aluno);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onFechar} role="dialog" aria-modal="true">
      <div className="modal-perfil-breve" onClick={(e) => e.stopPropagation()}>
        <header
          className="breve-topo"
          style={{ ["--sala-cor" as string]: aluno.cor }}
        >
          <button
            type="button"
            className="drawer-fechar"
            onClick={onFechar}
            aria-label="Fechar modal"
            title="Fechar"
          >
            ✕
          </button>

          <div className="breve-avatar-wrap">
            <span className="avatar breve-avatar">
              {iniciais(aluno.nome)}
            </span>
            {onAbrirCracha ? (
              <button
                type="button"
                className="btn-abrir-cracha-pill"
                onClick={handleAbrirCracha}
                title="Abrir crachá digital institucional"
              >
                <IconeCracha tamanho={14} />
                <span>Ver Crachá</span>
              </button>
            ) : null}
          </div>

          <div className="breve-identificacao">
            <div className="breve-nome-linha">
              <h2>{aluno.nome}</h2>
              {aluno.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
              {aluno.destaque ? (
                <span className="selo selo-adm">
                  <IconeEscudo tamanho={11} /> ADM
                </span>
              ) : null}
            </div>

            <div className="breve-meta-linha">
              {aluno.sala ? (
                <span className="badge-sala-tabela" style={{ ["--sala-cor" as string]: aluno.cor }}>
                  <span className="ponto" style={{ background: aluno.cor }} />
                  {aluno.sala}
                </span>
              ) : null}
              <span className="breve-estrelas">
                <IconeEstrela preenchida tamanho={12} /> {aluno.estrelas} estrelas
              </span>
            </div>
          </div>
        </header>

        <div className="breve-corpo">
          {aluno.bio ? <p className="breve-bio">{aluno.bio}</p> : null}

          {/* Links Sociais (LinkedIn, GitHub, Instagram) */}
          <div className="breve-redes">
            <BadgeLinkedIn url={aluno.linkedin} nomeAluno={aluno.nome} />
            <BadgeGitHub username={aluno.github} nomeAluno={aluno.nome} />
            <BadgeInstagram username={aluno.instagram} nomeAluno={aluno.nome} />

            <button
              type="button"
              className="btn-copiar-breve"
              onClick={copiarLink}
              title="Copiar link do portfólio"
            >
              {copiado ? (
                <>
                  <IconeCheck tamanho={13} />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <IconeCopiar tamanho={13} />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
          </div>

          {/* Habilidades - Layout Clean sem poluição visual */}
          {aluno.habilidades && aluno.habilidades.length > 0 ? (
            <div className="breve-secao">
              <span className="breve-secao-titulo">Competências Técnicas</span>
              <div className="tags-container">
                {aluno.habilidades.map((hab) => (
                  <span key={hab} className="tag-habilidade-clean">
                    {hab}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Criações & Projetos da Escola */}
          {aluno.projetos && aluno.projetos.length > 0 ? (
            <div className="breve-secao">
              <span className="breve-secao-titulo">Projetos & Criações da Escola</span>
              <div className="grade-projetos-aluno">
                {aluno.projetos.map((p) => (
                  <div key={p.id} className="card-projeto-vitrine">
                    {p.imagem ? (
                      <img src={p.imagem} alt={p.titulo} className="foto-projeto" loading="lazy" />
                    ) : null}
                    <div className="conteudo-projeto">
                      <h4>{p.titulo}</h4>
                      <p>{p.descricao}</p>
                      {p.link ? (
                        <a href={p.link} target="_blank" rel="noreferrer" className="link-ext">
                          Acessar Criação ↗
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Galeria de Mídias (Imagens e GIFs) */}
          {aluno.midias && aluno.midias.length > 0 ? (
            <div className="breve-secao">
              <span className="breve-secao-titulo">Galeria de Criações (Imagens & GIFs)</span>
              <div className="grade-midias-aluno">
                {aluno.midias.map((m, idx) => (
                  <div key={idx} className="card-midia-aluno">
                    <img src={m.url} alt={m.legenda || "Criação do estudante"} loading="lazy" />
                    <span className="badge-tipo-midia">{m.tipo.toUpperCase()}</span>
                    {m.legenda ? <span className="legenda-midia">{m.legenda}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="breve-rodape">
          {onAbrirCracha ? (
            <button
              type="button"
              className="botao botao-primario"
              onClick={handleAbrirCracha}
            >
              <IconeCracha tamanho={16} />
              <span>Abrir Crachá Digital</span>
            </button>
          ) : null}
          <button type="button" className="botao botao-fraco" onClick={onFechar}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
