import assert from "node:assert/strict";
import { test } from "node:test";
import {
  blobDoDataUrl,
  caminhoDaMidia,
  caminhoPertenceAoAluno,
  nomeDaImagem,
} from "../src/lib/blob.ts";

const ALUNO = "a1417080-b591-4cc9-8558-5650a3da0546";
const OUTRO = "ff6895a2-c045-4591-afe7-9a5a38c8d76e";

// ── nomeDaImagem ────────────────────────────────────────────────────────────

test("nomeDaImagem usa a extensao do tipo MIME", () => {
  assert.equal(nomeDaImagem("image/jpeg"), "midia.jpg");
  assert.equal(nomeDaImagem("image/png"), "midia.png");
  assert.equal(nomeDaImagem("image/webp"), "midia.webp");
  assert.equal(nomeDaImagem("image/gif"), "midia.gif");
});

test("nomeDaImagem nao deixa um tipo desconhecido virar nome sem extensao", () => {
  // O Blob recusa pathname sem extensão. Cair para `.bin` mantém o caminho
  // válido — quem barra o tipo de verdade é o `allowedContentTypes` da rota.
  assert.equal(nomeDaImagem("image/avif"), "midia.bin");
  assert.equal(nomeDaImagem(""), "midia.bin");
});

// ── caminhoPertenceAoAluno ──────────────────────────────────────────────────

test("caminhoPertenceAoAluno aceita o caminho do proprio aluno", () => {
  assert.equal(caminhoPertenceAoAluno(caminhoDaMidia(ALUNO, "midia.jpg"), ALUNO), true);
});

test("caminhoPertenceAoAluno recusa a pasta de outro aluno", () => {
  // É a autorização inteira. O pathname vem do browser e o
  // `onBeforeGenerateToken` não pode reescrevê-lo — só recusá-lo. Sem esta
  // checagem, qualquer sessão de aluno escreve na pasta de qualquer outro.
  assert.equal(caminhoPertenceAoAluno(caminhoDaMidia(OUTRO, "midia.jpg"), ALUNO), false);
});

test("caminhoPertenceAoAluno recusa o id que e so prefixo do outro", () => {
  // A barra no fim do prefixo é o que separa o id inteiro de um pedaço dele.
  // Sem ela, um id que fosse prefixo do outro passaria pela checagem.
  const pedaco = ALUNO.slice(0, 8);
  assert.equal(caminhoPertenceAoAluno(`alunos/${pedaco}-outro/midia.jpg`, ALUNO), false);
});

test("caminhoPertenceAoAluno recusa subir de pasta", () => {
  // `startsWith` sozinho aceitaria `..`: quem normaliza o caminho depois é o
  // Blob, não nós.
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/../${OUTRO}/m.jpg`, ALUNO), false);
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/../../etc/passwd`, ALUNO), false);
});

test("caminhoPertenceAoAluno recusa o .. percent-encoded", () => {
  // `%2e%2e` é `..` para quem decodifica, e quem decodifica o caminho é o
  // store. A checagem literal de `..` não pega esta forma, e o SDK do Blob só
  // recusa `//` — o literal chegaria intacto ao backend.
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/%2e%2e/${OUTRO}/m.jpg`, ALUNO), false);
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/%2E%2E/${OUTRO}/m.jpg`, ALUNO), false);
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/..%2f${OUTRO}/m.jpg`, ALUNO), false);
});

test("caminhoPertenceAoAluno recusa subpasta e byte nulo no nome", () => {
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/a/b/m.jpg`, ALUNO), false);
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/m.jpg%00.png`, ALUNO), false);
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/midia.jpg `, ALUNO), false);
});

test("caminhoPertenceAoAluno aceita o formato que o editor gera", () => {
  // `nomeDaImagem` mais o sufixo aleatório do Blob: é o que chega aqui de
  // verdade, e precisa continuar passando depois do endurecimento.
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/midia.jpg`, ALUNO), true);
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/midia-a1b2c3d4.webp`, ALUNO), true);
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/midia.bin`, ALUNO), true);
});

test("caminhoPertenceAoAluno recusa a pasta sem arquivo", () => {
  // `alunos/<id>/` sozinho não é arquivo: deixar passar daria um pathname que
  // o Blob recusa depois, com erro menos claro para o aluno.
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}/`, ALUNO), false);
  assert.equal(caminhoPertenceAoAluno(`alunos/${ALUNO}`, ALUNO), false);
});

test("caminhoPertenceAoAluno recusa a raiz do store", () => {
  assert.equal(caminhoPertenceAoAluno("midia.jpg", ALUNO), false);
  assert.equal(caminhoPertenceAoAluno("alunos/midia.jpg", ALUNO), false);
});

test("caminhoPertenceAoAluno recusa entrada que nao e string", () => {
  // O pathname vem do corpo do request: `null`, objeto e array já apareceram
  // em payload de ataque, e `includes`/`startsWith` estourariam neles.
  for (const lixo of [null, undefined, 42, {}, [], true]) {
    assert.equal(caminhoPertenceAoAluno(lixo, ALUNO), false, String(lixo));
  }
  assert.equal(caminhoPertenceAoAluno(caminhoDaMidia(ALUNO, "m.jpg"), ""), false);
  assert.equal(caminhoPertenceAoAluno(caminhoDaMidia(ALUNO, "m.jpg"), null), false);
});

// ── blobDoDataUrl ───────────────────────────────────────────────────────────

test("blobDoDataUrl converte e preserva o tipo", async () => {
  // "Oi" em base64.
  const blob = blobDoDataUrl("data:image/png;base64,T2k=");
  assert.equal(blob.type, "image/png");
  assert.equal(blob.size, 2);
  assert.equal(await blob.text(), "Oi");
});

test("blobDoDataUrl preserva os bytes acima de 127", async () => {
  // `atob` devolve latin-1: sem o `charCodeAt` byte a byte, um byte 0x80
  // viraria caractere multi-byte e a imagem chegaria corrompida no store.
  const bytes = new Uint8Array([0x00, 0x7f, 0x80, 0xff]);
  const base64 = Buffer.from(bytes).toString("base64");

  const blob = blobDoDataUrl(`data:image/jpeg;base64,${base64}`);
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
});

test("blobDoDataUrl recusa o que nao e data URL de imagem em base64", () => {
  assert.throws(() => blobDoDataUrl("https://exemplo.com/foto.png"));
  assert.throws(() => blobDoDataUrl("data:image/png,T2k="), /base64/);
  assert.throws(() => blobDoDataUrl(""));
  assert.throws(() => blobDoDataUrl(null));
});
