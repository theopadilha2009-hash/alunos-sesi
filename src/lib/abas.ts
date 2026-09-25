import type { KeyboardEvent } from "react";

/**
 * Navegação por setas dentro de uma `[role="tablist"]`, como pede o padrão
 * ARIA de tabs.
 *
 * A barra é achada a partir do próprio botão (`closest`), então quem usa não
 * precisa de `ref` nem de id: basta pendurar em cada `[role="tab"]`.
 *
 * O `click()` no fim é o que ativa a aba — o padrão quer ativação automática
 * junto com o movimento do foco, e quem sabe trocar a aba é o estado de quem
 * montou a tablist, não este módulo.
 */
export function aoSetasDasAbas(e: KeyboardEvent<HTMLButtonElement>) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const barra = e.currentTarget.closest('[role="tablist"]');
  if (!barra) return;
  const abas = Array.from(barra.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const atual = abas.indexOf(e.currentTarget);
  if (atual < 0) return;
  e.preventDefault();
  const proxima = abas[(atual + (e.key === "ArrowRight" ? 1 : -1) + abas.length) % abas.length];
  proxima.focus();
  proxima.click();
}
