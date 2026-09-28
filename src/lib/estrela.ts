/**
 * A resposta de `/api/estrela`, traduzida para a tela.
 *
 * A rota responde de três jeitos: voto gravado (200 com `estrelas` e `votado`),
 * recusa explicada (400/404/429 com `erro`) e falha crua (500). Quem chama
 * precisa distinguir "o servidor decidiu" de "não deu" — e o CRM tratava os
 * dois como "desfaz e cala": o aluno via o confete e o número voltando ao que
 * era, sem uma palavra. Foi assim que "dei a estrela e não aconteceu nada"
 * chegou como bug de estrela, quando o problema era a resposta não lida.
 */

export type RespostaEstrela =
  | { ok: true; estrelas: number; votado: boolean }
  | { ok: false; motivo: string };

const RECUSA_PADRAO = "Não deu para votar agora. Tente de novo.";

export function lerRespostaEstrela(
  status: number,
  corpo: unknown,
): RespostaEstrela {
  const dados = (corpo ?? {}) as {
    estrelas?: unknown;
    votado?: unknown;
    erro?: unknown;
  };

  // 200 sem os campos é resposta quebrada, não voto gravado: quem confirma o
  // número é o servidor, e aceitar um corpo vazio deixaria a tela mostrando um
  // contador que ninguém calculou.
  if (
    status >= 200 &&
    status < 300 &&
    typeof dados.estrelas === "number" &&
    typeof dados.votado === "boolean"
  ) {
    return { ok: true, estrelas: dados.estrelas, votado: dados.votado };
  }

  return {
    ok: false,
    motivo:
      typeof dados.erro === "string" && dados.erro ? dados.erro : RECUSA_PADRAO,
  };
}

/**
 * Por que a estrela não é oferecida para este aluno — ou `null`, se é.
 *
 * Perfil pendente não recebe estrela (é a mesma regra que faz `/alunos/[slug]`
 * devolver 404 para ele), e quem recusa de verdade é a rota. Só que o ADM
 * enxerga os pendentes na tabela do CRM, então sem esta checagem ele ganha um
 * botão que a API vai recusar sempre — foi exatamente o clique do Théo no
 * Arthur. A regra aparece aqui para a tela não precisar saber dela, e para o
 * motivo poder ser escrito uma vez só.
 */
export function motivoParaNaoEstrelar(aluno: {
  aprovado: boolean;
}): string | null {
  if (aluno.aprovado === false) {
    return "Aguardando aprovação: perfil pendente não recebe estrela.";
  }
  return null;
}
