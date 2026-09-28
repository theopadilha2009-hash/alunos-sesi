/**
 * O tom do resultado da importação de planilha.
 *
 * O `Estado` do painel é binário (`ok: boolean`), e a importação tem três
 * desfechos, não dois. Reimportar a mesma planilha quando está tudo lá — o que
 * o professor faz para conferir — não muda nada e não é erro, mas com dois
 * valores caía em "erro" e pintava o banner de vermelho, com a mensagem "12 já
 * estavam completos". Quem lê isso entende que a importação falhou e vai
 * mexer na planilha ou abrir chamado.
 *
 * Módulo folha (sem import) de propósito: é a decisão pura, testada em
 * `tests/importacao.test.mjs`.
 */

export type TomImportacao = "sucesso" | "atencao" | "erro";

export type ContagemImportacao = {
  criados: number;
  atualizados: number;
  erros: number;
};

export function tomDaImportacao(contagem: ContagemImportacao): TomImportacao {
  const mudou = contagem.criados + contagem.atualizados > 0;

  // Nada entrou e há linha recusada: falhou de verdade.
  if (!mudou) return contagem.erros > 0 ? "erro" : "atencao";

  // Entrou gente, mas alguma linha foi recusada — verde puro esconderia o aviso,
  // que aparece listado logo abaixo do banner.
  return contagem.erros > 0 ? "atencao" : "sucesso";
}
