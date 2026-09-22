"use client";

import { useState } from "react";
import { CrachaModal } from "@/components/CrachaModal";
import { corHabilidade } from "@/lib/habilidades";
import { handleLinkedin, iniciais, urlGithub } from "@/lib/links";
import type { AlunoNaTela } from "@/lib/tipos";

type Props = {
  aluno: AlunoNaTela;
  onFechar: () => void;
};

export function ModalPerfilBreve({ aluno, onFechar }: Props) {
  const [crachaAberto, setCrachaAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const github = urlGithub(aluno.github);
  const linkedinHandle = handleLinkedin(aluno.linkedin);

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

  return (
    <>
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
              aria-label="Fechar"
            >
              ✕
            </button>

            <div className="breve-avatar-wrap">
              <span className="avatar breve-avatar">
                {iniciais(aluno.nome)}
              </span>
              <button
                type="button"
                className="btn-abrir-cracha-pill"
                onClick={() => setCrachaAberto(true)}
              >
                📇 Ver Crachá 3D
              </button>
            </div>

            <div className="breve-identificacao">
              <div className="breve-nome-linha">
                <h2>{aluno.nome}</h2>
                {aluno.fixado ? <span className="selo selo-fixado">Fixado</span> : null}
                {aluno.destaque ? <span className="selo selo-adm">★ ADM</span> : null}
              </div>

              <div className="breve-meta-linha">
                {aluno.sala ? (
                  <span className="cracha-sala-pill" style={{ borderColor: aluno.cor }}>
                    <span className="ponto" style={{ background: aluno.cor }} />
                    {aluno.sala}
                  </span>
                ) : null}
                <span className="breve-estrelas">★ {aluno.estrelas} estrelas</span>
              </div>
            </div>
          </header>

          <div className="breve-corpo">
            {aluno.bio ? <p className="breve-bio">{aluno.bio}</p> : null}

            {/* Links Sociais (LinkedIn, GitHub, Instagram) */}
            <div className="breve-redes">
              {aluno.linkedin ? (
                <a
                  href={aluno.linkedin}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="pes pes-in"
                >
                  in · {linkedinHandle ?? "LinkedIn"}
                </a>
              ) : null}

              {github ? (
                <a
                  href={github}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="pes pes-gh"
                >
                  gh · @{aluno.github}
                </a>
              ) : null}

              {aluno.instagram ? (
                <a
                  href={`https://instagram.com/${aluno.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="pes pes-ig"
                >
                  📸 {aluno.instagram}
                </a>
              ) : null}

              <button
                type="button"
                className="pes"
                onClick={copiarLink}
                title="Copiar link do portfólio"
              >
                {copiado ? "✓ Copiado!" : "🔗 Copiar Link"}
              </button>
            </div>

            {/* Habilidades */}
            {aluno.habilidades && aluno.habilidades.length > 0 ? (
              <div className="breve-secao">
                <span className="breve-secao-titulo">Competências Técnicas</span>
                <div className="tags-container">
                  {aluno.habilidades.map((hab) => (
                    <span
                      key={hab}
                      className="tag-habilidade"
                      style={{ ["--cor-tag" as string]: corHabilidade(hab) }}
                    >
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
                        <img src={p.imagem} alt={p.titulo} className="foto-projeto" />
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
                      <img src={m.url} alt={m.legenda || "Criação do estudante"} />
                      <span className="badge-tipo-midia">{m.tipo.toUpperCase()}</span>
                      {m.legenda ? <span className="legenda-midia">{m.legenda}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <footer className="breve-rodape">
            <button
              type="button"
              className="botao botao-primario"
              onClick={() => setCrachaAberto(true)}
            >
              📇 Abrir Crachá Holográfico 3D
            </button>
            <button type="button" className="botao botao-fraco" onClick={onFechar}>
              Fechar
            </button>
          </footer>
        </div>
      </div>

      {crachaAberto ? (
        <CrachaModal aluno={aluno} onClose={() => setCrachaAberto(false)} />
      ) : null}
    </>
  );
}
