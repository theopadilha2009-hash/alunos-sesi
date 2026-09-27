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

/**
 * O retorno da emissão do código de ativação.
 *
 * O `codigo` só existe NESTA resposta — é a única vez que ele aparece em claro,
 * porque o banco guarda o SHA-256. Se o ADM perder a tela, emite outro.
 */
export type EstadoCodigo = Estado & {
  codigo?: string;
  /** Nome do aluno, para o ADM não confundir o código com o de outra linha. */
  paraQuem?: string;
};

export const ESTADO_CODIGO_INICIAL: EstadoCodigo = { ok: false, mensagem: "" };
