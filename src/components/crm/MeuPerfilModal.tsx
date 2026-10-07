"use client";

import { useEffect, useRef } from "react";
import { PaginaMeuPerfil } from "@/components/crm/PaginaMeuPerfil";
import { useTravaDeFoco } from "@/lib/foco";
import type { AlunoNaTela, UsuarioSessao } from "@/lib/tipos";

type Props = {
  usuario: UsuarioSessao;
  alunoAtual: AlunoNaTela | null;
  salas: { id: string; nome: string }[];
  onFechar: () => void;
  onAtualizarAluno?: (dados: Partial<AlunoNaTela>) => void;
};

/**
 * O editor "Meu Perfil" como JANELA, não como aba do CRM.
 *
 * A anotação p5 do PDF: "clicando no meu perfil ele abre como se fosse uma
 * janela nova onde tudo fica mais bem distribuído, pois o meu perfil tem muita
 * poluição visual, e isso deveria ser rápido". Como aba, o editor dividia a
 * tela com a sidebar e a moldura do header, e o conteúdo denso (hero, 6 abas,
 * barra de salvar) ficava espremido. Aqui ele ganha a tela toda numa caixa
 * própria, com largura para as duas colunas respirarem.
 *
 * A `PaginaMeuPerfil` continua sendo quem edita — este wrapper só a veste. A
 * moldura de página (breadcrumb + botões de ação) morava nela e saiu: dentro de
 * uma janela ela era ruído. O "Ver Crachá", o currículo e os links públicos
 * agora vivem nas próprias abas, onde o aluno já está olhando.
 */
export function MeuPerfilModal({
  usuario,
  alunoAtual,
  salas,
  onFechar,
  onAtualizarAluno,
}: Props) {
  const janelaRef = useRef<HTMLDivElement>(null);
  useTravaDeFoco(janelaRef);

  // Callback lido de dentro do listener via ref: sem isso o efeito dependeria
  // de `onFechar`, que é uma função nova a cada render do CRM — o efeito
  // re-rodaria e o `focus()` roubaria o foco a cada digitação.
  const fecharRef = useRef(onFechar);
  useEffect(() => {
    fecharRef.current = onFechar;
  });

  useEffect(() => {
    const focoAnterior = document.activeElement as HTMLElement | null;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Diálogo dentro do diálogo (crachá, mini-currículo, recorte de banner):
      // o ESC é do de cima. Mesma saída do `useTravaDeFoco`, para o ESC não
      // fechar os dois de uma vez.
      const dono = (e.target as HTMLElement | null)?.closest?.('[role="dialog"]');
      if (dono && dono !== janelaRef.current) return;
      fecharRef.current();
    }

    document.addEventListener("keydown", aoTeclar);
    janelaRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      focoAnterior?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop modal-meu-perfil" onClick={onFechar}>
      <div
        className="meu-perfil-janela"
        role="dialog"
        aria-modal="true"
        aria-label="Meu Perfil & Portfólio Pessoal"
        tabIndex={-1}
        ref={janelaRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="drawer-fechar meu-perfil-fechar"
          onClick={onFechar}
          aria-label="Fechar Meu Perfil"
          title="Fechar"
        >
          ✕
        </button>

        {/* O scroll fica num filho, e não na própria janela: assim o botão de
            fechar (irmão, absoluto) não rola junto com o conteúdo. */}
        <div className="meu-perfil-scroll">
          <PaginaMeuPerfil
            usuario={usuario}
            alunoAtual={alunoAtual}
            salas={salas}
            onAtualizarAluno={onAtualizarAluno}
          />
        </div>
      </div>
    </div>
  );
}
