"use client";

import { useLayoutEffect } from "react";
import { aplicarTema } from "@/lib/tema";

/**
 * Reafirma o tema salvo depois da hidratação.
 *
 * O script inline do layout aplica o tema ANTES da primeira pintura, mas o
 * React renderiza `<html data-theme="dark">` e, em dev, o StrictMode remonta
 * a árvore inteira — qualquer recomite do HTML raiz pode reescrever o
 * atributo com o valor do JSX e derrubar o `theme-color` da barra do PWA
 * (que só o `aplicarTema` sincroniza). Este componente não renderiza nada:
 * no primeiro layout effect, lê o `data-theme` que está NO DOM (fonte da
 * verdade pós-script) e o devolve pelo `aplicarTema`. Idempotente em prod,
 * corretivo no caso do script ter corrido sem o React ver.
 */
export function TemaHidratacao() {
  useLayoutEffect(() => {
    const tema = document.documentElement.dataset.theme;
    if (tema === "light" || tema === "dark") aplicarTema(tema);
  }, []);

  return null;
}
