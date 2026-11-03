"use client";

import { useEffect, useState } from "react";
import { IconeSom, IconeSomMudo } from "@/components/Icones";
import { definirSom, somLigado, tocarSomEstrela } from "@/lib/som";

// O silenciar do som morava só dentro do perfil público, mas quem toca som é
// também a vitrine e o CRM (estrela + confete). Regra da skill: "som sempre
// com o botão de silenciar no topo". Fica ao lado do AlternadorTema em todo
// shell que dispara efeito.
export function BotaoSom({ className = "" }: { className?: string }) {
  // Nasce silencioso no servidor: o localStorage só existe no cliente. Ao
  // montar ele se corrige; como o ícone é o único sinal visual, o pisca dura
  // um quadro e não promete nada diferente antes do primeiro gesto.
  const [comSom, setComSom] = useState(true);

  useEffect(() => {
    setComSom(somLigado());
  }, []);

  function alternar() {
    const proximo = !comSom;
    definirSom(proximo);
    setComSom(proximo);
    // O clique que religa precisa soar: é a confirmação do que a pessoa pediu.
    if (proximo) tocarSomEstrela();
  }

  return (
    <button
      type="button"
      className={`botao-som-toggle ${className}`.trim()}
      onClick={alternar}
      title={
        comSom
          ? "Efeitos sonoros e confetes ativos (clique para silenciar)"
          : "Efeitos sonoros e confetes desativados (clique para ativar)"
      }
      aria-label={comSom ? "Silenciar sons" : "Ligar sons"}
      aria-pressed={!comSom}
    >
      {comSom ? <IconeSom tamanho={15} /> : <IconeSomMudo tamanho={15} />}
    </button>
  );
}