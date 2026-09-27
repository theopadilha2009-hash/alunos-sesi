import { createHash, randomBytes } from "node:crypto";

/**
 * O código de ativação — o caminho pelo qual o aluno que já está na planilha
 * assume o próprio perfil.
 *
 * O problema que isto resolve: `importarLista` e `criarAluno` gravam só em
 * `alunos`, nunca em `usuarios`. Então o aluno importado fica órfão — o perfil
 * dele existe, mas ninguém consegue entrar nele. E `registrarUsuario` SEMPRE
 * insere um aluno novo, `aprovado: false`, então o auto-cadastro da mesma
 * pessoa cria uma segunda linha, pendente, e a primeira continua sem dono. Cada
 * cadastro novo deixava mais uma linha para limpar à mão.
 *
 * Aqui o ADM emite um código para o aluno que já existe, e o aluno define a
 * própria senha com ele. A conta nasce com `SENHA_BLOQUEADA` em `senha_hash`,
 * que `verificarSenha` já recusa — ou seja, a conta existe e não autentica até
 * o resgate.
 *
 * SÓ RODA NO SERVIDOR: `node:crypto`. O cliente manda o código cru e a ação
 * normaliza — a validação de formato fica num lugar só.
 */

/**
 * Crockford Base32: `0-9` e as letras, sem `I`, `L`, `O` e `U`.
 *
 * O código é DITADO pelo professor e digitado pelo aluno, não copiado. Por isso
 * as letras que se confundem em voz alta saem do alfabeto — e o que o aluno
 * digita no lugar delas volta ao dígito na normalização, porque a intenção não
 * é ambígua quando o caractere não existe. O `U` fica de fora para o sorteio
 * não formar palavra feia por acaso.
 */
export const ALFABETO = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** 8 caracteres = 40 bits. Com o rate limit do resgate, não se adivinha. */
export const TAMANHO_CODIGO = 8;

/** 7 dias: tempo de uma semana de aula, sem o código virar permanente. */
export const VALIDADE_CODIGO_MS = 7 * 24 * 60 * 60 * 1000;

const RE_PREFIXO = /^SES[I1]/;
const FORA_DO_ALFABETO = new RegExp(`[^${ALFABETO}]`, "g");

/**
 * Dobra o que o leitor confundiu de volta no caractere do alfabeto.
 *
 * Roda DEPOIS de tirar o prefixo: "SESI" tem o `I`, e dobrar antes viraria
 * "SES1" — o prefixo deixaria de casar e sobraria um caractere a mais.
 */
function dobrarAmbiguos(texto: string): string {
  return texto.replace(/O/g, "0").replace(/[IL]/g, "1");
}

/**
 * A forma canônica do código: só o alfabeto, maiúsculo, sem prefixo.
 *
 * Devolve `""` quando o que sobrou não tem o tamanho certo — é assim que o
 * chamador distingue "digitou errado" de "código inválido" sem tentar adivinhar
 * o que a pessoa quis dizer.
 */
export function normalizarCodigo(bruto: string): string {
  const limpo = dobrarAmbiguos(bruto.trim().toUpperCase().replace(RE_PREFIXO, ""))
    .replace(FORA_DO_ALFABETO, "");
  return limpo.length === TAMANHO_CODIGO ? limpo : "";
}

/**
 * O código como o ADM lê na tela: `SESI-ABCD-2345`.
 *
 * O prefixo é enfeite — `normalizarCodigo` o descarta. Ele existe para o código
 * ser reconhecível como da escola se aparecer num papel solto.
 */
export function formatarCodigo(codigo: string): string {
  return `SESI-${codigo.slice(0, 4)}-${codigo.slice(4)}`;
}

/**
 * Sorteia um código novo.
 *
 * 32 caracteres cabem em 5 bits exatos, então 8 caracteres são 5 bytes lidos de
 * 5 em 5 bits — sem viés, sem descartar amostra. O `% 32` de um byte daria
 * viés nos primeiros 8 caracteres do alfabeto.
 */
export function gerarCodigo(): string {
  let acumulado = 0;
  for (const byte of randomBytes(5)) acumulado = acumulado * 256 + byte;

  let codigo = "";
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    codigo = ALFABETO[acumulado % 32] + codigo;
    acumulado = Math.floor(acumulado / 32);
  }
  return codigo;
}

/**
 * SHA-256 do código — é isto que vai para `usuarios.codigo_hash`.
 *
 * Determinístico de propósito, ao contrário da senha (argon2, salt aleatório):
 * o resgate busca `WHERE codigo_hash = $1`, e um hash com salt obrigaria a
 * varrer a tabela. Pode ser determinístico porque o código não é escolhido por
 * gente — são 40 bits sorteados, que não cabem em rainbow table — e porque ele
 * expira em 7 dias e morre no primeiro uso. O que o hash protege é o banco
 * vazado: sem ele, quem lê `usuarios` ativa a conta de qualquer aluno.
 */
export function hashCodigo(codigo: string): string {
  return createHash("sha256").update(codigo).digest("hex");
}
