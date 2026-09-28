"use client";

import { IconeLua, IconeSol } from "@/components/Icones";
import { aplicarTema, salvarTema, type Tema } from "@/lib/tema";

/**
 * Alternador minimalista de tema (somente botão de ícone SVG, sem emoji nem texto).
 *
 * O estado do tema NÃO mora aqui. Ele vive em `data-theme`, no `<html>`, e é
 * escrito antes da primeira pintura pelo script inline do layout — guardá-lo em
 * `useState` obrigava o ícone a nascer errado no SSR ("dark") e a ser corrigido
 * só depois do mount, e o botão trocava de ícone depois da tela pintar, colado
 * no logo. Agora os dois ícones existem no DOM e quem escolhe é o CSS
 * (`.tema-icone-*`, em `vitrine.css`), pelo mesmo padrão do logo.
 */
export function TemaToggle({ compacto = true }: { compacto?: boolean }) {
  function alternar() {
    const atual = document.documentElement.dataset.theme;
    const proximo: Tema = atual === "light" ? "dark" : "light";
    aplicarTema(proximo);
    salvarTema(proximo);
  }

  return (
    <button
      type="button"
      className="botao-tema-icone"
      onClick={alternar}
      title="Alternar tema"
    >
      {/* Em tema escuro mostra-se o sol e em tema claro a lua: o ícone anuncia
          para onde o clique leva, não onde se está.
          O texto de leitor de tela acompanha o ícone pelo mesmo par de classes
          (`tema-icone-*`), que é o que faz a troca pelo `data-theme`. Os dois
          SVGs são `aria-hidden`, então sem isto quem não vê o desenho ouvia um
          `aria-label` fixo — a mesma frase nos dois temas, descrevendo o botão
          em vez de dizer o que o clique faz. Aqui as duas informações batem. */}
      <span className="tema-icone tema-icone-escuro" aria-hidden="true">
        <IconeSol tamanho={18} />
      </span>
      <span className="sr-only tema-icone-escuro">Ativar o tema claro</span>
      <span className="tema-icone tema-icone-claro" aria-hidden="true">
        <IconeLua tamanho={18} />
      </span>
      <span className="sr-only tema-icone-claro">Ativar o tema escuro</span>
    </button>
  );
}
