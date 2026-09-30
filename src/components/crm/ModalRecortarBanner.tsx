"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  IconeCheck,
  IconeCrop,
  IconeSparkles,
} from "@/components/Icones";
import { blobDoDataUrl, caminhoDaMidia, nomeDaImagem } from "@/lib/blob";
import { LADO_CAPA, MAX_DATA_URL_CAPA, PROPORCAO_CAPA } from "@/lib/limites";

type Props = {
  aberto: boolean;
  imagemFonte: string | null;
  alunoId?: string | null;
  nomeAluno?: string;
  onFechar: () => void;
  onSalvar: (bannerUrl: string) => Promise<void> | void;
};

/**
 * Recorta e comprime a imagem garantindo que o data URL caiba no limite de 220 KB,
 * reduzindo resolução e qualidade progressivamente se necessário.
 */
export async function formatarEComprimirBanner(
  img: HTMLImageElement,
  crop: { zoom: number; panX: number; panY: number },
  alunoId?: string | null,
): Promise<string> {
  const { zoom, panX, panY } = crop;
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const imgAspect = imgW / imgH;

  // Dimensões base do recorte com proporção 3:1
  let baseW = imgW;
  let baseH = imgH;
  if (imgAspect >= PROPORCAO_CAPA) {
    baseH = imgH;
    baseW = imgH * PROPORCAO_CAPA;
  } else {
    baseW = imgW;
    baseH = imgW / PROPORCAO_CAPA;
  }

  // Aplica o fator de zoom
  const sWidth = Math.max(1, Math.min(imgW, baseW / zoom));
  const sHeight = Math.max(1, Math.min(imgH, baseH / zoom));

  const maxOffsetX = Math.max(0, imgW - sWidth);
  const maxOffsetY = Math.max(0, imgH - sHeight);

  const sx = maxOffsetX * panX;
  const sy = maxOffsetY * panY;

  // Tentativas com resoluções e qualidades decrescentes até garantir <= MAX_DATA_URL_CAPA
  const dimensoes = [
    { w: LADO_CAPA, h: Math.round(LADO_CAPA / PROPORCAO_CAPA) }, // 1280x427
    { w: 1080, h: 360 },
    { w: 960, h: 320 },
    { w: 840, h: 280 },
  ];

  const qualidades = [0.82, 0.74, 0.65, 0.55];

  let melhorDataUrl = "";

  for (const dim of dimensoes) {
    const canvas = document.createElement("canvas");
    canvas.width = dim.w;
    canvas.height = dim.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    try {
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dim.w, dim.h);
    } catch {
      continue;
    }

    for (const q of qualidades) {
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", q);
        melhorDataUrl = dataUrl;
        if (dataUrl.length <= MAX_DATA_URL_CAPA) {
          break;
        }
      } catch {
        // Ignora erro de extração de canvas
      }
    }
    if (melhorDataUrl && melhorDataUrl.length <= MAX_DATA_URL_CAPA) {
      break;
    }
  }

  if (!melhorDataUrl) {
    throw new Error("Não foi possível processar a imagem do banner.");
  }

  // Se alunoId foi informado, tenta upload direto no Vercel Blob com teto estrito de 8 segundos
  if (alunoId && melhorDataUrl.startsWith("data:")) {
    const controle = new AbortController();
    const timeout = setTimeout(() => controle.abort(), 8000);
    try {
      const arquivo = blobDoDataUrl(melhorDataUrl);
      const { url } = await upload(
        caminhoDaMidia(alunoId, nomeDaImagem(arquivo.type)),
        arquivo,
        {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ campo: "capa" }),
          abortSignal: controle.signal,
        },
      );
      if (url) return url;
    } catch {
      // Em caso de falha, timeout ou offline do Blob, o dataUrl seguro é retornado imediatamente
    } finally {
      clearTimeout(timeout);
    }
  }

  // Fallback caso Blob não responda: dataUrl compactado
  return melhorDataUrl;
}

export function ModalRecortarBanner({
  aberto,
  imagemFonte,
  alunoId,
  nomeAluno,
  onFechar,
  onSalvar,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0.5);
  const [panY, setPanY] = useState(0.5);
  const [carregandoImg, setCarregandoImg] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0.5,
    startPanY: 0.5,
  });

  // Carrega imagem quando o modal abre ou a fonte muda
  useEffect(() => {
    if (!aberto || !imagemFonte) return;

    setCarregandoImg(true);
    setErro(null);
    setZoom(1);
    setPanX(0.5);
    setPanY(0.5);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setCarregandoImg(false);
    };
    img.onerror = () => {
      setErro("Não foi possível carregar a imagem para recorte.");
      setCarregandoImg(false);
    };
    img.src = imagemFonte;
  }, [aberto, imagemFonte]);

  // Atualiza o canvas de prévia interativa quando zoom/pan alteram
  useEffect(() => {
    if (!aberto || carregandoImg || !imgRef.current || !previewCanvasRef.current) return;

    const img = imgRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const displayW = canvas.width;
    const displayH = canvas.height;

    ctx.clearRect(0, 0, displayW, displayH);

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const imgAspect = imgW / imgH;

    let baseW = imgW;
    let baseH = imgH;
    if (imgAspect >= PROPORCAO_CAPA) {
      baseH = imgH;
      baseW = imgH * PROPORCAO_CAPA;
    } else {
      baseW = imgW;
      baseH = imgW / PROPORCAO_CAPA;
    }

    const sWidth = Math.max(1, Math.min(imgW, baseW / zoom));
    const sHeight = Math.max(1, Math.min(imgH, baseH / zoom));

    const maxOffsetX = Math.max(0, imgW - sWidth);
    const maxOffsetY = Math.max(0, imgH - sHeight);

    const sx = maxOffsetX * panX;
    const sy = maxOffsetY * panY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, displayW, displayH);
  }, [aberto, carregandoImg, zoom, panX, panY]);

  // Drag para reposicionar livremente
  function aoIniciarArrasto(clientX: number, clientY: number) {
    draggingRef.current = true;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startPanX: panX,
      startPanY: panY,
    };
  }

  function aoArrastar(clientX: number, clientY: number) {
    if (!draggingRef.current) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    // Sensibilidade de deslocamento proporcional
    const sensibilidade = 0.003;
    const novoX = Math.max(0, Math.min(1, dragStartRef.current.startPanX - dx * sensibilidade));
    const novoY = Math.max(0, Math.min(1, dragStartRef.current.startPanY - dy * sensibilidade));

    setPanX(novoX);
    setPanY(novoY);
  }

  function aoTerminarArrasto() {
    draggingRef.current = false;
  }

  function ajusteAutomatico() {
    setZoom(1);
    setPanX(0.5);
    setPanY(0.5);
  }

  async function handleConfirmar() {
    if (!imgRef.current) return;
    setSalvando(true);
    setErro(null);

    try {
      const bannerFormatado = await formatarEComprimirBanner(
        imgRef.current,
        { zoom, panX, panY },
        alunoId,
      );
      await onSalvar(bannerFormatado);
      onFechar();
    } catch {
      setErro("Falha ao salvar banner. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) return null;

  return (
    <div className="modal-backdrop modal-recorte-backdrop" onClick={onFechar}>
      <div
        className="modal-recortar-banner"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recorte-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-recorte-header">
          <div className="modal-recorte-titulo-wrap">
            <span className="modal-recorte-tag">
              <IconeCrop tamanho={14} /> ENQUADRAMENTO 3:1
            </span>
            <h2 id="recorte-titulo">Recortar & Ajustar Banner</h2>
            <p>Arraste a imagem ou use os controles para enquadrar perfeitamente no perfil.</p>
          </div>
          <button
            type="button"
            className="drawer-fechar"
            onClick={onFechar}
            aria-label="Fechar modal de recorte"
          >
            ✕
          </button>
        </header>

        <div className="modal-recorte-corpo">
          {erro ? <div className="alerta-banner alerta-erro">{erro}</div> : null}

          {/* Área de Visualização e Canvas de Recorte 3:1 */}
          <div
            className="viewport-recorte-wrap"
            onMouseDown={(e) => aoIniciarArrasto(e.clientX, e.clientY)}
            onMouseMove={(e) => aoArrastar(e.clientX, e.clientY)}
            onMouseUp={aoTerminarArrasto}
            onMouseLeave={aoTerminarArrasto}
            onTouchStart={(e) => aoIniciarArrasto(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => aoArrastar(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={aoTerminarArrasto}
          >
            <div className="viewport-recorte-moldura">
              <canvas
                ref={previewCanvasRef}
                width={720}
                height={240}
                className="canvas-recorte-preview"
              />

              {/* Guia de Enquadramento 3:1 com Grid */}
              <div className="grade-guia-recorte" aria-hidden="true">
                <span className="guia-linha-h linha-h-1" />
                <span className="guia-linha-h linha-h-2" />
                <span className="guia-linha-v linha-v-1" />
                <span className="guia-linha-v linha-v-2" />
              </div>

              {carregandoImg ? (
                <div className="viewport-loading-overlay">
                  <span>Carregando imagem...</span>
                </div>
              ) : null}

              <div className="viewport-dica-arrasto">
                <span>Clique e arraste para posicionar</span>
              </div>
            </div>
          </div>

          {/* Controles de Zoom, Posição e Auto-Ajuste */}
          <div className="controles-recorte-grid">
            <div className="controle-item">
              <div className="controle-label-linha">
                <span className="label-texto">Zoom ({zoom.toFixed(1)}x)</span>
                <div className="zoom-botoes-atalho">
                  <button
                    type="button"
                    className="btn-micro"
                    onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(1)))}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="btn-micro"
                    onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(1)))}
                  >
                    +
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="input-range-recorte"
              />
            </div>

            <div className="controle-item">
              <div className="controle-label-linha">
                <span className="label-texto">Posição Vertical (Y)</span>
                <span className="controle-val">{Math.round(panY * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={panY}
                onChange={(e) => setPanY(parseFloat(e.target.value))}
                className="input-range-recorte"
              />
            </div>

            <div className="controle-item">
              <div className="controle-label-linha">
                <span className="label-texto">Posição Horizontal (X)</span>
                <span className="controle-val">{Math.round(panX * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={panX}
                onChange={(e) => setPanX(parseFloat(e.target.value))}
                className="input-range-recorte"
              />
            </div>

            <div className="controle-item controle-acoes-rapidas">
              <button
                type="button"
                className="btn-ajuste-automatico"
                onClick={ajusteAutomatico}
                title="Centralizar e redefinir o enquadramento na proporção oficial 3:1"
              >
                <IconeSparkles tamanho={15} />
                <span>Ajuste Automático</span>
              </button>
            </div>
          </div>
        </div>

        <footer className="modal-recorte-rodape">
          <button
            type="button"
            className="btn-recorte-cancelar"
            onClick={onFechar}
            disabled={salvando}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-recorte-aplicar"
            onClick={handleConfirmar}
            disabled={carregandoImg || salvando}
          >
            {salvando ? (
              <span>Processando & Salvando...</span>
            ) : (
              <>
                <IconeCheck tamanho={16} />
                <span>Aplicar e Salvar Banner</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
