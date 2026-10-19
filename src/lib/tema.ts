// Tema claro/escuro. A decisão R1 (layout.tsx) aposentou o tema salvo antigo
// e devolveu o claro como padrão de todos. O alternador volta a pedido do
// Théo (19/10/2026), mas escreve numa chave NOVA (`.v2`): nenhum valor órfão
// de visita antiga ressuscita — que era exatamente o risco que motivou a R1.

export const CHAVE_TEMA = "sesi.tema.v2";

export type Tema = "light" | "dark";

// Roda inline no <head>, antes do primeiro paint: quem já escolheu o escuro
// não vê o claro piscar. Server-safe (só monta a string).
export function scriptTemaSalvo(): string {
  return `try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}`;
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema;
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // Storage bloqueado (modo privacidade etc.): o tema vale só para a sessão.
  }
}

type TransicaoDeView = { ready: Promise<void> };
type DocumentoComTransicao = Document & {
  startViewTransition?: (atualizar: () => void) => TransicaoDeView;
};

// A tinta: o snapshot do NOVO tema cresce num círculo a partir do clique e
// cobre a tela (View Transitions API, baseline desde 10/2025). Sem a API,
// com menos movimento pedido, ou se o `ready` falhar: troca direta, sem efeito.
export function alternarTemaComTinta(ev: { clientX: number; clientY: number }): void {
  const destino: Tema =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";

  const iniciar = (document as DocumentoComTransicao).startViewTransition;
  if (
    typeof iniciar !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    aplicarTema(destino);
    return;
  }

  const x = ev.clientX;
  const y = ev.clientY;
  const raio = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transicao = iniciar.call(document, () => aplicarTema(destino));
  transicao.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${raio}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});
}
