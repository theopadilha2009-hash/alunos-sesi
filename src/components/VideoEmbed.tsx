"use client";

import { useState } from "react";
import { urlEmbed, urlMiniatura, type VideoAluno } from "@/lib/video";

/**
 * Vídeo do perfil, com o player só carregando no clique.
 *
 * O `<iframe>` do YouTube custa cerca de 1 MB de script e mais alguns requests
 * de terceiro. Um perfil com quatro vídeos pagaria isso na primeira dobra, para
 * quem talvez nem assista — e a visita típica aqui é alguém olhando o perfil de
 * um aluno no celular.
 *
 * Por isso a "fachada": antes do clique aparece só a miniatura (uma imagem do
 * `i.ytimg.com`, que o `img-src` já cobre) mais um botão. O iframe só nasce
 * depois. É o mesmo desenho do `lite-youtube-embed`, sem a dependência.
 *
 * No Vimeo não há URL de miniatura sem chamar a API, então a fachada é o fundo
 * do card com o rótulo — e o ganho de não carregar o player antes da hora
 * continua valendo, que é a parte que importa.
 */
export function VideoEmbed({
  video,
  className,
}: {
  video: VideoAluno;
  className?: string;
}) {
  const [tocando, setTocando] = useState(false);
  const rotulo = video.titulo?.trim() || `Vídeo no ${video.tipo === "youtube" ? "YouTube" : "Vimeo"}`;

  if (tocando) {
    return (
      <div className={className ? `video-embed ${className}` : "video-embed"}>
        <iframe
          className="video-embed-frame"
          src={`${urlEmbed(video)}?autoplay=1`}
          title={rotulo}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  const miniatura = urlMiniatura(video);

  return (
    <div className={className ? `video-embed ${className}` : "video-embed"}>
      <button
        type="button"
        className="video-embed-capa"
        onClick={() => setTocando(true)}
        aria-label={`Reproduzir: ${rotulo}`}
        // Duas camadas: o véu primeiro, a miniatura por baixo. Vão juntas no
        // inline porque o `background-image` inline vence a folha de estilo —
        // declarar o véu no CSS o faria sumir exatamente nos cards que têm
        // imagem. Sem miniatura (Vimeo) fica só o véu sobre o fundo do card.
        style={{
          backgroundImage: miniatura
            ? `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url(${miniatura})`
            : "linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35))",
        }}
      >
        <span className="video-embed-play" aria-hidden="true" />
        <span className="video-embed-rotulo">{rotulo}</span>
      </button>
    </div>
  );
}
