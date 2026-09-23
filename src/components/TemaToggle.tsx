"use client";

import { useEffect, useState } from "react";

const CHAVE = "sesi.tema";

/** Escuro é o padrão; o botão só grava a escolha por cima. */
export function TemaToggle({ compacto = false }: { compacto?: boolean }) {
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
      className={`botao-tema ${compacto ? "botao-tema-compacto" : ""}`}
      onClick={alternar}
      aria-label={tema === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
      title={tema === "dark" ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
    >
      <span className="tema-icone" aria-hidden="true">
        {tema === "dark" ? "☀️" : "🌙"}
      </span>
      {!compacto ? (
        <span className="tema-texto">
          {tema === "dark" ? "Modo Claro" : "Modo Escuro"}
        </span>
      ) : null}
    </button>
  );
}
