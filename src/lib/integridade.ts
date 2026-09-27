import { assinar } from "./sessao.ts";
import type { AlunoNaTela } from "./tipos.ts";

/**
 * O código de integridade do documento — o que o rodapé de `/validar/<slug>`
 * chama de "HASH CRIPTOGRÁFICO DE INTEGRIDADE (SHA-256)".
 *
 * O que havia antes era `aluno.id` sem hífens, cortado em 32 caracteres. Isso
 * não é um hash: é o próprio identificador do aluno, exibido cru. Como o
 * `<h1>` da mesma página já mostra o nome, e o nome pode ser editado pelo
 * aluno, o código **não mudava quando o nome mudava** — um selo de integridade
 * que não reage à única coisa que ele deveria proteger.
 *
 * Aqui ele vira HMAC dos campos que identificam o aluno, com a chave mestra do
 * app (`SESSAO_SEGREDO`, via HKDF com o propósito `documento`). Duas
 * consequências: mudar o nome muda o código, e ninguém consegue forjá-lo sem a
 * chave — o que um `sha256(nome)` público não daria.
 *
 * SÓ RODA NO SERVIDOR: `sessao.ts` importa `node:crypto`. O único consumidor
 * hoje é `validar/[slug]/page.tsx`, que é Server Component. Se algum dia o
 * crachá precisar exibir isto, o valor tem que chegar por prop — importar este
 * módulo num `"use client"` quebra o build, porque `node:crypto` não existe no
 * navegador. A matrícula, que o cliente precisa, mora em `identidade.ts`, puro.
 */
export function codigoDeIntegridade(
  aluno: Pick<AlunoNaTela, "id" | "slug" | "nome">,
): string {
  const base = [aluno.id, aluno.slug, aluno.nome].join("|");
  const assinado = assinar(base, "documento");
  // `assinar` devolve `valor.hex`; a assinatura é o que vem depois do último
  // ponto. (O `valor` aqui é a própria base, e ela contém `|`, não `.`.)
  const hex = assinado.slice(assinado.lastIndexOf(".") + 1);
  return hex.toUpperCase().slice(0, 32);
}
