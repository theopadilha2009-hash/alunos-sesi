/**
 * Tema claro/escuro: um lugar só para aplicar.
 *
 * O tema vive em `data-theme` no `<html>` e é lido antes da primeira pintura
 * pelo script inline do layout, que não pode importar daqui (é string). Este
 * módulo é o outro lado: quem alterna em React chama `aplicarTema`.
 *
 * A cor da barra do PWA entra junto porque é a mesma decisão. Ela era fixa em
 * `#E30613` — vermelho que não existe em nenhuma tela do app — e a etiqueta
 * `<meta name="theme-color">` não acompanhava o tema escolhido.
 */

export const CHAVE_TEMA = "sesi.tema";

export type Tema = "dark" | "light";

/** Fundo de cada tema, em `globals.css` (`--bg`). A barra do sistema acompanha. */
const COR_DA_BARRA: Record<Tema, string> = {
  dark: "#090d12",
  light: "#f8fafc",
};

export function ehTema(valor: unknown): valor is Tema {
  return valor === "dark" || valor === "light";
}

/**
 * Aplica o tema no documento e sincroniza a cor da barra do PWA.
 *
 * Sem `document` (render no servidor) não faz nada — quem chama são efeitos e
 * handlers de clique, mas a guarda evita surpresa se alguém chamar de cima.
 */
export function aplicarTema(tema: Tema): void {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.theme = tema;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", COR_DA_BARRA[tema]);
}

/** Tema salvo pelo usuário, ou `null` se nunca escolheu ou o storage está bloqueado. */
export function lerTemaSalvo(): Tema | null {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    return ehTema(salvo) ? salvo : null;
  } catch {
    // modo privado sem storage
    return null;
  }
}

export function salvarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // idem: o tema vale só nesta navegação
  }
}
