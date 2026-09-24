import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Roseta } from "@/components/Roseta";
import {
  IconeCracha,
  IconeDownload,
  IconeEscudo,
  IconeEstrela,
  IconeLinkExterno,
  IconeProjetos,
} from "@/components/Icones";
import { IconeGitHub, IconeInstagram, IconeLinkedIn } from "@/components/RedesBadges";
import { alunoPorSlug, listarSalas } from "@/lib/dados";
import { extrairHabilidades } from "@/lib/habilidades";
import { iniciais } from "@/lib/links";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const aluno = await alunoPorSlug(slug);

  if (!aluno) {
    return {
      title: "Cartão Estudantil NFC | SESI SC Joinville",
    };
  }

  return {
    title: `${aluno.nome} · Cartão Digital & Bio | SESI SC Joinville`,
    description: `${aluno.nome} · Portfólio, conexões e projetos no SESI SENAI Joinville.`,
  };
}

export default async function PaginaCartaoNfcBio({ params }: Props) {
  const { slug } = await params;
  const aluno = await alunoPorSlug(slug);

  if (!aluno) {
    notFound();
  }

  const salas = await listarSalas();
  const sala = salas.find((s) => s.id === aluno.sala_id)?.nome ?? "SESI Joinville";

  // Stickers posicionados no banner ou perfil
  const stickers = Array.isArray(aluno.stickers) ? aluno.stickers : [];
  const votos = aluno.habilidades_votos || {};
  const habilidades = extrairHabilidades(aluno.bio);

  return (
    <main className="nfc-bio-layout">
      {/* Background ambiente minimalista */}
      <div className="nfc-bio-bg-glow" aria-hidden="true" />

      <div className="nfc-bio-container">
        {/* Topo institucional sutil */}
        <header className="nfc-bio-header">
          <div className="nfc-bio-brand">
            <Roseta tamanho={22} />
            <span>SESI SC · JOINVILLE</span>
          </div>
          <Link href={`/validar/${aluno.slug}`} className="nfc-badge-verificado" title="Documento Estudantil Oficial">
            <IconeEscudo tamanho={13} />
            <span>Matrícula Validada</span>
          </Link>
        </header>

        {/* Hero Card do Estudante com Stickers / GIFs Flutuantes */}
        <section className="nfc-hero-card">
          {/* Stickers / GIFs decorativos posicionados estilo Canva */}
          {stickers.map((st) => (
            <div
              key={st.id}
              className="nfc-sticker-item"
              style={{
                left: `${st.x}%`,
                top: `${st.y}%`,
                width: `${st.tamanho || 54}px`,
                transform: `rotate(${st.rotacao || 0}deg)`,
              }}
              title={st.rotulo || "Sticker"}
            >
              <img src={st.url} alt={st.rotulo || "Elemento visual"} className="nfc-sticker-img" />
            </div>
          ))}

          <div className="nfc-avatar-wrapper">
            <span className="avatar nfc-avatar">{iniciais(aluno.nome)}</span>
            <div className="nfc-pulse-ring" />
          </div>

          <h1 className="nfc-nome">{aluno.nome}</h1>
          <p className="nfc-subtitulo">
            <span className="nfc-sala-tag">{sala}</span>
            <span className="nfc-dot">·</span>
            <span className="nfc-escola-tag">SESI SENAI SC</span>
          </p>

          {aluno.bio ? <p className="nfc-bio-texto">{aluno.bio}</p> : null}

          {/* Reconhecimentos rápidos */}
          <div className="nfc-reconhecimentos">
            <span className="nfc-stat-item">
              <IconeEstrela preenchida tamanho={13} />
              <strong>{aluno.estrelas}</strong> reconhecimentos
            </span>
            {aluno.fixado ? <span className="selo selo-fixado">Estudante Fixado</span> : null}
            {aluno.destaque ? <span className="selo selo-adm">Destaque ADM</span> : null}
          </div>
        </section>

        {/* Competências com contadores de apoio (+1) */}
        {habilidades.length > 0 ? (
          <section className="nfc-habilidades-bloco">
            <span className="nfc-bloco-titulo">Competências Chave</span>
            <div className="nfc-skills-lista">
              {habilidades.map((hab) => {
                const qtd = votos[hab] || 0;
                return (
                  <span key={hab} className="nfc-skill-pill">
                    <span>{hab}</span>
                    {qtd > 0 ? <span className="nfc-skill-count">+{qtd}</span> : null}
                  </span>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Links Principais (Estilo Linktree Minimalista & Otimizado para Toque) */}
        <section className="nfc-links-lista">
          {/* Link Oficial do Portfólio / Crachá */}
          <Link href={`/alunos/${aluno.slug}`} className="nfc-link-btn nfc-link-destaque">
            <span className="nfc-link-icone">
              <IconeCracha tamanho={18} />
            </span>
            <div className="nfc-link-corpo">
              <span className="nfc-link-label">Ver Crachá Digital & Portfólio</span>
              <span className="nfc-link-sub">Projetos, mídias e detalhes completos</span>
            </div>
            <IconeLinkExterno tamanho={15} />
          </Link>

          {/* Validação de Matrícula Oficial */}
          <Link href={`/validar/${aluno.slug}`} className="nfc-link-btn nfc-link-oficial">
            <span className="nfc-link-icone">
              <IconeEscudo tamanho={18} />
            </span>
            <div className="nfc-link-corpo">
              <span className="nfc-link-label">Selo Oficial de Matrícula Ativa</span>
              <span className="nfc-link-sub">Validação SESI SENAI Joinville</span>
            </div>
            <IconeLinkExterno tamanho={15} />
          </Link>

          {/* LinkedIn */}
          {aluno.linkedin ? (
            <a
              href={aluno.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="nfc-link-btn"
            >
              <span className="nfc-link-icone nfc-icone-linkedin">
                <IconeLinkedIn tamanho={18} />
              </span>
              <div className="nfc-link-corpo">
                <span className="nfc-link-label">Conectar no LinkedIn</span>
                <span className="nfc-link-sub">Perfil e rede profissional</span>
              </div>
              <IconeLinkExterno tamanho={15} />
            </a>
          ) : null}

          {/* GitHub */}
          {aluno.github ? (
            <a
              href={`https://github.com/${aluno.github.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nfc-link-btn"
            >
              <span className="nfc-link-icone nfc-icone-github">
                <IconeGitHub tamanho={18} />
              </span>
              <div className="nfc-link-corpo">
                <span className="nfc-link-label">Ver Códigos no GitHub</span>
                <span className="nfc-link-sub">Repositórios e contribuições</span>
              </div>
              <IconeLinkExterno tamanho={15} />
            </a>
          ) : null}

          {/* Instagram */}
          {aluno.instagram ? (
            <a
              href={`https://instagram.com/${aluno.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nfc-link-btn"
            >
              <span className="nfc-link-icone nfc-icone-instagram">
                <IconeInstagram tamanho={18} />
              </span>
              <div className="nfc-link-corpo">
                <span className="nfc-link-label">Seguir no Instagram</span>
                <span className="nfc-link-sub">@{aluno.instagram.replace(/^@/, "")}</span>
              </div>
              <IconeLinkExterno tamanho={15} />
            </a>
          ) : null}

          {/* Botão para Gerar Currículo A4 */}
          <Link href={`/alunos/${aluno.slug}?curriculo=1`} className="nfc-link-btn">
            <span className="nfc-link-icone">
              <IconeDownload tamanho={18} />
            </span>
            <div className="nfc-link-corpo">
              <span className="nfc-link-label">Mini-Currículo / One-Pager (A4)</span>
              <span className="nfc-link-sub">PDF pronto para estágios e processos seletivos</span>
            </div>
            <IconeLinkExterno tamanho={15} />
          </Link>
        </section>

        {/* Projetos em Destaque (se houver) */}
        {aluno.projetos && aluno.projetos.length > 0 ? (
          <section className="nfc-projetos-preview">
            <span className="nfc-bloco-titulo">Projetos em Destaque</span>
            <div className="nfc-projetos-grid">
              {aluno.projetos.slice(0, 3).map((p, idx) => (
                <div key={idx} className="nfc-projeto-card">
                  <div className="nfc-proj-header">
                    <IconeProjetos tamanho={14} />
                    <strong>{p.titulo}</strong>
                  </div>
                  {p.descricao ? <p className="nfc-proj-desc">{p.descricao}</p> : null}
                  {p.link ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nfc-proj-link"
                    >
                      <span>Acessar demonstração</span>
                      <IconeLinkExterno tamanho={12} />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Rodapé institucional com link para o sistema geral */}
        <footer className="nfc-bio-footer">
          <Link href="/" className="nfc-footer-logo">
            <Roseta tamanho={18} />
            <span>Alunos SESI SC · Joinville</span>
          </Link>
          <p className="nfc-footer-copy">
            Identidade Estudantil Digital por Aproximação NFC / QR Code · 2026
          </p>
        </footer>
      </div>
    </main>
  );
}
