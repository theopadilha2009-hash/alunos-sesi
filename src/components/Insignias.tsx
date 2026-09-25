import type { ReactNode } from "react";
import { insigniasDe, type IconeInsignia, type PlacarDoAluno } from "@/lib/insignias";

/**
 * As insígnias do aluno, com o quanto falta em cada uma.
 *
 * Mostra as seis mesmo quando o aluno não tem nenhuma, de propósito: caixa
 * fechada com a barra andando é o que faz alguém voltar ao perfil. Mostrar só as
 * conquistadas transformaria a conquista em sorte para quem já tem e em nada
 * para quem não tem.
 *
 * Os desenhos são daqui, e não do catálogo de `icones.tsx`, porque o selo é a
 * parte que o aluno mostra: seis conquistas diferentes precisam de seis caras
 * diferentes. Reusar um ícone de interface em duas deixaria "Polivalente" e
 * "Referência Técnica" idênticas.
 */

type PropsSvg = { children: ReactNode };

function Selo({ children }: PropsSvg) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const DESENHO: Record<IconeInsignia, ReactNode> = {
  estrela: (
    <Selo>
      <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z" />
    </Selo>
  ),
  pessoas: (
    <Selo>
      <circle cx="9" cy="8" r="3.1" />
      <path d="M3.4 19.6a5.6 5.6 0 0 1 11.2 0" />
      <path d="M16.1 5.6a2.7 2.7 0 0 1 0 5.3" />
      <path d="M17.3 14.3a5.6 5.6 0 0 1 3.3 5.1" />
    </Selo>
  ),
  brilho: (
    <Selo>
      <path d="M11 4.6l1.6 4.3 4.3 1.6-4.3 1.6L11 16.4 9.4 12.1 5.1 10.5l4.3-1.6z" />
      <path d="M17.6 15.4l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </Selo>
  ),
  camadas: (
    <Selo>
      <path d="M12 3.8 3.6 8.2 12 12.6l8.4-4.4z" />
      <path d="M3.6 12.4 12 16.8l8.4-4.4" />
      <path d="M3.6 16.4 12 20.8l8.4-4.4" />
    </Selo>
  ),
  medalha: (
    <Selo>
      <path d="M8.4 3.4 6.2 7.8M15.6 3.4l2.2 4.4" />
      <circle cx="12" cy="14.4" r="5.2" />
      <path d="M12 11.9l.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z" />
    </Selo>
  ),
  trofeu: (
    <Selo>
      <path d="M8.2 4h7.6v4.4a3.8 3.8 0 0 1-7.6 0z" />
      <path d="M8.2 5.2H5.6a2.6 2.6 0 0 0 2.6 4.2" />
      <path d="M15.8 5.2h2.6a2.6 2.6 0 0 1-2.6 4.2" />
      <path d="M12 12.2V16M8.4 19.8h7.2" />
    </Selo>
  ),
};

export function Insignias({
  placar,
  compacto = false,
}: {
  placar: PlacarDoAluno;
  /** Só as conquistadas, em faixa: para dentro do editor e de cartão. */
  compacto?: boolean;
}) {
  const lista = insigniasDe(placar);

  if (compacto) {
    const ganhas = lista.filter((i) => i.conquistada);
    if (ganhas.length === 0) {
      return (
        <p className="insignias-vazio">
          Nenhuma insígnia ainda. Elas vêm das estrelas e dos endossos dos colegas — não se
          escolhe ter.
        </p>
      );
    }
    return (
      <ul className="insignias-faixa">
        {ganhas.map((i) => (
          <li key={i.id} className="insignia-chip" title={i.descricao}>
            {DESENHO[i.icone]}
            <span>{i.nome}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="insignias-grade">
      {lista.map((i) => {
        const ganha = i.conquistada;
        return (
          <li key={i.id} className={`insignia ${ganha ? "insignia-ganha" : "insignia-bloqueada"}`}>
            <span className="insignia-selo">{DESENHO[i.icone]}</span>
            <strong className="insignia-nome">{i.nome}</strong>
            <p className="insignia-descricao">{i.descricao}</p>
            {ganha ? (
              <span className="insignia-status">Conquistada</span>
            ) : (
              <div className="insignia-progresso">
                <div
                  className="insignia-barra"
                  style={{ width: `${(i.progresso.atual / i.progresso.alvo) * 100}%` }}
                />
                <span className="insignia-contagem">
                  {i.progresso.atual}/{i.progresso.alvo}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
