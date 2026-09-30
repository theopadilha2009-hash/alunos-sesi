"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconeLixeira,
  IconePlus,
  IconeProjetos,
  IconeUpload,
  IconeUsuario,
} from "@/components/Icones";
import type { ProjetoAluno, StickerPerfil } from "@/lib/tipos";
import { Avatar } from "@/components/Avatar";
import { blobDoDataUrl, caminhoDaMidia, EnvioRecusado, enviarAoBlob, nomeDaImagem } from "@/lib/blob";
import { corDoAluno } from "@/lib/cores";
import { conferirTamanhoDaImagem, LIMITES_STICKERS } from "@/lib/limites";

type Props = {
  nomeAluno: string;
  fotoAluno?: string | null;
  salaAluno: string;
  capa?: string | null;
  corPerfil?: string | null;
  projetos: ProjetoAluno[];
  stickers: StickerPerfil[];
  /**
   * Dono do perfil. O upload do arquivo do PC vai direto para o Vercel Blob, e o
   * caminho é escopado pela pasta do aluno — a rota de token recusa qualquer
   * outro. Sem ele não há como enviar; a mensagem explica isso ao aluno.
   */
  alunoId: string | null;
  onChangeStickers: (novos: StickerPerfil[]) => void;
};

// Galeria de Stickers e GIFs temáticos pré-configurados (Pixel Art, Spider-Man, Tech)
//
// Sem tema de robótica: o "Robô FLL Lego SESI" apontava para
// `https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif`, que responde 404 — a
// galeria abria com um quadrado quebrado para todo aluno. O GIF saiu da lista em
// 30/09/2026 e só volta com um id conferido no `curl`, porque um preset morto é
// pior que preset nenhum: ele parece defeito do perfil, não de quem escolheu.
const PRESETS_STICKERS: { rotulo: string; url: string; tipo: "gif" | "sticker" }[] = [
  {
    rotulo: "Homem-Aranha Pixel Art",
    url: "https://media.giphy.com/media/10bKPDUM5H7m7u/giphy.gif",
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
  fotoAluno,
  salaAluno,
  capa,
  corPerfil,
  projetos,
  stickers,
  alunoId,
  onChangeStickers,
}: Props) {
  const [urlCustom, setUrlCustom] = useState("");
  const [rotuloCustom, setRotuloCustom] = useState("");
  const [avisoSticker, setAvisoSticker] = useState<string | null>(null);
  const [enviandoSticker, setEnviandoSticker] = useState(false);
  const [stickerSelecionadoId, setStickerSelecionadoId] = useState<string | null>(
    stickers.length > 0 ? stickers[0].id : null,
  );
  const [alvoAtivo, setAlvoAtivo] = useState<"banner" | "projeto">("banner");
  const [projetoAlvoId, setProjetoAlvoId] = useState<string>(
    projetos.length > 0 ? projetos[0].id : "",
  );

  // O `stickers` lido de dentro do upload é o da hora do clique, e o envio leva
  // segundos: um preset adicionado no meio do caminho seria apagado por uma
  // lista velha quando o arquivo chegasse. A ref sempre aponta para a de agora.
  const stickersRef = useRef(stickers);
  useEffect(() => {
    stickersRef.current = stickers;
  });

  const stickerSelecionado = stickers.find((s) => s.id === stickerSelecionadoId) || null;

  /**
   * O perfil tem teto de elementos, e o servidor corta o excedente no save com
   * aviso genérico — o contador da tela mostraria 13 e o aluno só saberia depois.
   * Recusar no clique diz na hora, e o limite é o mesmo dos dois lados.
   */
  function noTetoDeElementos(): boolean {
    if (stickers.length < LIMITES_STICKERS.max) return false;
    setAvisoSticker(
      `O perfil aceita no máximo ${LIMITES_STICKERS.max} elementos. Remova um para adicionar outro.`,
    );
    return true;
  }

  function adicionarPreset(preset: { rotulo: string; url: string; tipo: "gif" | "sticker" }) {
    if (noTetoDeElementos()) return;

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
    setAvisoSticker(null);
  }

  function adicionarPersonalizado() {
    const url = urlCustom.trim();
    if (!url) return;
    if (noTetoDeElementos()) return;

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
    setAvisoSticker(null);
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

  /**
   * Arquivo do PC vai direto para o Vercel Blob, e o que entra no estado é a URL.
   *
   * Antes o data URL ia inteiro para o array de stickers, que vira o hidden
   * input do formulário: um GIF de 3 MB virava ~4 MB de base64 e o
   * `bodySizeLimit` de 4 MB do app recusava o corpo ANTES da action rodar — o
   * save inteiro falhava (capa, mídias e projetos válidos junto), sem mensagem.
   * É o mesmo caminho que mídias e capa de projeto já usam.
   */
  async function handleUploadArquivoSticker(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const arquivo = input.files?.[0];
    // O input guarda o último arquivo escolhido: sem zerar, escolher o MESMO
    // arquivo de novo não dispara onChange e o botão parece quebrado.
    input.value = "";
    if (!arquivo || enviandoSticker) return;
    if (noTetoDeElementos()) return;
    if (!alunoId) {
      setAvisoSticker(
        "Sua conta não está ligada a um perfil de aluno. Fale com o professor ou com o ADM.",
      );
      return;
    }

    // Mesma razão da guarda da capa: o `FileReader` monta o data URL inteiro em
    // memória antes de qualquer recusa, então um arquivo de dezenas de MB é lido
    // só para ser descartado. O teto aqui é o do data URL, e nenhum arquivo maior
    // que ele caberia adiante (base64 é ~4/3 do arquivo) — a guarda não recusa
    // nada que passaria, só evita a leitura do que já ia falhar.
    if (arquivo.size > LIMITES_STICKERS.maxDataUrlBytes) {
      setAvisoSticker(
        `Essa imagem é grande demais para o sticker. O limite é ${LIMITES_STICKERS.maxDataUrlBytes / 1024} KB.`,
      );
      return;
    }

    const leitor = new FileReader();
    leitor.onerror = () => {
      setAvisoSticker("Não foi possível ler esse arquivo. Tente outra imagem.");
    };
    leitor.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // O teto é medido sobre o data URL, que é o que `sanitizarStickers` mede no
      // servidor. Recusar aqui é feedback: sem isso a rede sobe o arquivo inteiro
      // para ele ser descartado depois, e o aluno fica sem saber por quê.
      const aviso = conferirTamanhoDaImagem(dataUrl, "stickers");
      if (aviso) {
        setAvisoSticker(aviso);
        return;
      }
      setAvisoSticker(null);
      setEnviandoSticker(true);

      try {
        const imagem = blobDoDataUrl(dataUrl);
        const url = await enviarAoBlob(
          caminhoDaMidia(alunoId, nomeDaImagem(imagem.type)),
          imagem,
          { clientPayload: JSON.stringify({ campo: "sticker" }) },
        );
        const ehGif = arquivo.type.includes("gif") || arquivo.name.toLowerCase().endsWith(".gif");
        const novo: StickerPerfil = {
          id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url,
          tipo: ehGif ? "gif" : "sticker",
          rotulo: arquivo.name.replace(/\.[^/.]+$/, ""),
          x: 50,
          y: 50,
          tamanho: 75,
          rotacao: 0,
          alvo: alvoAtivo,
          projetoId: alvoAtivo === "projeto" ? (projetoAlvoId || (projetos[0]?.id ?? "")) : undefined,
        };
        // A checagem do clique tem segundos de idade: entre escolher o arquivo e
        // ele chegar, os presets e o "Adicionar" continuam habilitados, e a lista
        // pode ter batido no teto nesse meio-tempo. Vale a lista de agora, não a
        // do clique — é para isso que o `stickersRef` existe, e sem esta segunda
        // olhada o 13º elemento entrava aqui e só era cortado no servidor, com o
        // aviso genérico que o `noTetoDeElementos` veio evitar.
        if (stickersRef.current.length >= LIMITES_STICKERS.max) {
          setAvisoSticker(
            `O perfil aceita no máximo ${LIMITES_STICKERS.max} elementos. Remova um para adicionar outro.`,
          );
          return;
        }
        onChangeStickers([...stickersRef.current, novo]);
        setStickerSelecionadoId(novo.id);
      } catch (erro) {
        // A recusa da rota ("Entre como aluno...", "Endereço de envio fora da
        // sua pasta.", "Muitos envios...") é frase nossa e vem na frente: é a
        // única que diz ao aluno o que fazer a respeito. O resto — rede,
        // biblioteca — fica com a frase da casa.
        setAvisoSticker(
          erro instanceof EnvioRecusado
            ? erro.message
            : "Não foi possível enviar o arquivo. Tente de novo.",
        );
      } finally {
        setEnviandoSticker(false);
      }
    };
    leitor.readAsDataURL(arquivo);
  }

  // Permite clicar diretamente no banner para posicionar ou retornar o sticker ao banner
  function handleCliqueCanvasBanner(ev: React.MouseEvent<HTMLDivElement>) {
    if (!stickerSelecionado) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = Math.round(((ev.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((ev.clientY - rect.top) / rect.height) * 100);
    atualizarSticker(stickerSelecionado.id, {
      alvo: "banner",
      projetoId: undefined,
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    });
    setAlvoAtivo("banner");
  }

  // Permite clicar diretamente em um projeto para fixar o sticker nele
  function handleCliqueCanvasProjeto(projId: string, ev: React.MouseEvent<HTMLDivElement>) {
    if (!stickerSelecionado) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = Math.round(((ev.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((ev.clientY - rect.top) / rect.height) * 100);
    atualizarSticker(stickerSelecionado.id, {
      alvo: "projeto",
      projetoId: projId,
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    });
    setAlvoAtivo("projeto");
    setProjetoAlvoId(projId);
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
          {avisoSticker ? (
            <div className="alerta-banner alerta-erro">{avisoSticker}</div>
          ) : null}

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

              <div style={{ marginTop: "0.6rem" }}>
                <label
                  className="botao botao-secundario"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.45rem",
                    cursor: "pointer",
                    padding: "0.55rem 0.85rem",
                    borderRadius: "8px",
                  }}
                  title="Selecionar imagem ou GIF do seu dispositivo"
                >
                  <IconeUpload tamanho={15} />
                  <span>{enviandoSticker ? "Enviando o arquivo…" : "Carregar GIF ou Imagem do PC"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={enviandoSticker}
                    onChange={handleUploadArquivoSticker}
                  />
                </label>
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
                {/* Alternador de Alvo: Permite mover o sticker entre Banner e Projetos livremente */}
                <div className="slider-item">
                  <div className="slider-label-linha">
                    <span>Onde fixar este elemento:</span>
                  </div>
                  <div className="botoes-alvo-dupla" style={{ marginTop: "0.4rem" }}>
                    <button
                      type="button"
                      className={`btn-alvo-opcao ${stickerSelecionado.alvo !== "projeto" ? "btn-alvo-ativo" : ""}`}
                      onClick={() => {
                        atualizarSticker(stickerSelecionado.id, { alvo: "banner", projetoId: undefined });
                        setAlvoAtivo("banner");
                      }}
                    >
                      <IconeUsuario tamanho={13} />
                      <span>Banner</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-alvo-opcao ${stickerSelecionado.alvo === "projeto" ? "btn-alvo-ativo" : ""}`}
                      disabled={projetos.length === 0}
                      onClick={() => {
                        const pid = projetoAlvoId || (projetos[0]?.id ?? "");
                        atualizarSticker(stickerSelecionado.id, { alvo: "projeto", projetoId: pid });
                        setAlvoAtivo("projeto");
                        setProjetoAlvoId(pid);
                      }}
                    >
                      <IconeProjetos tamanho={13} />
                      <span>Projeto</span>
                    </button>
                  </div>
                  {stickerSelecionado.alvo === "projeto" && projetos.length > 0 ? (
                    <select
                      className="select-projeto-alvo"
                      style={{ marginTop: "0.5rem" }}
                      value={stickerSelecionado.projetoId || projetoAlvoId}
                      onChange={(e) => {
                        atualizarSticker(stickerSelecionado.id, { projetoId: e.target.value });
                        setProjetoAlvoId(e.target.value);
                      }}
                    >
                      {projetos.map((p) => (
                        <option key={p.id} value={p.id}>{p.titulo}</option>
                      ))}
                    </select>
                  ) : null}
                </div>

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span className="canvas-secao-titulo" style={{ margin: 0 }}>Visualização: Banner do Perfil</span>
              {stickerSelecionado ? (
                <span className="canvas-drop-hint" style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700 }}>
                  🎯 Clique no banner para fixar ou mover aqui
                </span>
              ) : null}
            </div>
            <div
              className={`canvas-banner-preview ${alvoAtivo === "banner" ? "canvas-ativo" : ""} ${stickerSelecionado ? "canvas-zona-destaque" : ""}`}
              onClick={handleCliqueCanvasBanner}
              style={{
                ...(capa
                  ? {
                      backgroundImage: `linear-gradient(180deg, rgba(6, 14, 24, 0.35) 0%, rgba(6, 14, 24, 0.82) 100%), url("${capa}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {
                      backgroundImage: `linear-gradient(135deg, ${corDoAluno(corPerfil, salaAluno)} 0%, #0d1926 70%)`,
                    }),
              }}
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
                <Avatar nome={nomeAluno} foto={fotoAluno} className="avatar-canvas" />
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span className="canvas-secao-titulo" style={{ margin: 0 }}>Visualização: Projetos com Elementos Fixados</span>
                {stickerSelecionado ? (
                  <span className="canvas-drop-hint" style={{ fontSize: "0.75rem", color: "#60a5fa", fontWeight: 700 }}>
                    🎯 Clique em qualquer projeto para fixar o elemento sobre ele
                  </span>
                ) : null}
              </div>
              <div className="canvas-projetos-grid">
                {projetos.map((proj) => {
                  const projsStickers = stickersDoProjeto(proj.id);
                  const isCurrentTarget = alvoAtivo === "projeto" && projetoAlvoId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      className={`canvas-projeto-card ${isCurrentTarget ? "canvas-projeto-ativo" : ""} ${stickerSelecionado ? "canvas-zona-destaque" : ""}`}
                      onClick={(e) => handleCliqueCanvasProjeto(proj.id, e)}
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
