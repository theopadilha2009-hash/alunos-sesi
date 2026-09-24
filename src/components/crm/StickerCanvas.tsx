"use client";

import { useState } from "react";
import {
  IconeCheck,
  IconeGaleria,
  IconeLixeira,
  IconePlus,
  IconeProjetos,
  IconeUpload,
  IconeUsuario,
} from "@/components/Icones";
import type { ProjetoAluno, StickerPerfil } from "@/lib/tipos";
import { iniciais } from "@/lib/links";

type Props = {
  nomeAluno: string;
  salaAluno: string;
  projetos: ProjetoAluno[];
  stickers: StickerPerfil[];
  onChangeStickers: (novos: StickerPerfil[]) => void;
};

// Galeria de Stickers e GIFs temáticos pré-configurados (Pixel Art, Robótica FLL, Spider-Man, Tech)
const PRESETS_STICKERS: { rotulo: string; url: string; tipo: "gif" | "sticker" }[] = [
  {
    rotulo: "Homem-Aranha Pixel Art",
    url: "https://media.giphy.com/media/10bKPDUM5H7m7u/giphy.gif",
    tipo: "gif",
  },
  {
    rotulo: "Robô FLL Lego SESI",
    url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif",
    tipo: "gif",
  },
  {
    rotulo: "Retro Arcade / Code",
    url: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif",
    tipo: "gif",
  },
  {
    rotulo: "Foguete / Launch Pixel",
    url: "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif",
    tipo: "gif",
  },
  {
    rotulo: "Holograma Cyberpunk",
    url: "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif",
    tipo: "gif",
  },
  {
    rotulo: "Pixel Heart 8-bit",
    url: "https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif",
    tipo: "gif",
  },
];

export function StickerCanvas({
  nomeAluno,
  salaAluno,
  projetos,
  stickers,
  onChangeStickers,
}: Props) {
  const [urlCustom, setUrlCustom] = useState("");
  const [rotuloCustom, setRotuloCustom] = useState("");
  const [stickerSelecionadoId, setStickerSelecionadoId] = useState<string | null>(
    stickers.length > 0 ? stickers[0].id : null,
  );
  const [alvoAtivo, setAlvoAtivo] = useState<"banner" | "projeto">("banner");
  const [projetoAlvoId, setProjetoAlvoId] = useState<string>(
    projetos.length > 0 ? projetos[0].id : "",
  );

  const stickerSelecionado = stickers.find((s) => s.id === stickerSelecionadoId) || null;

  function adicionarPreset(preset: { rotulo: string; url: string; tipo: "gif" | "sticker" }) {
    const novo: StickerPerfil = {
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url: preset.url,
      tipo: preset.tipo,
      rotulo: preset.rotulo,
      x: 50,
      y: 50,
      tamanho: 70,
      rotacao: 0,
      alvo: alvoAtivo,
      projetoId: alvoAtivo === "projeto" ? (projetoAlvoId || (projetos[0]?.id ?? "")) : undefined,
    };

    const atualizados = [...stickers, novo];
    onChangeStickers(atualizados);
    setStickerSelecionadoId(novo.id);
  }

  function adicionarPersonalizado() {
    const url = urlCustom.trim();
    if (!url) return;

    const tipo = url.toLowerCase().includes(".gif") ? "gif" : "sticker";
    const novo: StickerPerfil = {
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url,
      tipo,
      rotulo: rotuloCustom.trim() || (tipo === "gif" ? "GIF Personalizado" : "Sticker"),
      x: 50,
      y: 50,
      tamanho: 70,
      rotacao: 0,
      alvo: alvoAtivo,
      projetoId: alvoAtivo === "projeto" ? (projetoAlvoId || (projetos[0]?.id ?? "")) : undefined,
    };

    onChangeStickers([...stickers, novo]);
    setStickerSelecionadoId(novo.id);
    setUrlCustom("");
    setRotuloCustom("");
  }

  function removerSticker(id: string) {
    const restantes = stickers.filter((s) => s.id !== id);
    onChangeStickers(restantes);
    if (stickerSelecionadoId === id) {
      setStickerSelecionadoId(restantes.length > 0 ? restantes[0].id : null);
    }
  }

  function atualizarSticker(id: string, updates: Partial<StickerPerfil>) {
    const atualizados = stickers.map((s) => (s.id === id ? { ...s, ...updates } : s));
    onChangeStickers(atualizados);
  }

  // Permite clicar diretamente no canvas para mover o sticker selecionado
  function handleCliqueCanvas(ev: React.MouseEvent<HTMLDivElement>) {
    if (!stickerSelecionado) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = Math.round(((ev.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((ev.clientY - rect.top) / rect.height) * 100);
    atualizarSticker(stickerSelecionado.id, {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    });
  }

  const stickersDoBanner = stickers.filter((s) => s.alvo !== "projeto");
  const stickersDoProjeto = (projId: string) =>
    stickers.filter((s) => s.alvo === "projeto" && s.projetoId === projId);

  return (
    <div className="sticker-estudio-container">
      {/* Topo do Estúdio Canva */}
      <header className="estudio-topo">
        <div className="estudio-titulos">
          <span className="estudio-badge">ESTÚDIO CRIATIVO ESTILO CANVA</span>
          <h2>Personalize seu Perfil & Projetos com Stickers e GIFs</h2>
          <p>
            Dê vida e personalidade ao seu espaço escolar: adicione GIFs em pixel art, robôs do SESI,
            insígnias ou cole o GIF do seu personagem favorito (ex: Homem-Aranha) diretamente por cima das suas criações!
          </p>
        </div>
      </header>

      <div className="estudio-grid">
        {/* Painel Esquerdo: Biblioteca de Stickers & Controles */}
        <div className="estudio-painel-controles">
          {/* 1. Onde você quer colocar o Sticker? */}
          <div className="controle-secao">
            <span className="controle-rotulo">1. Onde fixar o sticker/GIF?</span>
            <div className="botoes-alvo-dupla">
              <button
                type="button"
                className={`btn-alvo-opcao ${alvoAtivo === "banner" ? "btn-alvo-ativo" : ""}`}
                onClick={() => setAlvoAtivo("banner")}
              >
                <IconeUsuario tamanho={15} />
                <span>Banner do Perfil</span>
              </button>
              <button
                type="button"
                className={`btn-alvo-opcao ${alvoAtivo === "projeto" ? "btn-alvo-ativo" : ""}`}
                onClick={() => setAlvoAtivo("projeto")}
                disabled={projetos.length === 0}
              >
                <IconeProjetos tamanho={15} />
                <span>Sobre um Projeto</span>
              </button>
            </div>

            {alvoAtivo === "projeto" && projetos.length > 0 ? (
              <div className="campo-selecao-projeto">
                <label className="sub-rotulo">Selecione o projeto alvo:</label>
                <select
                  className="select-projeto-alvo"
                  value={projetoAlvoId}
                  onChange={(e) => setProjetoAlvoId(e.target.value)}
                >
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {/* 2. Galeria de Presets */}
          <div className="controle-secao">
            <span className="controle-rotulo">2. Galeria de Elementos (Clique para adicionar)</span>
            <div className="presets-grade">
              {PRESETS_STICKERS.map((pr, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn-preset-card"
                  onClick={() => adicionarPreset(pr)}
                  title={`Adicionar ${pr.rotulo}`}
                >
                  <img src={pr.url} alt={pr.rotulo} className="preset-thumb" />
                  <span className="preset-nome">{pr.rotulo}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Colar Link de Qualquer GIF da Internet */}
          <div className="controle-secao">
            <span className="controle-rotulo">3. Ou adicione seu próprio GIF / Imagem via URL</span>
            <div className="form-custom-sticker">
              <input
                type="url"
                className="input-texto-custom"
                value={urlCustom}
                onChange={(e) => setUrlCustom(e.target.value)}
                placeholder="https://exemplo.com/homem-aranha-pixel.gif"
              />
              <div className="linha-add-custom">
                <input
                  type="text"
                  className="input-texto-rotulo"
                  value={rotuloCustom}
                  onChange={(e) => setRotuloCustom(e.target.value)}
                  placeholder="Nome do elemento (ex: Aranha Pixel)"
                />
                <button
                  type="button"
                  className="botao botao-primario btn-add-custom"
                  onClick={adicionarPersonalizado}
                  disabled={!urlCustom.trim()}
                >
                  <IconePlus tamanho={14} />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Propriedades do Elemento Selecionado */}
          {stickerSelecionado ? (
            <div className="controle-secao painel-propriedades">
              <div className="propriedades-topo">
                <span className="controle-rotulo">Ajustar: {stickerSelecionado.rotulo}</span>
                <button
                  type="button"
                  className="btn-remover-sticker"
                  onClick={() => removerSticker(stickerSelecionado.id)}
                  title="Remover elemento"
                >
                  <IconeLixeira tamanho={14} />
                  <span>Remover</span>
                </button>
              </div>

              <div className="propriedades-sliders">
                <div className="slider-item">
                  <div className="slider-label-linha">
                    <span>Tamanho:</span>
                    <strong>{stickerSelecionado.tamanho || 70}px</strong>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="140"
                    value={stickerSelecionado.tamanho || 70}
                    onChange={(e) =>
                      atualizarSticker(stickerSelecionado.id, { tamanho: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="slider-item">
                  <div className="slider-label-linha">
                    <span>Rotação:</span>
                    <strong>{stickerSelecionado.rotacao || 0}°</strong>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={stickerSelecionado.rotacao || 0}
                    onChange={(e) =>
                      atualizarSticker(stickerSelecionado.id, { rotacao: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="slider-item">
                  <div className="slider-label-linha">
                    <span>Posição Horizontal (X%):</span>
                    <strong>{stickerSelecionado.x}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stickerSelecionado.x}
                    onChange={(e) =>
                      atualizarSticker(stickerSelecionado.id, { x: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="slider-item">
                  <div className="slider-label-linha">
                    <span>Posição Vertical (Y%):</span>
                    <strong>{stickerSelecionado.y}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stickerSelecionado.y}
                    onChange={(e) =>
                      atualizarSticker(stickerSelecionado.id, { y: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="dica-selecao-sticker">
              Clique em um sticker acima ou na visualização ao lado para ajustar tamanho, rotação e posição.
            </p>
          )}
        </div>

        {/* Painel Direito: Canvas Visual Interativo (Estilo Canva) */}
        <div className="estudio-painel-canvas">
          <div className="canvas-header-info">
            <span className="canvas-tag">PRÉVIA INTERATIVA EM TEMPO REAL</span>
            <span className="canvas-dica">Clique em qualquer ponto da tela para posicionar o elemento</span>
          </div>

          {/* Canvas 1: Banner Principal do Perfil */}
          <div className="canvas-secao-wrap">
            <span className="canvas-secao-titulo">Visualização: Banner do Perfil</span>
            <div
              className={`canvas-banner-preview ${alvoAtivo === "banner" ? "canvas-ativo" : ""}`}
              onClick={handleCliqueCanvas}
            >
              {/* Elementos/Stickers do Banner */}
              {stickersDoBanner.map((st) => {
                const isSelected = st.id === stickerSelecionadoId;
                return (
                  <div
                    key={st.id}
                    className={`sticker-overlay-item ${isSelected ? "sticker-selecionado" : ""}`}
                    style={{
                      left: `${st.x}%`,
                      top: `${st.y}%`,
                      width: `${st.tamanho || 70}px`,
                      transform: `translate(-50%, -50%) rotate(${st.rotacao || 0}deg)`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStickerSelecionadoId(st.id);
                      setAlvoAtivo("banner");
                    }}
                    title={`${st.rotulo} (Clique para editar)`}
                  >
                    <img src={st.url} alt={st.rotulo || "Sticker"} className="sticker-img" />
                    {isSelected ? <div className="sticker-bounding-box" /> : null}
                  </div>
                );
              })}

              <div className="preview-hero-inner">
                <span className="avatar avatar-canvas">{iniciais(nomeAluno)}</span>
                <div className="preview-hero-textos">
                  <span className="preview-tag-cargo">ESTUDANTE SESI · {salaAluno}</span>
                  <h3 className="preview-hero-nome">{nomeAluno}</h3>
                  <span className="preview-hero-sub">SESI SENAI Joinville · Matrícula Validada</span>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas 2: Projetos com Stickers Fixados por cima */}
          {projetos.length > 0 ? (
            <div className="canvas-secao-wrap" style={{ marginTop: "1.5rem" }}>
              <span className="canvas-secao-titulo">Visualização: Projetos com Elementos Fixados</span>
              <div className="canvas-projetos-grid">
                {projetos.map((proj) => {
                  const projsStickers = stickersDoProjeto(proj.id);
                  const isCurrentTarget = alvoAtivo === "projeto" && projetoAlvoId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      className={`canvas-projeto-card ${isCurrentTarget ? "canvas-projeto-ativo" : ""}`}
                      onClick={(e) => {
                        if (stickerSelecionado) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                          const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                          atualizarSticker(stickerSelecionado.id, {
                            alvo: "projeto",
                            projetoId: proj.id,
                            x: Math.max(5, Math.min(95, x)),
                            y: Math.max(5, Math.min(95, y)),
                          });
                          setAlvoAtivo("projeto");
                          setProjetoAlvoId(proj.id);
                        }
                      }}
                    >
                      {/* Stickers posicionados neste projeto */}
                      {projsStickers.map((st) => {
                        const isSelected = st.id === stickerSelecionadoId;
                        return (
                          <div
                            key={st.id}
                            className={`sticker-overlay-item ${isSelected ? "sticker-selecionado" : ""}`}
                            style={{
                              left: `${st.x}%`,
                              top: `${st.y}%`,
                              width: `${st.tamanho || 60}px`,
                              transform: `translate(-50%, -50%) rotate(${st.rotacao || 0}deg)`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStickerSelecionadoId(st.id);
                              setAlvoAtivo("projeto");
                              setProjetoAlvoId(proj.id);
                            }}
                            title={`${st.rotulo} (Clique para editar)`}
                          >
                            <img src={st.url} alt={st.rotulo || "Sticker"} className="sticker-img" />
                            {isSelected ? <div className="sticker-bounding-box" /> : null}
                          </div>
                        );
                      })}

                      <div className="proj-card-content">
                        <div className="proj-card-icon-wrap">
                          <IconeProjetos tamanho={18} />
                        </div>
                        <h4 className="proj-card-titulo">{proj.titulo}</h4>
                        <p className="proj-card-desc">{proj.descricao || "Sem descrição informada."}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
