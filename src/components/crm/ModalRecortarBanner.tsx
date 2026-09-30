"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  IconeCheck,
  IconeCrop,
  IconeSparkles,
} from "@/components/Icones";
import { blobDoDataUrl, caminhoDaMidia, nomeDaImagem } from "@/lib/blob";
import { useTravaDeFoco } from "@/lib/foco";
import { LADO_CAPA, MAX_DATA_URL_CAPA, PROPORCAO_CAPA } from "@/lib/limites";

type Props = {
  aberto: boolean;
  imagemFonte: string | null;
  alunoId?: string | null;
  /**
   * O banner que está no perfil agora. O upload em segundo plano só troca o
   * data URL pela URL do Blob se o banner aplicado ainda for este — sem isso,
   * "Remover" (ou um recorte novo) logo depois do apply perderia a corrida
   * para o upload, que resolveria por último e traria o banner de volta.
   */
  bannerAtual?: string | null;
  nomeAluno?: string;
  onFechar: () => void;
  onSalvar: (bannerUrl: string) => Promise<void> | void;
};

/**
 * Recorta e comprime a imagem garantindo que o data URL caiba no limite de 220 KB,
 * reduzindo resolução e qualidade progressivamente de forma instantânea.
 */
export function formatarEComprimirBanner(
  img: HTMLImageElement,
  crop: { zoom: number; panX: number; panY: number },
): string {
  const { zoom, panX, panY } = crop;
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  if (!imgW || !imgH) {
    throw new Error("Imagem com dimensões inválidas.");
  }
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
          return melhorDataUrl;
        }
      } catch {
        // Ignora erro de extração de canvas
      }
    }
  }

  if (!melhorDataUrl) {
    throw new Error("Não foi possível processar a imagem do banner.");
  }

  return melhorDataUrl;
}

/**
 * Envia o banner recortado para o Vercel Blob em background.
 * Se der certo, retorna a URL pública; se der timeout ou offline, retorna null.
 */
export async function subirBannerBlob(
  dataUrl: string,
  alunoId: string,
): Promise<string | null> {
  if (!dataUrl.startsWith("data:")) return null;
  const controle = new AbortController();
  const timeout = setTimeout(() => controle.abort(), 6000);
  try {
    const arquivo = blobDoDataUrl(dataUrl);
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
    return url || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function ModalRecortarBanner({
  aberto,
  imagemFonte,
  alunoId,
  bannerAtual,
  nomeAluno,
  onFechar,
  onSalvar,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0.5);
  const [panY, setPanY] = useState(0.5);
  const [carregandoImg, setCarregandoImg] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  useTravaDeFoco(dialogoRef);
  const draggingRef = useRef(false);

  /**
   * Cada sessão de recorte tem uma geração. O upload do banner roda em segundo
   * plano e pode resolver até 6 s depois — tempo de sobra para o aluno fechar,
   * reabrir e aplicar outro recorte. O número capturado no apply diz se aquele
   * resultado ainda é o do banner vigente: se não for, ele é descartado em vez
   * de chegar por último e sobrescrever o que o aluno escolheu depois.
   */
  const geracaoRef = useRef(0);

  // O banner vigente, sempre fresco: o guarda da geração sozinho não vê a
  // remoção (quem remove é a barra do herói, do lado de fora deste modal).
  const bannerAtualRef = useRef(bannerAtual);
  bannerAtualRef.current = bannerAtual;
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0.5,
    startPanY: 0.5,
  });

  // Carrega imagem quando o modal abre ou a fonte muda
  useEffect(() => {
    if (!aberto || !imagemFonte) return;

    // Sessão de recorte nova — abriu o modal ou trocou a imagem. O upload que
    // ficou pendente da sessão anterior não pode mais escrever no perfil: o
    // aluno já saiu daquele recorte (e o "Cancelar" também cai aqui, porque
    // descartar e voltar depois é recomeçar).
    geracaoRef.current++;

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

  function handleConfirmar() {
    if (!imgRef.current) return;
    setErro(null);

    // Um apply novo invalida o upload que ainda está no ar: o banner que o
    // aluno quer é este, e o do recorte anterior chegando depois só o
    // sobrescreveria com uma escolha que ele já abandonou.
    const geracao = ++geracaoRef.current;

    try {
      const bannerFormatado = formatarEComprimirBanner(
        imgRef.current,
        { zoom, panX, panY },
      );
      // Aplica imediatamente no perfil e fecha o modal sem qualquer espera
      onSalvar(bannerFormatado);
      onFechar();

      // Em segundo plano (sem travar a UI), tenta subir para o Vercel Blob se alunoId existir
      if (alunoId && bannerFormatado.startsWith("data:")) {
        subirBannerBlob(bannerFormatado, alunoId).then((blobUrl) => {
          // Duas condições, porque são duas correrias diferentes: a geração
          // pega o recorte abandonado (outro apply ou reabrir o modal), e o
          // banner atual pega o "Remover" feito por fora enquanto este subia.
          if (blobUrl && geracao === geracaoRef.current && bannerAtualRef.current === bannerFormatado) {
            onSalvar(blobUrl);
          }
        }).catch(() => {
          // Mantém o banner formatado funcional
        });
      }
    } catch {
      setErro("Falha ao processar e recortar o banner. Tente novamente.");
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
        tabIndex={-1}
        ref={dialogoRef}
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
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-recorte-aplicar"
            onClick={handleConfirmar}
            disabled={carregandoImg}
          >
            <IconeCheck tamanho={16} />
            <span>Aplicar e Salvar Banner</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
