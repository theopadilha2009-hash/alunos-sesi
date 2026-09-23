"use client";

import { useEffect, useState } from "react";
import { IconeLua, IconeSol } from "@/components/Icones";

const CHAVE = "sesi.tema";

/** Alternador minimalista de tema (somente botão de ícone SVG, sem emoji nem texto) */
export function TemaToggle({ compacto = true }: { compacto?: boolean }) {
  const [tema, setTema] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo === "light" || salvo === "dark") {
        setTema(salvo);
        document.documentElement.dataset.theme = salvo;
        return;
      }
    } catch {}
    const atual = document.documentElement.dataset.theme;
    if (atual === "light" || atual === "dark") {
      setTema(atual);
    }
  }, []);

  function alternar() {
    const proximo = tema === "dark" ? "light" : "dark";
    setTema(proximo);
    document.documentElement.dataset.theme = proximo;
    try {
      localStorage.setItem(CHAVE, proximo);
    } catch {
      // modo privado sem storage: o tema vale só nesta navegação
    }
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

