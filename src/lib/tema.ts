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

/*
 * Do lado da LEITURA não há função aqui de propósito: quem lê o tema salvo é o
 * script inline do `layout.tsx`, antes da primeira pintura, e ele não pode
 * importar deste módulo (é string). O `lerTemaSalvo` que existia fazia essa
 * leitura em React, e depois que o alternador passou a ler o `data-theme` do
 * documento ninguém mais precisava dele — ficou órfão, e órfão saiu.
 *
 * A duplicação que sobra é assumida: os dois valores de `COR_DA_BARRA` também
 * estão escritos, em hex, dentro daquele script — ele é string e não alcança
 * este módulo. Mudar a cor aqui sem mudar lá deixa a barra do PWA com a cor
 * antiga para quem só recarrega a página (quem clica no alternador passa por
 * `aplicarTema` e acerta).
 */

export function salvarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // idem: o tema vale só nesta navegação
  }
}
