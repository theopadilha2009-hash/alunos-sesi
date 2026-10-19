/**
 * Normaliza o que o aluno cola no campo LinkedIn/GitHub.
 *
 * A regra é aceitar o que a pessoa tem à mão — URL inteira, com ou sem
 * `www`, `linkedin.com/in/x` sem protocolo, `@handle`, ou só o handle — e
 * guardar sempre a mesma forma canônica. As CHECK do banco espelham
 * exatamente o que sai daqui.
 *
 * Sem imports de propósito: testado direto pelo `node --test`.
 */

/** Mesmo padrão da constraint github_handle em src/sql/001_schema.sql. */
const RE_GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

/**
 * Raiz absoluta do site, sem barra no fim.
 *
 * Vem do ambiente da Vercel em vez de ficar escrita no código: sitemap, robots
 * e URLs canônicas acompanham um domínio próprio no dia em que ele existir, sem
 * editar arquivo. O fallback é a produção atual, para o build local.
 */
export const URL_BASE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://alunos-sesi.vercel.app";

/** Mesmo padrão da constraint linkedin_url em src/sql/001_schema.sql. */
const RE_LINKEDIN_HANDLE = /^[A-Za-z0-9\-_%]{1,100}$/;

/** Devolve o handle do GitHub, ou null se não der para aproveitar. */
export function normalizarGithub(bruto: unknown): string | null {
  const s = String(bruto ?? "").trim();
  if (!s) return null;
  const handle = s
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.git$/i, "")
    .trim();
  return RE_GITHUB.test(handle) ? handle : null;
}

/** Devolve a URL canônica do LinkedIn, ou null se não der para aproveitar. */
export function normalizarLinkedin(bruto: unknown): string | null {
  const s = String(bruto ?? "").trim();
  if (!s) return null;

  const achado = s.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  const handle = (achado ? achado[1] : s.replace(/^@/, "").replace(/^\/?in\//i, ""))
    .replace(/[/?#].*$/, "")
    .trim();

  return RE_LINKEDIN_HANDLE.test(handle)
    ? `https://www.linkedin.com/in/${handle}`
    : null;
}

/** Handle do Instagram: letras, números, ponto e _, até 30. */
const RE_INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/** Devolve o @handle do Instagram, ou null se não der para aproveitar. */
export function normalizarInstagram(bruto: unknown): string | null {
  const s = String(bruto ?? "").trim();
  if (!s) return null;
  const handle = s
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .trim();
  return RE_INSTAGRAM_HANDLE.test(handle) ? `@${handle}` : null;
}

export type LinksSociais = {
  linkedin: string | null;
  github: string | null;
  instagram: string | null;
};

/**
 * Campo preenchido que não vira link válido é ERRO, não remoção — mesmo
 * contrato do e-mail em `acoes-crm.ts`. Antes cada normalizador devolvia null
 * em silêncio, o update gravava null por cima do valor que já estava salvo e
 * a tela dizia "atualizado": bastava um `_` no handle do GitHub para o aluno
 * perder o link que já tinha.
 */
export function processarLinksSociais(
  linkedinBruto: string,
  githubBruto: string,
  instagramBruto: string,
): { links: LinksSociais | null; erro: string | null } {
  const linkedin = normalizarLinkedin(linkedinBruto);
  if (linkedinBruto && !linkedin) {
    return {
      links: null,
      erro:
        "O LinkedIn precisa ser o endereço linkedin.com/in/seu-usuario (letras, números, hífen, ponto e _).",
    };
  }
  const github = normalizarGithub(githubBruto);
  if (githubBruto && !github) {
    return {
      links: null,
      erro:
        "O usuário do GitHub aceita só letras, números e hífen (ex: usuario ou github.com/usuario).",
    };
  }
  const instagram = normalizarInstagram(instagramBruto);
  if (instagramBruto && !instagram) {
    return {
      links: null,
      erro:
        "O usuário do Instagram aceita só letras, números, ponto e _ (ex: @usuario).",
    };
  }
  return { links: { linkedin, github, instagram }, erro: null };
}

/** Do handle guardado para a URL que o cartão abre. */
export function urlGithub(handle: string | null | undefined): string | null {
  return handle ? `https://github.com/${handle}` : null;
}

/** O LinkedIn já é guardado como URL; isto é só para o rótulo do cartão. */
export function handleLinkedin(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.match(/linkedin\.com\/in\/([^/?#\s]+)/i)?.[1] ?? null;
}

/** O nome do arquivo de foto vem do handle — evita colisão e path estranho. */
export function iniciais(nome: string): string {
  const partes = String(nome ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
