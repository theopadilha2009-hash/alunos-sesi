/**
 * Vídeo de YouTube e Vimeo: normalização e embed.
 *
 * O banco guarda `{ tipo, id }`, não a URL que o aluno colou. Duas razões:
 *
 * 1. **Allowlist de host de verdade.** Para imagem o projeto aceita qualquer
 *    `https:` de propósito (`csp.ts`), porque o aluno digita a URL do GIF. Para
 *    vídeo não dá: quem entra na página é um `<iframe>` — navegação de outra
 *    origem dentro do nosso documento —, e aí "qualquer host" é o que o
 *    `frame-src` existe para impedir. Guardando só o id, o host do iframe é
 *    sempre um de dois, escolhidos aqui.
 * 2. **A URL do aluno é descartável.** `youtu.be/x?si=...` e
 *    `youtube.com/watch?v=x&t=42` são o mesmo vídeo; gravar a original deixaria
 *    parâmetros de rastreio no banco e quebraria o embed no dia em que a
 *    plataforma mudasse o formato de link.
 *
 * Módulo folha: nada aqui importa outro módulo do projeto — mesma razão de
 * `blob.ts`, `cores.ts` e `limites.ts`. O editor no browser importa daqui.
 */

export type TipoVideo = "youtube" | "vimeo";

export type VideoAluno = {
  /** Id do vídeo na plataforma. */
  id: string;
  tipo: TipoVideo;
  /** Título que o aluno deu, opcional. */
  titulo?: string;
};

/**
 * Hosts aceitos, por plataforma.
 *
 * Comparação por igualdade de host, NUNCA `includes`: `youtube.com.evil.com`
 * contém `youtube.com` e passaria numa checagem por substring.
 */
const HOSTS: Record<TipoVideo, string[]> = {
  youtube: [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
  ],
  vimeo: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"],
};

/** Id do YouTube: 11 caracteres de base64url. */
const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

/** Id do Vimeo: numérico. O menor id real tem 6 dígitos; 12 dá folga. */
const ID_VIMEO = /^[0-9]{6,12}$/;

/** Os hosts que o `frame-src` da CSP libera. Amarra com `csp.ts` pelo teste. */
export const HOSTS_EMBED: Record<TipoVideo, string> = {
  youtube: "https://www.youtube-nocookie.com",
  vimeo: "https://player.vimeo.com",
};

function plataformaDoHost(host: string): TipoVideo | null {
  for (const tipo of ["youtube", "vimeo"] as const) {
    if (HOSTS[tipo].includes(host)) return tipo;
  }
  return null;
}

/**
 * Aceita a URL que o aluno colou e devolve `{ tipo, id }`, ou `null`.
 *
 * Cobre as formas que as pessoas realmente copiam da barra de endereço e do
 * botão "compartilhar": `youtu.be/<id>`, `watch?v=`, `/embed/`, `/shorts/`,
 * `/live/`, `vimeo.com/<id>` e `player.vimeo.com/video/<id>`.
 */
export function normalizarVideo(url: unknown): VideoAluno | null {
  if (typeof url !== "string") return null;

  const limpa = url.trim();
  if (!limpa || limpa.length > 2048) return null;

  // Sem protocolo a URL não parseia: quem cola "youtu.be/x" do endereço perde
  // o `https://` no copiar-e-colar. Completar é mais gentil que recusar.
  const comProtocolo = /^[a-z][a-z0-9+.-]*:/i.test(limpa) ? limpa : `https://${limpa}`;

  let parsed: URL;
  try {
    parsed = new URL(comProtocolo);
  } catch {
    return null;
  }

  // Só https: a página é https, e um iframe http seria bloqueado pelo
  // `upgrade-insecure-requests` com o mesmo silêncio de um host errado.
  if (parsed.protocol !== "https:") return null;

  const tipo = plataformaDoHost(parsed.hostname.toLowerCase());
  if (!tipo) return null;

  const segmentos = parsed.pathname.split("/").filter(Boolean);

  if (tipo === "youtube") {
    // `youtu.be/<id>` — o id é o primeiro segmento do caminho.
    if (parsed.hostname.endsWith("youtu.be")) {
      return idValido(segmentos[0], "youtube");
    }
    // `watch?v=<id>` — o id está na query.
    if (segmentos[0] === "watch") {
      return idValido(parsed.searchParams.get("v"), "youtube");
    }
    // `/embed/<id>`, `/shorts/<id>`, `/live/<id>`, `/v/<id>`.
    return idValido(segmentos[1], "youtube");
  }

  // `player.vimeo.com/video/<id>` tem o id no segundo segmento; `vimeo.com/<id>`
  // no primeiro.
  const candidato = segmentos[0] === "video" ? segmentos[1] : segmentos[0];
  return idValido(candidato, "vimeo");
}

function idValido(bruto: string | null | undefined, tipo: TipoVideo): VideoAluno | null {
  if (typeof bruto !== "string") return null;
  const id = bruto.trim();
  const valido = tipo === "youtube" ? ID_YOUTUBE.test(id) : ID_VIMEO.test(id);
  return valido ? { id, tipo } : null;
}

/** URL do `<iframe>`. O host sai daqui, nunca do que o aluno digitou. */
export function urlEmbed(video: VideoAluno): string {
  if (video.tipo === "youtube") {
    // `youtube-nocookie` não é detalhe: o embed comum grava cookie de
    // rastreio no navegador de quem visita o perfil, que é menor de idade.
    return `${HOSTS_EMBED.youtube}/embed/${video.id}`;
  }
  return `${HOSTS_EMBED.vimeo}/video/${video.id}`;
}

/**
 * Miniatura do vídeo, para o `poster` do iframe.
 *
 * Só o YouTube tem URL de miniatura previsível. No Vimeo isso exige chamada de
 * API (o `vimeo.com/api/v2/video/<id>.json` responde sem chave, mas é uma ida
 * à rede por vídeo no meio do render) — então lá a capa é o gradiente do
 * próprio card, e não uma imagem.
 */
export function urlMiniatura(video: VideoAluno): string | null {
  if (video.tipo !== "youtube") return null;
  return `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
}

/** O mesmo vídeo já gravado? Compara tipo e id, ignorando o título. */
export function mesmoVideo(a: VideoAluno, b: VideoAluno): boolean {
  return a.tipo === b.tipo && a.id === b.id;
}
