import { IconeConstrucao } from "@/components/Icones";
import { LogoSesi } from "@/components/Roseta";

/**
 * Aba "Em construção" — o espaço reservado do SESI para o que ainda não existe.
 *
 * Duas coisas que este componente precisa garantir, e que valem o comentário:
 *
 * 1. **Nunca é um limbo.** O Théo foi explícito: "não um limbo aleatório que não
 *    tem como sair". A saída daqui é um clique visível — o botão volta ao
 *    Portfólio, que também está na sidebar ao lado.
 * 2. **A marca aparece.** A anotação da p.10 do PDF era justamente "o SESI" —
 *    sem o logo, a tela vira uma página de erro genérica. A logo vem do
 *    `LogoSesi`, que já monta o par claro/escuro (branca no dark, colorida no
 *    light) — não duplicar esse PNG aqui.
 */
export function PaginaEmConstrucao({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="construcao-tela">
      <div className="construcao-cartao">
        <span className="construcao-selo">
          <IconeConstrucao tamanho={14} />
          Espaço reservado
        </span>

        <LogoSesi tamanho={64} className="construcao-logo" />

        <h2 className="construcao-titulo">Ainda em construção</h2>
        <p className="construcao-texto">
          Esta área está sendo preparada pelo SESI. Assim que estiver pronta, ela aparece aqui no
          mesmo lugar do menu.
        </p>

        <div className="construcao-fita" aria-hidden="true" />

        <div className="construcao-acoes">
          <button type="button" className="construcao-btn" onClick={onVoltar}>
            ← Voltar ao Portfólio
          </button>
        </div>
      </div>
    </div>
  );
}
