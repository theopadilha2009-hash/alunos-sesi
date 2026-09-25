/**
 * Trava de foco para diálogos modais.
 *
 * Os cinco diálogos do projeto se declaram `aria-modal="true"`, o que promete ao
 * leitor de tela que o conteúdo atrás está inerte. Sem prender o Tab, a promessa
 * era falsa: o foco entrava no diálogo ao abrir (desde o PR #10), mas o primeiro
 * Tab depois do último botão caía no conteúdo encoberto e o usuário de teclado
 * seguia navegando uma página que ele não vê.
 *
 * O núcleo da decisão é puro (`proximoFoco`) e mora fora do efeito de propósito:
 * é a parte que erra fácil — a volta nas pontas e o Shift+Tab — e é a única que
 * dá para trancar com teste sem subir DOM.
 */

import { useEffect, type RefObject } from "react";

const SELETOR_FOCAVEIS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Para onde o Tab vai, em índice, dentro de uma lista de focáveis.
 *
 * Devolve `null` quando o navegador já faz a coisa certa — ou seja, no meio da
 * lista. Só intervimos nas pontas, onde o comportamento nativo é sair do
 * diálogo.
 *
 * `indiceAtual` negativo significa foco no próprio container (que tem
 * `tabIndex={-1}` para poder receber foco) ou fora da lista: nesse caso o Tab
 * precisa entrar na lista pela ponta certa, senão o usuário cai no vazio.
 */
export function proximoFoco(
  total: number,
  indiceAtual: number,
  shift: boolean,
): number | null {
  const ultimo = total - 1;
  if (indiceAtual < 0) return shift ? ultimo : 0;
  if (shift) return indiceAtual === 0 ? ultimo : null;
  return indiceAtual === ultimo ? 0 : null;
}

/** Focáveis de verdade: `display:none` e `aria-hidden` não contam. */
function focaveis(caixa: HTMLElement): HTMLElement[] {
  return Array.from(caixa.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS)).filter(
    (el) => {
      // Pega `<button tabindex="-1">`, que o seletor sozinho deixa passar.
      if (el.tabIndex < 0) return false;
      if (el.hasAttribute("hidden")) return false;
      if (el.closest('[aria-hidden="true"]')) return false;
      const estilo = window.getComputedStyle(el);
      return estilo.display !== "none" && estilo.visibility !== "hidden";
    },
  );
}

/**
 * Prende o Tab dentro de `ref` enquanto o componente estiver montado.
 *
 * O listener fica no `document`, e não no container, porque o caso mais grave é
 * justamente o foco já ter escapado (clique no backdrop, `focus()` de terceiro):
 * aí um listener no container nunca dispararia, e a trava só funcionaria para
 * quem ainda está dentro.
 */
export function useTravaDeFoco(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    function aoTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const caixa = ref.current;
      if (!caixa) return;

      // Diálogo dentro de diálogo: o mini-perfil abre o currículo por cima, e
      // os dois traps ficam ativos ao mesmo tempo. Quem está por dentro manda —
      // sem esta saída, o trap de fora acharia que o Tab do currículo é dele e
      // levaria o foco para um botão encoberto do mini-perfil.
      const dono = (e.target as HTMLElement | null)?.closest?.('[role="dialog"]');
      if (dono && dono !== caixa) return;

      // Mesmo caso, mas com o foco solto no `body`: aí não há `dono`, os dois
      // traps passam pela saída acima e o de fora (que registrou o listener
      // primeiro) ganha, jogando o foco para trás do diálogo visível. Não se
      // chega nisso clicando dentro do diálogo — o Chrome foca o ancestral
      // focável, que é o próprio container com `tabIndex={-1}` —, mas chega-se
      // por `window.print()` e por qualquer `blur()` de terceiro. Manda o
      // último no DOM, que é o empilhado por cima nesta base.
      if (!dono) {
        const abertos = document.querySelectorAll('[role="dialog"]');
        if (abertos.length > 1 && abertos[abertos.length - 1] !== caixa) return;
      }

      const alvos = focaveis(caixa);
      if (alvos.length === 0) {
        // Diálogo sem nada focável: sair seria pior que não fazer nada.
        e.preventDefault();
        return;
      }

      const ativo = document.activeElement;
      // `contains` é true para o próprio container, mas o container não é uma
      // parada válida do Tab — por isso ele entra como "fora".
      const dentro = ativo !== caixa && caixa.contains(ativo);
      const indice = dentro ? alvos.indexOf(ativo as HTMLElement) : -1;

      const destino = proximoFoco(alvos.length, indice, e.shiftKey);
      if (destino === null) return;

      e.preventDefault();
      alvos[destino].focus();
    }

    document.addEventListener("keydown", aoTab);
    return () => document.removeEventListener("keydown", aoTab);
  }, [ref]);
}
