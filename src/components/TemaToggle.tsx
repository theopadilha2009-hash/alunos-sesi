"use client";

import { useEffect, useState } from "react";

const CHAVE = "sesi.tema";

/** Escuro é o padrão; o botão só grava a escolha por cima. */
export function TemaToggle() {
  const [tema, setTema] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === "light" || salvo === "dark") setTema(salvo);
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
      className="botao-tema"
      onClick={alternar}
      aria-label={tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={tema === "dark" ? "Tema claro" : "Tema escuro"}
    >
      {tema === "dark" ? "☀" : "☾"}
    </button>
  );
}
