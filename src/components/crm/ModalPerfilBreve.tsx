"use client";

import { useState } from "react";
import Link from "next/link";
import { apoiarHabilidadeAction } from "@/app/acoes-crm";
import { CurriculoImpressao } from "@/components/CurriculoImpressao";
import { BadgeGitHub, BadgeInstagram, BadgeLinkedIn } from "@/components/RedesBadges";
import {
  IconeCheck,
  IconeCopiar,
  IconeCracha,
  IconeDownload,
  IconeEscudo,
  IconeEstrela,
  IconeLinkExterno,
  IconePlus,
  IconeProjetos,
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
  const [curriculoAberto, setCurriculoAberto] = useState(false);
  const [votos, setVotos] = useState<Record<string, number>>(aluno.habilidades_votos || {});
  const [apoiandoHab, setApoiandoHab] = useState<string | null>(null);

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

  async function handleApoiarCompetencia(hab: string) {
    if (apoiandoHab) return;
    setApoiandoHab(hab);

    // Otimista
    setVotos((prev) => ({ ...prev, [hab]: (prev[hab] || 0) + 1 }));

    try {
      const res = await apoiarHabilidadeAction(aluno.id, hab);
      if (res.ok && res.votos) {
        setVotos(res.votos);
      }
    } catch {} finally {
      setTimeout(() => setApoiandoHab(null), 400);
    }
  }

  const stickers = Array.isArray(aluno.stickers) ? aluno.stickers : [];
  const stickersBanner = stickers.filter((s) => s.alvo !== "projeto");
  const stickersDoProjeto = (projId: string) =>
    stickers.filter((s) => s.alvo === "projeto" && s.projetoId === projId);

  return (
    <>
      <div className="modal-backdrop" onClick={onFechar} role="dialog" aria-modal="true">
        <div className="modal-perfil-breve" onClick={(e) => e.stopPropagation()}>
          <header
            className="breve-topo"
            style={{ ["--sala-cor" as string]: aluno.cor, position: "relative", overflow: "hidden" }}
          >
            {/* Stickers / GIFs Estilo Canva sobre o Header */}
            {stickersBanner.map((st) => (
              <div
                key={st.id}
                className="sticker-flutuante-breve"
                style={{
                  position: "absolute",
                  left: `${st.x}%`,
                  top: `${st.y}%`,
                  width: `${st.tamanho || 54}px`,
                  transform: `translate(-50%, -50%) rotate(${st.rotacao || 0}deg)`,
                  pointerEvents: "none",
                  zIndex: 3,
                }}
                title={st.rotulo || "Elemento visual"}
              >
                <img
                  src={st.url}
                  alt={st.rotulo || "Sticker"}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            ))}

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
              <span className="avatar breve-avatar">{iniciais(aluno.nome)}</span>
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
                <Link
                  href={`/validar/${aluno.slug}`}
                  target="_blank"
                  className="breve-link-validado"
                  title="Verificar autenticidade oficial da matrícula"
                >
                  <IconeEscudo tamanho={11} />
                  <span>SESI Joinville · Validado</span>
                </Link>
              </div>
            </div>
          </header>

          <div className="breve-corpo">
            {aluno.bio ? <p className="breve-bio">{aluno.bio}</p> : null}

            {/* Links Rápidos e Sociais */}
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

              <Link
                href={`/u/${aluno.slug}`}
                target="_blank"
                className="btn-copiar-breve"
                title="Abrir versão Cartão NFC / Linktree"
              >
                <span>Cartão NFC</span>
              </Link>
            </div>

            {/* Validação de Competências entre Colegas (Endorsements / Apoios +1 estilo LinkedIn) */}
            {aluno.habilidades && aluno.habilidades.length > 0 ? (
              <div className="breve-secao">
                <div className="breve-secao-header-linha">
                  <span className="breve-secao-titulo">Competências Técnicas & Apoios</span>
                  <span className="breve-secao-dica">Clique em +1 para apoiar uma competência</span>
                </div>
                <div className="tags-container">
                  {aluno.habilidades.map((hab) => {
                    const count = votos[hab] || 0;
                    const apoiandoEste = apoiandoHab === hab;

                    return (
                      <div key={hab} className="endorsement-pill">
                        <span className="endorsement-nome">{hab}</span>
                        <button
                          type="button"
                          className={`btn-endorsement-add ${apoiandoEste ? "anim-pulse" : ""}`}
                          onClick={() => handleApoiarCompetencia(hab)}
                          title={`Apoiar ${hab} de ${aluno.nome}`}
                        >
                          <IconePlus tamanho={11} />
                          <span>1</span>
                        </button>
                        {count > 0 ? (
                          <span className="endorsement-count" title={`${count} colegas apoiaram esta competência`}>
                            {count}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Criações & Projetos da Escola com Suporte a Stickers Estilo Canva */}
            {aluno.projetos && aluno.projetos.length > 0 ? (
              <div className="breve-secao">
                <span className="breve-secao-titulo">Projetos & Criações da Escola</span>
                <div className="grade-projetos-aluno">
                  {aluno.projetos.map((p) => {
                    const stickersProj = stickersDoProjeto(p.id);

                    return (
                      <div
                        key={p.id}
                        className="card-projeto-vitrine"
                        style={{ position: "relative", overflow: "hidden" }}
                      >
                        {/* Stickers / GIFs fixados sobre este projeto */}
                        {stickersProj.map((st) => (
                          <div
                            key={st.id}
                            className="sticker-flutuante-proj"
                            style={{
                              position: "absolute",
                              left: `${st.x}%`,
                              top: `${st.y}%`,
                              width: `${st.tamanho || 50}px`,
                              transform: `translate(-50%, -50%) rotate(${st.rotacao || 0}deg)`,
                              pointerEvents: "none",
                              zIndex: 4,
                            }}
                            title={st.rotulo || "Elemento visual"}
                          >
                            <img
                              src={st.url}
                              alt={st.rotulo || "Sticker"}
                              style={{ width: "100%", height: "auto", display: "block" }}
                            />
                          </div>
                        ))}

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
                    );
                  })}
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
              <button type="button" className="botao botao-primario" onClick={handleAbrirCracha}>
                <IconeCracha tamanho={16} />
                <span>Abrir Crachá Digital</span>
              </button>
            ) : null}

            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => setCurriculoAberto(true)}
              title="Gerar mini-currículo A4 pronto para imprimir"
            >
              <IconeDownload tamanho={15} />
              <span>Mini-Currículo (A4)</span>
            </button>

            <Link
              href={`/validar/${aluno.slug}`}
              target="_blank"
              className="botao botao-fraco"
              title="Verificar autenticidade oficial da matrícula"
            >
              <IconeEscudo tamanho={14} />
              <span>Validar SESI</span>
            </Link>

            <button type="button" className="botao botao-fraco" onClick={onFechar}>
              Fechar
            </button>
          </footer>
        </div>
      </div>

      {/* Mini-Currículo A4 Modal */}
      {curriculoAberto ? (
        <CurriculoImpressao aluno={aluno} onFechar={() => setCurriculoAberto(false)} />
      ) : null}
    </>
  );
}
