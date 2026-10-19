"use client";

import { IconeLua, IconeSol } from "@/components/Icones";
import { alternarTemaComTinta } from "@/lib/tema";

// O alternador que a decisão R1 aposentou, de volta (pedido do Théo,
// 19/10/2026). O ícone mostrado é o tema de DESTINO — lua no claro, sol no
// escuro — decidido por CSS via [data-theme]: zero estado React, zero
// mismatch de hidratação.
export function AlternadorTema({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={`alternador-tema ${className}`.trim()}
      onClick={alternarTemaComTinta}
      title="Alternar modo claro/escuro"
      aria-label="Alternar entre modo claro e escuro"
    >
      <IconeSol tamanho={16} className="alternador-tema-sol" />
      <IconeLua tamanho={16} className="alternador-tema-lua" />
    </button>
  );
}
