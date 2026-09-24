#!/usr/bin/env node
/**
 * Define a senha de um usuário do CRM.
 *
 *   npm run senha -- --usuario theo1234
 *   NOVA_SENHA='…' npm run senha -- --usuario theo1234
 *
 * Este script existe porque não há caminho de bootstrap no app: nenhuma env
 * var nem rota sabe contornar a autenticação. É deliberado — um atalho desses
 * é um backdoor permanente, que é exatamente o que ele substitui.
 *
 * A senha nunca aparece em argv nem no histórico do shell: entra por stdin sem
 * eco (ou por NOVA_SENHA, para uso não-interativo). Só o hash derivado toca a
 * linha de comando, e ele já vai parar no banco de qualquer forma.
 *
 * O hash é calculado pelo MESMO módulo que o app usa (src/lib/senha.ts), então
 * o formato do script e o do login nunca divergem.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_FILE = join(RAIZ, ".env.local");
const MINIMO = 8;

function sair(mensagem, codigo = 1) {
  console.error(mensagem);
  process.exit(codigo);
}

function lerArgumentos(argv) {
  const args = { usuario: "", listar: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--usuario" || a === "-u") args.usuario = argv[++i] ?? "";
    else if (a.startsWith("--usuario=")) args.usuario = a.slice("--usuario=".length);
    else if (a === "--listar") args.listar = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else sair(`Argumento não reconhecido: ${a}\nUse --help para ver o uso.`);
  }
  return args;
}

function ajuda() {
  console.log(`Define a senha de um usuário do CRM Alunos SESI.

  --usuario <nome>   usuário alvo (obrigatório)
  --listar           lista os usuários existentes e sai
  --help             esta ajuda

A senha é lida do stdin sem eco. Para uso não-interativo, passe NOVA_SENHA.`);
}

function lerEnvLocal() {
  if (!existsSync(ENV_FILE)) {
    sair(`ERRO: ${ENV_FILE} não encontrado. Copie o .env.example e preencha as chaves.`);
  }
  const url = readFileSync(ENV_FILE, "utf8")
    .split("\n")
    .find((l) => l.startsWith("SUPABASE_DB_URL="));
  if (!url) sair(`ERRO: SUPABASE_DB_URL não está definida em ${ENV_FILE}`);
  return url.slice("SUPABASE_DB_URL=".length).trim().replace(/^["']|["']$/g, "");
}

/** Exporta PG* a partir da URL, sem passar a senha por argv. */
function ambientePg(dbUrl) {
  let u;
  try {
    u = new URL(dbUrl);
  } catch {
    sair("ERRO: SUPABASE_DB_URL não é uma URL válida.");
  }
  const dec = (s) => {
    try {
      return decodeURIComponent(s ?? "");
    } catch {
      return s ?? "";
    }
  };
  return {
    ...process.env,
    PGHOST: dec(u.hostname),
    PGPORT: u.port || "5432",
    PGUSER: dec(u.username),
    PGDATABASE: dec(u.pathname.replace(/^\//, "")) || "postgres",
    PGPASSWORD: dec(u.password),
    PGSSLMODE: "require",
  };
}

/**
 * Roda SQL pelo psql com as variáveis `:'nome'` interpoladas.
 *
 * O SQL vai por **stdin**, não por `-c`: em `-c` a string é enviada direto ao
 * servidor sem passar pelo lexer do psql, então `:var` não é substituído e o
 * update falha com "syntax error at or near :".
 */
function psql(env, sql, extraArgs = []) {
  const r = spawnSync(
    "psql",
    ["-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", ...extraArgs],
    { env, encoding: "utf8", input: sql },
  );
  if (r.error) {
    if (r.error.code === "ENOENT") {
      sair("ERRO: psql não está no PATH. Instale com: brew install libpq");
    }
    sair(`ERRO ao executar psql: ${r.error.message}`);
  }
  return r;
}

function lerSenhaSemEco(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("stdin não é um terminal. Use NOVA_SENHA para uso não-interativo."));
      return;
    }
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let buffer = "";
    const encerrar = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", aoDigitar);
      process.stdout.write("\n");
    };
    const aoDigitar = (tecla) => {
      if (tecla === "\r" || tecla === "\n") {
        encerrar();
        resolve(buffer);
      } else if (tecla === "\u0003") {
        encerrar();
        reject(new Error("cancelado"));
      } else if (tecla === "\u007f" || tecla === "\b") {
        buffer = buffer.slice(0, -1);
      } else if (tecla >= " ") {
        buffer += tecla;
      }
    };
    stdin.on("data", aoDigitar);
  });
}

async function main() {
  const args = lerArgumentos(process.argv.slice(2));
  if (args.help) return ajuda();
  if (!args.usuario && !args.listar) {
    ajuda();
    sair("\nERRO: informe --usuario.", 2);
  }

  const env = ambientePg(lerEnvLocal());

  if (args.listar) {
    const r = psql(env, "select username || '  (' || role || ')' from public.usuarios order by username;");
    if (r.status !== 0) sair(`ERRO ao consultar usuários:\n${r.stderr || ""}`);
    console.log(r.stdout.trim() || "(nenhum usuário cadastrado)");
    return;
  }

  const usuario = args.usuario;
  const alvo = psql(env, `select count(*) from public.usuarios where username = '${usuario.replace(/'/g, "''")}';`);
  if (alvo.status !== 0) sair(`ERRO ao consultar o banco:\n${alvo.stderr || ""}`);
  if (alvo.stdout.trim() === "0") {
    sair(`ERRO: o usuário "${usuario}" não existe. Use --listar para ver os cadastrados.`);
  }

  let senha = process.env.NOVA_SENHA ?? "";
  if (senha) {
    console.log("Usando a senha de NOVA_SENHA.");
  } else {
    try {
      senha = await lerSenhaSemEco(`Nova senha para "${usuario}": `);
      const repetida = await lerSenhaSemEco("Repita a nova senha: ");
      if (senha !== repetida) sair("\nERRO: as senhas não conferem.");
    } catch (err) {
      sair(`ERRO: ${err.message}`);
    }
  }

  if (senha.length < MINIMO) sair(`ERRO: a senha precisa ter pelo menos ${MINIMO} caracteres.`);
  if (senha.length > 100) sair("ERRO: a senha pode ter no máximo 100 caracteres.");
  if (senha.toLowerCase() === usuario.toLowerCase()) sair("ERRO: a senha não pode ser igual ao nome de usuário.");

  // Mesmo caminho de código do login: se o formato mudar, muda nos dois.
  const { hashSenha } = await import(join(RAIZ, "src/lib/senha.ts"));
  const hash = await hashSenha(senha);

  const r = psql(
    env,
    "update public.usuarios set senha_hash = :'hash' where username = :'usuario';",
    ["-v", `hash=${hash}`, "-v", `usuario=${usuario}`],
  );
  if (r.status !== 0) sair(`ERRO ao atualizar a senha:\n${r.stderr || ""}`);

  const conf = psql(
    env,
    `select senha_hash from public.usuarios where username = '${usuario.replace(/'/g, "''")}';`,
  );
  const gravado = conf.stdout.trim();
  if (gravado !== hash) {
    sair("ERRO: o hash gravado não confere com o calculado. Nada foi validado.");
  }

  console.log(`\nSenha de "${usuario}" atualizada (argon2id).`);
  console.log("Próximo passo: entrar em / com a senha nova e confirmar o acesso.");
}

main().catch((err) => sair(`ERRO inesperado: ${err?.message ?? err}`));
