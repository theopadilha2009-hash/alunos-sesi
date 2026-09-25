/**
 * Content-Security-Policy.
 *
 * Módulo folha de propósito: nada aqui importa outro módulo do projeto, então
 * dá para testar o texto da política sem subir o Next.
 *
 * Três decisões que não são óbvias e que quebram a UI se alguém "arrumar":
 *
 * 1. `style-src` NÃO tem nonce. Nonce em `style-src` desliga o
 *    `'unsafe-inline'` (por spec), e o app usa `style={{…}}` em toda parte —
 *    inclusive no `_not-found` pré-renderizado, que nasce com atributos
 *    `style="…"` no HTML. Com nonce ali, a página perde o estilo inline.
 *    Nonce só resolve `<style>`/`<script>` inline, não atributo `style`.
 * 2. Sem `'strict-dynamic'`. Com ele, `'self'` é ignorado e só executa script
 *    carregado por script confiável — mas as páginas pré-renderizadas
 *    (`_not-found`, `robots`) trazem `<script src="/_next/static/…">` sem
 *    nonce, e ficariam sem hidratação.
 * 3. `img-src` é `https:` e não uma allowlist de hosts. O Estúdio de stickers
 *    aceita URL de GIF digitada pelo aluno (`StickerCanvas`), e o servidor
 *    aceita por `urlImagemSegura`. Allowlist fechada quebraria o recurso e
 *    invalidaria o que já está gravado. Imagem não executa script; quem
 *    protege de verdade é o `script-src` com nonce.
 */

export const CSP_HEADER = "Content-Security-Policy";
export const NONCE_HEADER = "x-nonce";

/**
 * Hosts de imagem que a política permite além da própria origem. Está aqui
 * como documentação do que o `https:` cobre na prática; o valor real é o
 * esquema, pelo motivo 3 acima.
 */
export const HOSTS_IMAGEM = ["https:"] as const;

export function montarCsp(nonce: string, dev: boolean): string {
  // `@vercel/analytics` só usa o script same-origin (`/_vercel/insights`) com
  // `NODE_ENV=production`. Em dev ele troca para o script de debug em
  // va.vercel-scripts.com, que a política fecharia — daí o host extra existir
  // apenas no ramo de dev, junto do `'unsafe-eval'`.
  const HOST_ANALYTICS_DEV = dev ? " https://va.vercel-scripts.com" : "";

  const diretivas = [
    "default-src 'self'",
    // `'unsafe-eval'` só em dev: o React usa eval para reconstruir stack de
    // erro do servidor no browser. Em produção ninguém usa eval.
    `script-src 'self' 'nonce-${nonce}'${dev ? " 'unsafe-eval'" : ""}${HOST_ANALYTICS_DEV}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${HOSTS_IMAGEM.join(" ")}`,
    `media-src 'self' blob: ${HOSTS_IMAGEM.join(" ")}`,
    // next/font baixa e auto-hospeda em /_next/static/media no build, então
    // não precisa liberar fonts.googleapis.com.
    "font-src 'self'",
    // O Supabase é falado só pelo servidor; o browser usa same-origin.
    `connect-src 'self'${HOST_ANALYTICS_DEV}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // Em dev o app roda em http no localhost; subir para https ali quebraria.
    dev ? "" : "upgrade-insecure-requests",
  ];

  return diretivas.filter(Boolean).join("; ");
}
