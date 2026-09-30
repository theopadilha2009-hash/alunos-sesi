import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * O gate de moderação de cadastro: `alunos.aprovado`.
 *
 * **Por que este arquivo existe.** Em 30/09/2026 um lote de oito commits foi
 * direto para a `main`, sem PR e sem revisão, e removeu o gate inteiro — o
 * `aprovado: false` do auto-cadastro e o `.eq("aprovado", true)` da listagem.
 * Não havia RLS para segurar: a policy `alunos_leitura` é `using (true)`
 * (`001_schema.sql:137`), então o app era a única barreira. O efeito era um
 * cadastro anônimo ganhando perfil público, e `/validar/<slug>` emitindo
 * "MATRÍCULA VALIDADA · ESTUDANTE ATIVO" para quem nunca passou por moderação.
 *
 * Nada pegou aquilo. Os testes do repo são de funções puras e não há teste de
 * integração com Supabase; o `tsc` não distingue uma query filtrada de uma sem
 * filtro; e o commit não passou por revisão. Este arquivo cobre essa lacuna.
 *
 * **O que ele é, e o que não é.** É um arame farpado, não uma prova: afirma que
 * as guardas estão *escritas*, não que elas funcionam contra o banco — provar
 * comportamento exigiria Supabase, que é exatamente o que não existe aqui. Ele
 * pega a regressão que de fato aconteceu (alguém apagando a linha) e não pegaria
 * um gate invertido por outra via. Quando algum destes testes quebrar, a
 * pergunta certa não é "como faço o teste passar", é "o gate sumiu de verdade?".
 *
 * **A direção importa.** Como em `classes-css.test.mjs`, o teste olha o código
 * que chega na tela. Um gate que desaparece não quebra nada visível — ele só
 * deixa de esconder, e o silêncio é o sintoma. Por isso as asserções são de
 * presença.
 */

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * O código sem os comentários.
 *
 * Sem isto a varredura se engana sozinha: o próprio comentário que explica o gate
 * cita `.eq("aprovado", true)` e `aprovado: false`, então um `includes` cru
 * continuaria verde depois de a linha de verdade ser apagada.
 */
function semComentarios(fonte) {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // O `[^:]` antes de `//` poupa as URLs (`https://`), que são o único `//`
    // que aparece dentro de string neste código.
    .replace(/([^:])\/\/[^\n]*/g, "$1");
}

function ler(caminho) {
  return semComentarios(readFileSync(join(RAIZ, caminho), "utf8"));
}

/**
 * O trecho de `function <nome>(` até a próxima declaração de topo.
 *
 * A asserção tem que ser sobre a função, não sobre o arquivo: `dados.ts` tem
 * dezenas de queries, e um `.eq("aprovado", true)` em qualquer canto passaria
 * mesmo com `listarAlunos` sem filtro nenhum.
 */
function corpoDaFuncao(fonte, nome) {
  const inicio = fonte.indexOf(`function ${nome}(`);
  assert.notEqual(
    inicio,
    -1,
    `\`${nome}\` não existe mais em ${"fonte"}. Se você renomeou, atualize este teste — ` +
      "ele é o único que guarda o gate de moderação.",
  );
  const resto = fonte.slice(inicio);
  const fim = resto.indexOf("\nexport ", 1);
  return fim === -1 ? resto : resto.slice(0, fim);
}

test("resolverAluno devolve o aprovado do banco — não um true fixo", () => {
  // Foi uma linha assim que abriu o buraco: `aprovado: true` no objeto devolvido
  // fazia todo aluno passar por aprovado, e o filtro da query virava decoração.
  const corpo = corpoDaFuncao(ler("src/lib/dados.ts"), "resolverAluno");
  assert.doesNotMatch(
    corpo,
    /aprovado\s*:/,
    "`resolverAluno` voltou a forçar `aprovado`. O valor tem que vir da coluna.",
  );
});

test("listarAlunos filtra por aprovado quando não pede os pendentes", () => {
  const corpo = corpoDaFuncao(ler("src/lib/dados.ts"), "listarAlunos");
  assert.match(corpo, /incluirPendentes/, "sumiu o parâmetro que abre a fila do ADM");
  assert.match(
    corpo,
    /\.eq\(\s*"aprovado"\s*,\s*true\s*\)/,
    "sem este filtro a vitrine publica quem ainda não passou pela moderação — não há RLS que segure.",
  );
});

test("o auto-cadastro nasce pendente", () => {
  const corpo = corpoDaFuncao(ler("src/lib/auth.ts"), "registrarUsuario");
  assert.match(
    corpo,
    /aprovado\s*:\s*false/,
    "`registrarUsuario` precisa gravar `aprovado: false`: aprovar é ato do ADM, não do cadastro.",
  );
});

test("as páginas de perfil não entregam quem é pendente", () => {
  const paginas = [
    "src/app/alunos/[slug]/page.tsx",
    "src/app/u/[slug]/page.tsx",
    "src/app/validar/[slug]/page.tsx",
  ];
  for (const pagina of paginas) {
    // Cada uma checa duas vezes: no `generateMetadata` e no corpo. A primeira
    // importa porque sem ela o `<title>` vaza o nome antes de a página dar 404.
    const ocorrencias = ler(pagina).match(/!aluno\.aprovado/g)?.length ?? 0;
    assert.ok(
      ocorrencias >= 2,
      `${pagina} tem ${ocorrencias} guarda(s) de \`!aluno.aprovado\`; precisa de 2 (generateMetadata e corpo).`,
    );
  }
});

test("/api/estrela barra o voto e a remoção em perfil não aprovado", () => {
  const fonte = ler("src/app/api/estrela/route.ts");
  const portas = fonte.match(/await alunoVisivel\(/g)?.length ?? 0;
  assert.equal(
    portas,
    2,
    "POST e DELETE precisam passar por `alunoVisivel` — com a porta só no POST, o DELETE devolvia a contagem de estrelas de um perfil que o POST responderia 404.",
  );
});

test("o endosso não aceita perfil que ainda não é público", () => {
  const corpo = corpoDaFuncao(ler("src/lib/dados.ts"), "apoiarHabilidade");
  assert.match(
    corpo,
    /aprovado\s*!==\s*true/,
    "`apoiarHabilidade` precisa conferir a moderação: o `alunoId` vem do cliente, e o apoio dado hoje apareceria pronto se o ADM aprovasse depois.",
  );
});
