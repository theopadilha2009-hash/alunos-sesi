import type { AlunoNaTela } from "./tipos.ts";

/**
 * A identidade que aparece nos documentos do aluno — a matrícula do crachá, do
 * currículo impresso e da página `/validar/<slug>`.
 *
 * Antes desta função havia TRÊS fórmulas, em quatro telas, e elas discordavam:
 *
 * | Onde | Fórmula |
 * |---|---|
 * | `CrachaModal` | `SESI-{slug:10}-{estrelas:2}` |
 * | `exportar-cracha` | `SESI-{slug:12}-{estrelas:2}` |
 * | `CurriculoImpressao`, `validar/[slug]` | `SESI-SC-JVE-{slug:8}-{estrelas+26:4}` |
 *
 * As duas primeiras são a mesma ideia com recortes diferentes do slug — ou seja,
 * **o crachá na tela e o PNG baixado do mesmo crachá mostravam números
 * diferentes**. É o tipo de divergência que ninguém reporta como bug, porque
 * cada tela parece plausível sozinha.
 *
 * Pior: nas três, o número vinha de `estrelas`. A matrícula do aluno **mudava
 * quando um colega dava uma estrela no perfil dele** — e ela é impressa em
 * documento que vai para a secretaria e para a casa do aluno.
 *
 * Aqui a série sai do `id`, que não muda nunca. Isto é uma correção, não uma
 * migração: nenhuma matrícula está persistida em lugar nenhum, então não há
 * valor antigo a preservar — o que existe é a divergência, e ela acaba aqui.
 *
 * IMPORTANTE: este módulo é PURO de propósito. Três dos quatro consumidores são
 * client components (`CrachaModal`, `CurriculoImpressao`, `exportar-cracha`),
 * e o crachá é desenhado no canvas do navegador. Importar `node:crypto` aqui
 * quebraria o build do cliente. O HMAC fica em `integridade.ts`, que só o
 * servidor importa.
 */

/** Prefixo institucional. `SC` = Santa Catarina; `JVE` = Joinville. */
const PREFIXO = "SESI-SC-JVE";

/**
 * FNV-1a de 32 bits, só para espalhar o UUID num número curto.
 *
 * Não é hash criptográfico e não precisa ser: a série é um rótulo legível, não
 * uma defesa. Quem prova integridade é `codigoDeIntegridade`, com HMAC.
 */
function espalhar(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Quatro dígitos, de 1000 a 9999 — nunca começa com zero. */
function serieDe(id: string): string {
  return String((espalhar(id) % 9000) + 1000);
}

/** O slug sem hífen, maiúsculo, cortado — é a parte legível da matrícula. */
function codigoDoNome(slug: string): string {
  return slug
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

/**
 * A matrícula do aluno: `SESI-SC-JVE-THEOPADILHA-4821`.
 *
 * Determinística e estável: mesmo aluno, mesma matrícula, em qualquer tela e
 * em qualquer build. Depende só de `id` e `slug`, os dois campos que não mudam
 * quando o aluno edita o perfil.
 *
 * atalho: a matrícula ainda é DERIVADA, não atribuída — o número não vem de
 * lugar nenhum, é inventado de forma determinística. Enquanto for assim, a
 * página `/validar/<slug>` não pode afirmar que ele consta na secretaria.
 * Revisitar quando `alunos.matricula` existir (segundo passo da aposta 4).
 */
export function matriculaDe(aluno: Pick<AlunoNaTela, "id" | "slug">): string {
  return `${PREFIXO}-${codigoDoNome(aluno.slug)}-${serieDe(aluno.id)}`;
}
