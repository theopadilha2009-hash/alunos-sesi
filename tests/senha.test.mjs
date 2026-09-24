import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HASH_FANTASMA,
  SENHA_BLOQUEADA,
  hashSenha,
  precisaRehash,
  verificarLegadoSha256,
  verificarSenha,
} from "../src/lib/senha.ts";

/**
 * Digest legado fixo, calculado fora do teste:
 * sha256("sesi_salt_2026:senha-de-teste").
 *
 * Está hardcoded de propósito. Se alguém trocar o salt legado, este teste
 * quebra — que é exatamente o que se quer, porque todo hash antigo do banco
 * pararia de casar e ninguém descobriria até um aluno reclamar que não loga.
 */
const LEGADO =
  "51590cf9f490114735298d148c9c87403d6c22e5173b1e3956c63d2399457eaf";

const GARBAGE = "nao-e-hash-nenhum";

/** 64 hex: formato legado válido, mas que não casa com senha nenhuma. */
const SHA256_DESCONHECIDO = "a".repeat(64);

/** 63 hex e 64 com letra fora do alfabeto hex: não são legado nem argon2. */
const QUASE_SHA256 = "a".repeat(63);
const HEX_INVALIDO = `${"a".repeat(63)}z`;

test("hashSenha devolve argon2id e nunca a senha em claro", async () => {
  const hash = await hashSenha("senha-de-teste");
  assert.match(hash, /^\$argon2id\$v=19\$/);
  assert.equal(hash.includes("senha-de-teste"), false);
  // 16 bytes de salt aleatório: dois hashes da mesma senha nunca coincidem.
  assert.notEqual(hash, await hashSenha("senha-de-teste"));
});

test("verificarSenha aceita a senha certa e recusa a errada", async () => {
  const hash = await hashSenha("senha-de-teste");

  const certo = await verificarSenha("senha-de-teste", hash);
  assert.equal(certo.ok, true);
  assert.equal(certo.precisaRehash, false);

  const errado = await verificarSenha("senha-de-teste ", hash);
  assert.equal(errado.ok, false);
  assert.equal(errado.motivo, "senha");
});

test("verificarSenha recusa senha vazia, nao-string e hash absurdo", async () => {
  const hash = await hashSenha("senha-de-teste");

  // Senha vazia só é recusada porque o hash não casa — não existe caminho de
  // "senha vazia passa".
  assert.equal((await verificarSenha("", hash)).ok, false);
  assert.equal((await verificarSenha("qualquer", null)).motivo, "formato");
  assert.equal((await verificarSenha("qualquer", undefined)).motivo, "formato");
  assert.equal((await verificarSenha("qualquer", 12345)).motivo, "formato");
  assert.equal((await verificarSenha("qualquer", "")).motivo, "formato");
  assert.equal((await verificarSenha("qualquer", "x".repeat(2000))).motivo, "formato");
  assert.equal((await verificarSenha("qualquer", QUASE_SHA256)).motivo, "formato");
  assert.equal((await verificarSenha("qualquer", HEX_INVALIDO)).motivo, "formato");

  // 64 hex é formato legado legítimo: o motivo é "senha", não "formato".
  assert.equal((await verificarSenha("qualquer", SHA256_DESCONHECIDO)).motivo, "senha");
});

test("hash malformado com prefixo argon2 nao derruba a verificacao", async () => {
  // O ramo `$argon2...` chama a lib nativa, que lança em hash corrompido.
  // O catch tem que transformar isso em "formato", não em exceção vazando.
  const corrompido = "$argon2id$v=19$m=19456,t=2,p=1$nao-e-base64$tambem-nao";
  const res = await verificarSenha("qualquer", corrompido);
  assert.equal(res.ok, false);
  assert.equal(res.motivo, "formato");
});

test("SENHA_BLOQUEADA e hash fora de formato nunca autenticam", async () => {
  assert.equal((await verificarSenha("theo1234", SENHA_BLOQUEADA)).ok, false);
  assert.equal((await verificarSenha("!bloqueado", SENHA_BLOQUEADA)).ok, false);
  assert.equal((await verificarSenha("theo1234", GARBAGE)).ok, false);
  assert.equal(precisaRehash(GARBAGE), true);
});

test("hash fantasma gasta o mesmo caminho e nunca autentica", async () => {
  const res = await verificarSenha("seja-la-o-que-for", HASH_FANTASMA);
  assert.equal(res.ok, false);
  assert.equal(res.motivo, "senha");
  assert.match(HASH_FANTASMA, /^\$argon2id\$/);
});

test("legado SHA-256 autentica e pede rehash no mesmo login", async () => {
  const res = await verificarSenha("senha-de-teste", LEGADO);
  assert.equal(res.ok, true);
  assert.equal(res.precisaRehash, true);

  // O que caracteriza o formato legado e o tamanho, não o conteúdo: 64 hex.
  assert.equal(verificarLegadoSha256("senha-de-teste", LEGADO), true);
  assert.equal(verificarLegadoSha256("outra-senha", LEGADO), false);
  assert.equal(verificarLegadoSha256("senha-de-teste", "a".repeat(64)), false);
  assert.equal(verificarLegadoSha256("senha-de-teste", LEGADO.toUpperCase()), false);
});

test("precisaRehash reconhece hash atual e hash fraco", async () => {
  const atual = await hashSenha("senha-de-teste");
  assert.equal(precisaRehash(atual), false);

  // Mesmo parâmetro, custo de memória menor: precisa subir para o padrão.
  const fraco =
    "$argon2id$v=19$m=8192,t=1,p=1$PT3Sp0umX5b8+Zh2uj7JfQ$XQyMdujlDnvJ1GebaKIdCAJUABjTCAnGXUtRdDlpUog";
  assert.equal(precisaRehash(fraco), true);

  // Lixo que começa com $argon2 e nem é parseável: rehash, não erro.
  assert.equal(precisaRehash("$argon2id$lixo"), true);
  assert.equal(precisaRehash(LEGADO), true);
});
