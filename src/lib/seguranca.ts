import { timingSafeEqual } from "node:crypto";
import type { MidiaAluno, ProjetoAluno } from "./tipos";

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
 */
export function urlImagemSegura(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const limpa = url.trim();
  if (!limpa) return null;

  if (PROTOCOLOS_PERMITIDOS.test(limpa)) {
    return limpa.length <= 2048 ? limpa : null;
  }

  // Permite data URL somente de imagens válidas com tamanho sob controle
  if (limpa.startsWith("data:image/") && limpa.length <= 2 * 1024 * 1024) {
    if (REGEX_DATA_IMAGE.test(limpa)) {
      return limpa;
    }
  }

  return null;
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

export function sanitizarProjetos(bruto: unknown[]): ProjetoAluno[] {
  if (!Array.isArray(bruto)) return [];

  const sanitizados: ProjetoAluno[] = [];
  const maxProjetos = 10;

  for (const item of bruto.slice(0, maxProjetos)) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;

    const titulo = sanitizarTexto(p.titulo, 80);
    if (!titulo) continue;

    const descricao = sanitizarTexto(p.descricao, 200);
    const link = urlSegura(p.link);
    const imagem = urlImagemSegura(p.imagem);

    sanitizados.push({
      id: typeof p.id === "string" && p.id ? p.id.slice(0, 50) : `proj-${sanitizados.length + 1}`,
      titulo,
      descricao,
      link: link ?? undefined,
      imagem: imagem ?? undefined,
    });
  }

  return sanitizados;
}

export function sanitizarMidias(bruto: unknown[]): MidiaAluno[] {
  if (!Array.isArray(bruto)) return [];

  const sanitizadas: MidiaAluno[] = [];
  const maxMidias = 12;

  for (const item of bruto.slice(0, maxMidias)) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;

    const url = urlImagemSegura(m.url);
    if (!url) continue;

    const tipo = m.tipo === "gif" ? "gif" : "imagem";
    const legenda = m.legenda ? sanitizarTexto(m.legenda, 100) : undefined;

    sanitizadas.push({
      url,
      tipo,
      legenda,
    });
  }

  return sanitizadas;
}
