"use client";

import { useEffect, useState } from "react";
import { IconeLua, IconeSol } from "@/components/Icones";
import { aplicarTema, ehTema, lerTemaSalvo, salvarTema, type Tema } from "@/lib/tema";

/** Alternador minimalista de tema (somente botão de ícone SVG, sem emoji nem texto) */
export function TemaToggle({ compacto = true }: { compacto?: boolean }) {
  const [tema, setTema] = useState<Tema>("dark");

  useEffect(() => {
    const salvo = lerTemaSalvo();
    if (salvo) {
      setTema(salvo);
      aplicarTema(salvo);
      return;
    }
    const atual = document.documentElement.dataset.theme;
    if (ehTema(atual)) setTema(atual);
  }, []);

  function alternar() {
    const proximo: Tema = tema === "dark" ? "light" : "dark";
    setTema(proximo);
    aplicarTema(proximo);
    salvarTema(proximo);
  }

  return (
    <button
      type="button"
      className="botao-tema-icone"
      onClick={alternar}
      aria-label={tema === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
      title={tema === "dark" ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
    >
      {tema === "dark" ? <IconeSol tamanho={18} /> : <IconeLua tamanho={18} />}
    </button>
  );
}

