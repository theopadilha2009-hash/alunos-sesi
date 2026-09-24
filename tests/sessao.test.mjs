import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import {
  COOKIE_ADM,
  COOKIE_VISITANTE,
  abrirAssinado,
  assinar,
  chaveValida,
  crachaAdm,
  crachaValido,
  novoVisitante,
  opcoesCookie,
  segredo,
} from "../src/lib/sessao.ts";

/**
 * O segredo é lido na hora da chamada, não na importação, então dá para
 * fixar aqui antes do primeiro teste rodar.
 */
const MESTRE = "segredo-mestre-de-teste";
const CHAVE_DO_LINK = "chave-do-link-de-teste";
process.env.SESSAO_SEGREDO = MESTRE;
process.env.ADM_CHAVE = CHAVE_DO_LINK;

const PROPÓSITOS = ["visitante", "adm", "usuario"];

test("ida e volta dentro do mesmo proposito", () => {
  for (const p of PROPÓSITOS) {
    assert.equal(abrirAssinado(assinar("corpo", p), p), "corpo");
  }
});

test("assinatura de um proposito NAO abre em outro", () => {
  // Esta é a asserção que justifica a refatoração: antes os três cookies
  // dividiam o mesmo HMAC, então um crachá de ADM se reproduzia como token de
  // sessão. Agora cada domínio tem a sua subchave HKDF.
  for (const origem of PROPÓSITOS) {
    const token = assinar("corpo", origem);
    for (const destino of PROPÓSITOS) {
      if (destino === origem) continue;
      assert.equal(abrirAssinado(token, destino), null, `${origem} vazou para ${destino}`);
    }
  }
});

test("ADM_CHAVE nao forja mais sessao de usuario", () => {
  // Exatamente o ataque que a B1 fecha: a chave do link /adm/<chave> passava
  // por log de acesso e histórico de navegador, e como o `role` viaja DENTRO
  // do token assinado, quem a tivesse montava uma sessão `super_adm`.
  const corpo = Buffer.from('{"username":"theo1234","role":"super_adm"}').toString("base64url");
  const esquemaAntigo = `${corpo}.${createHmac("sha256", CHAVE_DO_LINK).update(corpo).digest("hex")}`;

  for (const p of PROPÓSITOS) {
    assert.equal(abrirAssinado(esquemaAntigo, p), null);
  }
});

test("cracha do painel so vale como cracha", () => {
  const cracha = crachaAdm();
  assert.equal(crachaValido(cracha), true);
  assert.equal(abrirAssinado(cracha, "adm"), "adm-v1");

  // Mesmo corpo, outro domínio: o crachá perde a validade.
  assert.equal(crachaValido(assinar("adm-v1", "usuario")), false);
  assert.equal(crachaValido(assinar("adm-v1", "visitante")), false);
  assert.equal(crachaValido(null), false);
  assert.equal(crachaValido(undefined), false);
  assert.equal(crachaValido(""), false);
});

test("token adulterado em qualquer byte nao abre", () => {
  const token = assinar("corpo-do-token", "usuario");

  const corpoMexido = `X${token.slice(1)}`;
  assert.equal(abrirAssinado(corpoMexido, "usuario"), null);

  const assinaturaMexida = `${token.slice(0, -1)}${token.at(-1) === "a" ? "b" : "a"}`;
  assert.equal(abrirAssinado(assinaturaMexida, "usuario"), null);

  // Trocar o "." de lugar também não ajuda.
  assert.equal(abrirAssinado("corpo-do-token.assinatura.extra", "usuario"), null);
});

test("token sem forma valida devolve null em vez de explodir", () => {
  assert.equal(abrirAssinado(null, "usuario"), null);
  assert.equal(abrirAssinado(undefined, "usuario"), null);
  assert.equal(abrirAssinado("", "usuario"), null);
  assert.equal(abrirAssinado("sem-ponto-nenhum", "usuario"), null);
  assert.equal(abrirAssinado(".com-ponto-no-inicio", "usuario"), null);
  assert.equal(abrirAssinado("corpo.", "usuario"), null);
});

test("sem SESSAO_SEGREDO a assinatura falha alto, nao em silencio", () => {
  // Falhar alto é o comportamento desejado: um deploy sem a variável tem que
  // quebrar na hora, não assinar cookie com segredo vazio.
  const guardado = process.env.SESSAO_SEGREDO;
  delete process.env.SESSAO_SEGREDO;
  try {
    assert.throws(() => segredo(), /SESSAO_SEGREDO/);
    assert.throws(() => assinar("corpo", "usuario"), /SESSAO_SEGREDO/);
    assert.throws(() => crachaAdm(), /SESSAO_SEGREDO/);
  } finally {
    process.env.SESSAO_SEGREDO = guardado;
  }
});

test("trocar o segredo mestre invalida tudo que foi assinado antes", () => {
  const token = assinar("corpo", "usuario");
  process.env.SESSAO_SEGREDO = "outro-segredo-mestre";
  try {
    for (const p of PROPÓSITOS) {
      assert.equal(abrirAssinado(token, p), null);
    }
  } finally {
    process.env.SESSAO_SEGREDO = MESTRE;
  }
});

test("chaveValida olha so o ADM_CHAVE e nao vaza para a sessao", () => {
  assert.equal(chaveValida(CHAVE_DO_LINK), true);
  assert.equal(chaveValida(MESTRE), false);
  assert.equal(chaveValida(""), false);
  assert.equal(chaveValida(undefined), false);
  assert.equal(chaveValida(null), false);
  // Tamanho diferente não pode lançar (timingSafeEqual exige tamanhos iguais).
  assert.equal(chaveValida("a".repeat(500)), false);

  // E o inverso: o segredo do link não vale como assinatura de sessão.
  const corpo = "corpo";
  const forjado = `${corpo}.${createHmac("sha256", MESTRE).update(corpo).digest("hex")}`;
  assert.equal(chaveValida(forjado), false);
});

test("id do visitante cabe na CHECK de public.votos", () => {
  const a = novoVisitante();
  const b = novoVisitante();
  assert.match(a, /^[a-f0-9]{32}$/);
  assert.match(b, /^[a-f0-9]{32}$/);
  assert.notEqual(a, b);
});

test("nome dos cookies e opcoes nao mudam por acidente", () => {
  // Os nomes são contrato com o navegador: trocar aqui desloga todo mundo.
  assert.equal(COOKIE_VISITANTE, "sesi.visitante");
  assert.equal(COOKIE_ADM, "sesi.adm");

  const opcoes = opcoesCookie(100);
  assert.equal(opcoes.httpOnly, true);
  assert.equal(opcoes.sameSite, "lax");
  assert.equal(opcoes.path, "/");
  assert.equal(opcoes.maxAge, 100);
  // Sem `expires`: o cookie é de sessão do ponto de vista do navegador só se
  // maxAge/expires faltarem, e o maxAge acima é o que segura.
  assert.equal("expires" in opcoes, false);
});
