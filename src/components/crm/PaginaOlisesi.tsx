import { IconeTrofeu } from "@/components/Icones";
import { LogoSesi } from "@/components/Roseta";
import { CORES_SALA } from "@/lib/cores";

/**
 * Aba "Olimpíadas SESI" — a capa do evento.
 *
 * Substitui o antigo espaço reservado "Em construção" (anotação p10 do PDF:
 * "criara aba ainda em construcao olisesi"). O Théo decidiu nesta sessão: só a
 * CAPA do evento por enquanto — placar e detalhes ficam para depois, e nada de
 * conteúdo inventado (modalidades, datas) enquanto ele não passar.
 *
 * Três coisas que este componente precisa garantir:
 *
 * 1. **Nunca é um limbo.** A saída daqui é um clique visível — o botão volta ao
 *    Portfólio, que também está na sidebar ao lado.
 * 2. **A marca aparece, e é a oficial.** A roseta sai do `LogoSesi` com
 *    `iconeApenas` — o mesmo símbolo que o Théo mandou, e que o componente já
 *    troca por tema (branca no dark, colorida no light). Não duplicar PNG.
 * 3. **Token-first.** No claro veste os tokens do `tokens.css` e no escuro os
 *    mesmos, sem bloco light próprio — igual à tela que esta substitui. As
 *    faixas decorativas usam `corDaSala`, então cada turma tem a sua cor
 *    determinística, sem hex solto.
 */
export function PaginaOlisesi({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="olisesi-tela">
      <div className="olisesi-cartao">
        <div className="olisesi-faixas" aria-hidden="true">
          {CORES_SALA.map((cor) => (
            <span key={cor} style={{ ["--sala" as string]: cor }} />
          ))}
        </div>

        <span className="olisesi-selo">
          <IconeTrofeu tamanho={14} />
          Competição entre as turmas
        </span>

        <LogoSesi tamanho={72} iconeApenas className="olisesi-logo" />

        <h2 className="olisesi-titulo">OLISESI</h2>
        <p className="olisesi-subtitulo">Olimpíadas SESI · Escola SESI</p>

        <p className="olisesi-texto">
          A olimpíada do conhecimento das turmas do SESI. Aqui as salas medem força,
          somam pontos e disputam o pódio ao longo do ano. A competição está sendo
          preparada — assim que começar, o placar aparece neste espaço.
        </p>

        <div className="olisesi-acoes">
          <button type="button" className="olisesi-btn" onClick={onVoltar}>
            ← Voltar ao Portfólio
          </button>
        </div>
      </div>
    </div>
  );
}
