import assert from "node:assert/strict";
import { test } from "node:test";
import { HOSTS_IMAGEM, NONCE_HEADER, montarCsp } from "../src/lib/csp.ts";
import { urlImagemSegura } from "../src/lib/seguranca.ts";

const NONCE = "abc123DEF456-_ghi";
const PROD = montarCsp(NONCE, false);
const DEV = montarCsp(NONCE, true);

/** Lê o valor de uma diretiva, ex.: `diretiva(csp, "script-src")`. */
function diretiva(csp, nome) {
  const achada = csp.split("; ").find((d) => d === nome || d.startsWith(`${nome} `));
  assert.ok(achada, `diretiva ${nome} ausente da CSP`);
  return achada.slice(nome.length).trim();
}

test("script-src carrega o nonce e continua aceitando a propria origem", () => {
  assert.equal(diretiva(PROD, "script-src"), `'self' 'nonce-${NONCE}'`);

  // 'self' tem que continuar lá: as páginas pré-renderizadas trazem
  // <script src="/_next/static/…"> sem nonce. Se alguém ligar 'strict-dynamic',
  // 'self' é ignorado e essas páginas ficam sem hidratação.
  assert.equal(PROD.includes("strict-dynamic"), false);
});

test("style-src NAO tem nonce e mantem unsafe-inline", () => {
  // A quebra mais provável desta feature. Nonce em style-src desliga o
  // 'unsafe-inline' por spec, e o app usa style={{…}} em ~172 lugares — com
  // nonce ali, a UI perde todo o estilo inline e não há erro no console que
  // explique.
  const style = diretiva(PROD, "style-src");
  assert.equal(style, "'self' 'unsafe-inline'");
  assert.equal(style.includes("nonce"), false);
});

test("unsafe-eval so em dev", () => {
  assert.equal(diretiva(DEV, "script-src").includes("'unsafe-eval'"), true);
  assert.equal(PROD.includes("unsafe-eval"), false);
});

test("o host de debug do Analytics so aparece em dev", () => {
  // @vercel/analytics usa /_vercel/insights (same-origin) quando
  // NODE_ENV=production, então `'self'` cobre. Em dev o próprio pacote troca
  // para o script de debug em va.vercel-scripts.com — sem esta exceção o
  // Analytics nasce bloqueado e o ruído aparece no console de quem desenvolve.
  assert.equal(diretiva(DEV, "script-src").includes("va.vercel-scripts.com"), true);
  assert.equal(diretiva(DEV, "connect-src").includes("va.vercel-scripts.com"), true);

  // O host não pode vazar para produção: lá ele só afrouxaria a política sem
  // nenhum script que o use.
  assert.equal(PROD.includes("va.vercel-scripts.com"), false);
});

test("a politica de dev nao tem espaco duplo", () => {
  // A exceção do Analytics é concatenada com espaço à esquerda; em produção
  // ela é string vazia. Este teste tranca o caso que o teste de produção não
  // cobre — espaço duplo faz o navegador ignorar a diretiva inteira.
  const bruto = montarCsp(NONCE, true);
  assert.equal(bruto.includes("\n"), false);
  assert.equal(/ {2,}/.test(bruto), false);
  assert.equal(bruto.endsWith(";"), false);
});

test("upgrade-insecure-requests so em producao", () => {
  // Em dev o app roda em http no localhost: forçar https ali quebra tudo.
  assert.equal(PROD.includes("upgrade-insecure-requests"), true);
  assert.equal(DEV.includes("upgrade-insecure-requests"), false);
});

test("diretivas de bloqueio estao presentes", () => {
  assert.equal(diretiva(PROD, "default-src"), "'self'");
  assert.equal(diretiva(PROD, "object-src"), "'none'");
  assert.equal(diretiva(PROD, "base-uri"), "'self'");
  assert.equal(diretiva(PROD, "frame-ancestors"), "'none'");
  assert.equal(diretiva(PROD, "form-action"), "'self'");
  assert.equal(diretiva(PROD, "frame-src"), "'none'");
  assert.equal(diretiva(PROD, "connect-src"), "'self'");
  assert.equal(diretiva(PROD, "font-src"), "'self'");
  assert.equal(diretiva(PROD, "manifest-src"), "'self'");
});

test("worker-src libera o service worker", () => {
  const worker = diretiva(PROD, "worker-src");
  assert.equal(worker.includes("'self'"), true);
  assert.equal(worker.includes("blob:"), true);
});

test("img-src cobre tudo que urlImagemSegura aceita", () => {
  // Este é o teste que amarra as duas pontas: csp.ts e seguranca.ts não podem
  // se importar (ambos são folha), então quem garante que concordam é o teste.
  // Se o sanitizador aceitar um esquema que a política bloqueia, a imagem
  // some da tela sem erro visível.
  const img = diretiva(PROD, "img-src");
  for (const esquema of ["'self'", "data:", "blob:"] ) {
    assert.equal(img.includes(esquema), true, `${esquema} faltando em img-src`);
  }

  // O caso que obriga a ser por esquema e não por allowlist: o Estúdio aceita
  // URL de GIF digitada pelo aluno, então qualquer host https é válido.
  const urlDoAluno = urlImagemSegura("https://exemplo-qualquer.com/figurinha.gif");
  assert.ok(urlDoAluno);
  assert.equal(new URL(urlDoAluno).protocol, "https:");
  assert.equal(img.includes("https:"), true);
  assert.deepEqual([...HOSTS_IMAGEM], ["https:"]);

  // E o que a política tem que continuar barrando.
  assert.equal(img.includes("http:"), false);
  assert.equal(urlImagemSegura("javascript:alert(1)"), null);
});

test("media-src tambem aceita o https dos clipes", () => {
  const media = diretiva(PROD, "media-src");
  assert.equal(media.includes("https:"), true);
  assert.equal(media.includes("blob:"), true);
  assert.equal(media.includes("http:"), false);
});

test("a politica nao tem quebra de linha nem espaco duplo", () => {
  // Header com \n quebra a resposta; espaço duplo é sintoma de template mal
  // montado e o navegador ignora a diretiva inteira.
  const bruto = montarCsp(NONCE, false);
  assert.equal(bruto.includes("\n"), false);
  assert.equal(/ {2,}/.test(bruto), false);
  assert.equal(bruto.endsWith(";"), false);
});

test("nome do header de nonce e contrato com o proxy", () => {
  assert.equal(NONCE_HEADER, "x-nonce");
});

test("nonce malformado nao vira diretiva valida", () => {
  // O Next só reconhece o formato 'nonce-<base64url>'. Um nonce com espaço ou
  // aspa quebraria a política no meio; este teste documenta que quem gera o
  // nonce (proxy.ts, base64url) precisa continuar gerando nesse formato.
  const seguro = montarCsp("aBc-_123", false);
  assert.equal(diretiva(seguro, "script-src"), "'self' 'nonce-aBc-_123'");

  const comEspaco = montarCsp("nao pode ter espaco", false);
  // O espaço parte a diretiva em duas fontes — sintoma visível, não silencioso.
  assert.equal(diretiva(comEspaco, "script-src").split(/\s+/).includes("'nonce-nao"), true);
});
