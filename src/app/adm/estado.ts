import type { ErroLinha } from "@/lib/importar";

/**
 * O retorno das ações do painel.
 *
 * Mora fora do `acoes.ts` porque num arquivo `"use server"` TODO export
 * precisa ser função async — um objeto ou um tipo exportado de lá quebra o
 * build.
 */
export type Estado = {
  ok: boolean;
  mensagem: string;
  erros?: ErroLinha[];
};

export const ESTADO_INICIAL: Estado = { ok: false, mensagem: "" };
