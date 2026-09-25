import { timingSafeEqual } from "node:crypto";
// A extensão `.ts` é obrigatória aqui: este módulo é carregado cru pelo
// `node --experimental-strip-types` dos testes (tests/seguranca.test.mjs), e o
// resolvedor do Node não completa caminho relativo sem extensão. O resto de
// `src/` fica sem extensão porque só o bundler lê — este arquivo é a exceção.
import {
  LIMITES_STICKERS,
  MAX_DATA_URL_IMAGEM,
  MAX_MIDIAS,
  MAX_PROJETOS,
  type Descarte,
  type MotivoDescarte,
} from "./limites.ts";
import type { MidiaAluno, ProjetoAluno, StickerPerfil } from "./tipos.ts";

// Os tetos agora moram em limites.ts, que não importa `node:crypto` e por isso
// pode ser lido pelo client component que barra o arquivo grande antes de subir.
// Segue reexportado daqui porque é API pública deste módulo.
export { LIMITES_STICKERS };

/**
 * Utilitários de Segurança e Sanitização.
 *
 * Previne XSS, Timing Attacks, Bloat de Dados e Brute-Force.
 */

// ── 1. Comparação em Tempo Constante ──────────────────────────────────────────

export function compararTempoConstante(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// ── 2. URLs Seguras ─────────────────────────────────────────────────────────

const PROTOCOLOS_PERMITIDOS = /^https?:\/\//i;
const REGEX_DATA_IMAGE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Valida se uma URL é segura para navegação (links externos de projetos, github, etc.).
 * Rejeita veementemente javascript:, vbscript:, data: ou strings maliciosas.
 */
export function urlSegura(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const limpa = url.trim();
  if (!limpa || limpa.length > 2048) return null;

  // Rejeita tentativas de injeção de script
  if (/^(javascript|vbscript|data|file):/i.test(limpa)) {
    return null;
  }

  if (PROTOCOLOS_PERMITIDOS.test(limpa)) {
    return limpa;
  }

  return null;
}

/**
 * Valida URLs de imagem e capas. Permite HTTP/HTTPS e data URLs de imagens
 * leves (até 1.5MB de base64). Rejeita scripts ou data:text/html.
 *
 * `maxDataUrl` deixa quem chama apertar o teto do data URL — sticker tem
 * limite bem menor que mídia de perfil.
 */
export function urlImagemSegura(url: unknown, maxDataUrl = MAX_DATA_URL_IMAGEM): string | null {
  if (typeof url !== "string") return null;
  const limpa = url.trim();
  if (!limpa) return null;

  if (PROTOCOLOS_PERMITIDOS.test(limpa)) {
    return limpa.length <= 2048 ? limpa : null;
  }

  // Permite data URL somente de imagens válidas com tamanho sob controle
  if (limpa.startsWith("data:image/") && limpa.length <= maxDataUrl) {
    if (REGEX_DATA_IMAGE.test(limpa)) {
      return limpa;
    }
  }

  return null;
}

/**
 * Por que `urlImagemSegura` recusou. Data URL de imagem que passou do teto é
 * "grande-demais" — o caso que o aluno resolve trocando o arquivo; o resto é
 * endereço inválido.
 */
function motivoDaImagem(bruta: unknown, teto: number): Descarte["motivo"] {
  const s = typeof bruta === "string" ? bruta.trim() : "";
  return s.startsWith("data:image/") && s.length > teto ? "grande-demais" : "url-invalida";
}

// ── 3. Sanitização de Textos ────────────────────────────────────────────────

/**
 * Limpa strings de entrada, remove caracteres de controle e tags potencialmente perigosas,
 * e limita ao comprimento máximo permitido.
 */
export function sanitizarTexto(texto: unknown, maxLen = 280): string {
  if (typeof texto !== "string") return "";
  let s = texto
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // remove caracteres de controle
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // remove tags script
    .replace(/<[^>]+>/g, "") // remove tags HTML simples
    .trim();

  if (s.length > maxLen) {
    s = s.slice(0, maxLen).trim();
  }

  return s;
}

// ── 4. Rate Limiter em Memória ──────────────────────────────────────────────

type RegistroTentativas = {
  contagem: number;
  primeiraTentativa: number;
  bloqueadoAte?: number;
};

const mapaTentativas = new Map<string, RegistroTentativas>();

// Limpeza periódica de memória a cada 10 minutos
if (typeof setInterval !== "undefined") {
  const limpezaInterval = setInterval(() => {
    const agora = Date.now();
    for (const [chave, reg] of mapaTentativas.entries()) {
      if (reg.bloqueadoAte && reg.bloqueadoAte < agora) {
        mapaTentativas.delete(chave);
      } else if (agora - reg.primeiraTentativa > 15 * 60 * 1000) {
        mapaTentativas.delete(chave);
      }
    }
  }, 10 * 60 * 1000);
  if (limpezaInterval.unref) limpezaInterval.unref();
}

/**
 * Proteção contra força-bruta e abuso de requisições.
 * Devolve { permitido: true } ou { permitido: false, tempoRestanteMs: number }.
 */
export function verificarRateLimit(
  chave: string,
  maxTentativas: number,
  janelaMs: number,
  tempoBloqueioMs: number = janelaMs,
): { permitido: boolean; tempoRestanteMs?: number } {
  const agora = Date.now();
  const reg = mapaTentativas.get(chave);

  if (!reg) {
    mapaTentativas.set(chave, {
      contagem: 1,
      primeiraTentativa: agora,
    });
    return { permitido: true };
  }

  // Verifica se está no período de bloqueio
  if (reg.bloqueadoAte && reg.bloqueadoAte > agora) {
    return {
      permitido: false,
      tempoRestanteMs: reg.bloqueadoAte - agora,
    };
  }

  // Se a janela expirou, reinicia a contagem
  if (agora - reg.primeiraTentativa > janelaMs) {
    reg.contagem = 1;
    reg.primeiraTentativa = agora;
    delete reg.bloqueadoAte;
    return { permitido: true };
  }

  // Incrementa tentativas dentro da janela
  reg.contagem++;
  if (reg.contagem > maxTentativas) {
    reg.bloqueadoAte = agora + tempoBloqueioMs;
    return {
      permitido: false,
      tempoRestanteMs: tempoBloqueioMs,
    };
  }

  return { permitido: true };
}

export function resetarRateLimit(chave: string): void {
  mapaTentativas.delete(chave);
}

// ── 5. Validação de Estruturas JSON (Projetos & Mídias) ──────────────────────

/**
 * `descartes` é opcional e recebe o que foi rejeitado, para quem chama poder
 * avisar o aluno em vez de sumir com o item calado. Item que não é objeto
 * segue silencioso de propósito: formulário legítimo não manda isso, só POST
 * montado à mão — e não há o que dizer a quem fez isso.
 */
export function sanitizarProjetos(bruto: unknown[], descartes?: Descarte[]): ProjetoAluno[] {
  if (!Array.isArray(bruto)) return [];

  const sanitizados: ProjetoAluno[] = [];

  for (const item of bruto.slice(0, MAX_PROJETOS)) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;

    const titulo = sanitizarTexto(p.titulo, 80);
    if (!titulo) {
      descartes?.push({ motivo: "sem-titulo", campo: "projetos" });
      continue;
    }

    const descricao = sanitizarTexto(p.descricao, 200);
    const link = urlSegura(p.link);
    const imagem = urlImagemSegura(p.imagem);

    // Nem o link nem a capa derrubam o projeto: ele entra sem um, sem outro, ou
    // sem os dois. Nos dois casos o aluno precisa saber — antes sumiam calados.
    if (p.link && !link) {
      descartes?.push({ motivo: "link-invalido", campo: "projetos" });
    }
    if (p.imagem && !imagem) {
      descartes?.push({ motivo: motivoDaImagem(p.imagem, MAX_DATA_URL_IMAGEM), campo: "projetos" });
    }

    sanitizados.push({
      id: typeof p.id === "string" && p.id ? p.id.slice(0, 50) : `proj-${sanitizados.length + 1}`,
      titulo,
      descricao,
      link: link ?? undefined,
      imagem: imagem ?? undefined,
    });
  }

  // O `slice` acima corta o excedente sem avisar; aqui ele vira descarte.
  for (let i = MAX_PROJETOS; i < bruto.length; i++) {
    descartes?.push({ motivo: "acima-do-limite", campo: "projetos" });
  }

  return sanitizados;
}

export function sanitizarMidias(bruto: unknown[], descartes?: Descarte[]): MidiaAluno[] {
  if (!Array.isArray(bruto)) return [];

  const sanitizadas: MidiaAluno[] = [];

  for (const item of bruto.slice(0, MAX_MIDIAS)) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;

    const url = urlImagemSegura(m.url);
    if (!url) {
      descartes?.push({ motivo: motivoDaImagem(m.url, MAX_DATA_URL_IMAGEM), campo: "midias" });
      continue;
    }

    const tipo = m.tipo === "gif" ? "gif" : "imagem";
    const legenda = m.legenda ? sanitizarTexto(m.legenda, 100) : undefined;

    sanitizadas.push({
      url,
      tipo,
      legenda,
    });
  }

  for (let i = MAX_MIDIAS; i < bruto.length; i++) {
    descartes?.push({ motivo: "acima-do-limite", campo: "midias" });
  }

  return sanitizadas;
}

// ── 6. Stickers do perfil (Estúdio) ─────────────────────────────────────────
// LIMITES_STICKERS vem de ./limites (reexportado no topo deste arquivo).

function numeroLimitado(valor: unknown, min: number, max: number, padrao: number): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return padrao;
  return Math.round(Math.min(max, Math.max(min, valor)) * 100) / 100;
}

/** Normaliza para -180..180. `720` vira `0`, `200` vira `-160`. */
function rotacaoNormalizada(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return 0;
  const resto = valor % 360;
  const normalizado = resto > 180 ? resto - 360 : resto < -180 ? resto + 360 : resto;
  return Math.round(normalizado * 100) / 100;
}

/**
 * Sanitiza os stickers do Estúdio. Sem isto o aluno gravava JSON arbitrário no
 * JSONB — inclusive URL fora do allowlist de imagem, coordenada absurda e
 * centenas de entradas.
 *
 * Sticker de projeto que aponta para projeto inexistente é **descartado**, não
 * realocado para o banner: mudar de lugar o que o aluno posicionou é pior que
 * sumir.
 */
export function sanitizarStickers(
  bruto: unknown[],
  projetoIdsPermitidos: readonly string[] = [],
  descartes?: Descarte[],
): StickerPerfil[] {
  if (!Array.isArray(bruto)) return [];

  const sanitizados: StickerPerfil[] = [];
  const idsUsados = new Set<string>();
  let bytesAcumulados = 0;

  // Os dois `break` abaixo largam o item atual E tudo que vem depois; sem isto
  // o corte no teto sumia calado, igual ao descarte item a item.
  const registrarCorte = (aPartirDe: number, motivo: MotivoDescarte) => {
    if (!descartes) return;
    for (let j = aPartirDe; j < bruto.length; j++) {
      descartes.push({ motivo, campo: "stickers" });
    }
  };

  for (let i = 0; i < bruto.length; i++) {
    if (sanitizados.length >= LIMITES_STICKERS.max) {
      registrarCorte(i, "acima-do-limite");
      break;
    }
    const item = bruto[i];
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;

    const url = urlImagemSegura(s.url, LIMITES_STICKERS.maxDataUrlBytes);
    if (!url) {
      descartes?.push({
        motivo: motivoDaImagem(s.url, LIMITES_STICKERS.maxDataUrlBytes),
        campo: "stickers",
      });
      continue;
    }

    const alvo: StickerPerfil["alvo"] = s.alvo === "projeto" ? "projeto" : "banner";
    let projetoId: string | undefined;
    if (alvo === "projeto") {
      const candidato = typeof s.projetoId === "string" ? s.projetoId : "";
      if (!candidato || !projetoIdsPermitidos.includes(candidato)) {
        descartes?.push({ motivo: "projeto-inexistente", campo: "stickers" });
        continue;
      }
      projetoId = candidato;
    }

    // A contagem de bytes vem DEPOIS do descarte acima de propósito: cobrar
    // orçamento por item que não entra na lista faria um data URL de projeto
    // inválido derrubar os stickers de banner válidos que vêm depois.
    if (url.startsWith("data:")) {
      bytesAcumulados += url.length;
      if (bytesAcumulados > LIMITES_STICKERS.maxTotalBytes) {
        // Só este estourou o orçamento. Os seguintes nem chegaram a ser
        // medidos, então acusá-los de "grande demais" seria falso — eles caem
        // por limite, não por tamanho.
        descartes?.push({ motivo: "grande-demais", campo: "stickers" });
        registrarCorte(i + 1, "acima-do-limite");
        break;
      }
    }

    // O id vem do cliente e vira `key` do React: repetido, duplica a chave.
    const id = typeof s.id === "string" && s.id ? s.id.slice(0, 50) : `st-${sanitizados.length + 1}`;
    if (idsUsados.has(id)) {
      descartes?.push({ motivo: "duplicado", campo: "stickers" });
      continue;
    }
    idsUsados.add(id);

    sanitizados.push({
      id,
      url,
      tipo: s.tipo === "gif" ? "gif" : "sticker",
      rotulo: (s.rotulo ? sanitizarTexto(s.rotulo, LIMITES_STICKERS.maxRotulo) : "") || undefined,
      x: numeroLimitado(s.x, 0, 100, 50),
      y: numeroLimitado(s.y, 0, 100, 50),
      tamanho: numeroLimitado(
        s.tamanho,
        LIMITES_STICKERS.tamanhoMin,
        LIMITES_STICKERS.tamanhoMax,
        LIMITES_STICKERS.tamanhoPadrao,
      ),
      rotacao: rotacaoNormalizada(s.rotacao),
      alvo,
      projetoId,
    });
  }

  return sanitizados;
}
