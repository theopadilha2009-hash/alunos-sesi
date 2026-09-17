#!/usr/bin/env bash
# db-query.sh — Roda SQL no Supabase do projeto sem `supabase login` / `link`.
#
# Uso:
#   ./scripts/db-query.sh -f src/sql/migration.sql            # aplica (comportamento de sempre)
#   ./scripts/db-query.sh "SELECT count(*) FROM leads" --output table
#   ./scripts/db-query.sh --check   -f src/sql/migration.sql  # lint estatico, NAO conecta
#   ./scripts/db-query.sh --dry-run -f src/sql/migration.sql  # executa em transacao + ROLLBACK
#   ./scripts/db-query.sh --dry-run --force -f arquivo.sql    # libera comandos destrutivos no lint
#   ./scripts/db-query.sh --psql "SELECT ...; SELECT ...;"    # multi-statement + meta-commands via psql
#   ./scripts/db-query.sh --psql -f src/sql/auditoria-rls.sql # idem, de arquivo (passa pelo lint antes)
#
# --check  : valida o SQL offline (padroes perigosos) sem tocar o banco.
# --dry-run: roda o SQL de verdade dentro de BEGIN; ... ROLLBACK; (nada e aplicado),
#            pegando erros de sintaxe/FK/constraint/coluna que regex nunca pega.
# --psql   : roda via psql, que aceita multi-statement (varios `;`) e meta-commands (\d \dp \du \dt)
#            — coisas que `supabase db query` rejeita (erro 42601). APLICA de verdade (sem ROLLBACK);
#            use pra auditoria/leitura ad-hoc (RLS, grants, schema). Com -f arquivo, passa pelo lint;
#            inline roda direto (mesmo contrato do modo normal). Destrutivo em arquivo exige --force.
#
# Le SUPABASE_DB_URL do .env.local na raiz do projeto.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"

# --- Flags proprias; tudo que nao for delas e repassado ao supabase no modo normal ---
MODE="run"   # run | check | dry-run | psql
FORCE=0
SQL_FILE=""
SQL_INLINE=""
ARGS=("$@")
i=0
while [[ $i -lt ${#ARGS[@]} ]]; do
  case "${ARGS[$i]}" in
    --check)    MODE="check" ;;
    --dry-run)  MODE="dry-run" ;;
    --psql)     MODE="psql" ;;
    --force)    FORCE=1 ;;
    -f)         i=$((i+1)); SQL_FILE="${ARGS[$i]:-}" ;;
    --file=*)   SQL_FILE="${ARGS[$i]#--file=}" ;;
    --output)   i=$((i+1)) ;;   # flag do supabase (modo run): pula o valor p/ nao virar SQL_INLINE
    --output=*) ;;
    -*)         ;;              # demais flags: o modo run repassa via "$@"
    *)          [[ -z "$SQL_INLINE" ]] && SQL_INLINE="${ARGS[$i]}" ;;
  esac
  i=$((i+1))
done

# A URL so e necessaria pra conectar (run/dry-run/psql). --check e lint offline puro.
# Obs: dry-run/psql usam psql; prefira uma conexao DIRETA (5432). No pooler em transaction-mode
# (6543) uma transacao explicita unica funciona, mas direct e o caminho garantido.
SUPABASE_DB_URL=""
if [[ "$MODE" != "check" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: $ENV_FILE not found. Run ~/.claude/scripts/bootstrap-project.sh first." >&2
    exit 1
  fi
  SUPABASE_DB_URL="$(grep -E '^SUPABASE_DB_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")"
  if [[ -z "$SUPABASE_DB_URL" ]]; then
    echo "ERROR: SUPABASE_DB_URL not set in $ENV_FILE" >&2
    echo "Get it from: Supabase Dashboard > Settings > Database > Connection string > URI" >&2
    exit 1
  fi
fi

# Tira comentarios de linha (--) e de bloco (/* */) antes de lintar,
# pra palavra-chave dentro de comentario nao virar falso positivo.
strip_sql_comments() {
  perl -0777 -pe 's{/\*.*?\*/}{ }gs; s/--[^\n]*//g' "$1"
}

# Parseia SUPABASE_DB_URL e exporta PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD.
# O parser de URI do libpq quebra quando a senha tem caractere especial (@, etc.);
# passar via PG* env e robusto e nao expoe a senha em argv. Compartilhado por dry-run e psql.
pg_env() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "ERRO: python3 necessario pra parsear a SUPABASE_DB_URL com seguranca." >&2
    return 4
  fi
  local pgenv
  pgenv="$(python3 - "$SUPABASE_DB_URL" <<'PY'
import sys, shlex, urllib.parse as u
p = u.urlparse(sys.argv[1]); dq = lambda s: "" if s is None else u.unquote(s)
print("export PGHOST="     + shlex.quote(dq(p.hostname)))
print("export PGPORT="     + shlex.quote(str(p.port or 5432)))
print("export PGUSER="     + shlex.quote(dq(p.username)))
print("export PGDATABASE=" + shlex.quote(dq((p.path or '/postgres').lstrip('/')) or 'postgres'))
print("export PGPASSWORD=" + shlex.quote(dq(p.password)))
PY
)" || { echo "ERRO: falha ao parsear SUPABASE_DB_URL." >&2; return 4; }
  eval "$pgenv"
}

LINT_ERRORS=0
lint_sql() {
  local file="$1" clean
  clean="$(strip_sql_comments "$file")"
  LINT_ERRORS=0
  echo "lint: $file"

  # Destrutivos: bloqueiam sem --force
  _block() { # regex descricao
    if printf '%s' "$clean" | grep -iqE "$1"; then
      if [[ $FORCE -eq 1 ]]; then
        echo "  ok (--force): $2"
      else
        echo "  BLOQUEADO: $2 — use --force se for intencional" >&2
        LINT_ERRORS=$((LINT_ERRORS+1))
      fi
    fi
  }
  _block 'DROP[[:space:]]+TABLE'                    'DROP TABLE'
  _block 'DROP[[:space:]]+(COLUMN|SCHEMA|DATABASE)' 'DROP COLUMN/SCHEMA/DATABASE'
  _block 'TRUNCATE'                                 'TRUNCATE'

  # DELETE/UPDATE sem WHERE (analisado por statement, multilinha)
  if ! printf '%s' "$clean" | perl -0777 -ne '
        my $bad=0;
        while (/\b(delete\s+from|update)\b((?:(?!;).)*)(?:;|\z)/sgi){ $bad=1 unless $2=~/\bwhere\b/i }
        exit($bad?1:0)'; then
    if [[ $FORCE -eq 1 ]]; then
      echo "  ok (--force): DELETE/UPDATE sem WHERE"
    else
      echo "  BLOQUEADO: DELETE/UPDATE sem WHERE (afeta a tabela toda) — use --force se intencional" >&2
      LINT_ERRORS=$((LINT_ERRORS+1))
    fi
  fi

  # ADD COLUMN ... NOT NULL sem DEFAULT: bug estrutural (erro sempre, --force nao libera)
  if ! printf '%s' "$clean" | perl -0777 -ne '
        my $bad=0;
        while (/\badd\s+column\b((?:(?!;).)*)(?:;|\z)/sgi){ my $c=$1; $bad=1 if $c=~/\bnot\s+null\b/i && $c!~/\bdefault\b/i }
        exit($bad?1:0)'; then
    echo "  ERRO: ADD COLUMN ... NOT NULL sem DEFAULT (quebra em tabela com linhas)" >&2
    LINT_ERRORS=$((LINT_ERRORS+1))
  fi

  # Idempotencia (warning, nao bloqueia)
  if printf '%s' "$clean" | grep -iqE 'CREATE[[:space:]]+TABLE' && \
     ! printf '%s' "$clean" | grep -iqE 'CREATE[[:space:]]+TABLE[[:space:]]+IF[[:space:]]+NOT[[:space:]]+EXISTS'; then
    echo "  aviso: CREATE TABLE sem IF NOT EXISTS (idempotencia)"
  fi

  # DDL nao-transacional (warning): o dry-run via transacao nao cobre
  if printf '%s' "$clean" | grep -iqE 'CONCURRENTLY|ALTER[[:space:]]+TYPE[[:space:]]+[^;]*ADD[[:space:]]+VALUE|VACUUM|REINDEX|CREATE[[:space:]]+DATABASE'; then
    echo "  aviso: DDL nao-transacional (CONCURRENTLY / enum ADD VALUE / VACUUM / ...). --dry-run NAO cobre isso."
  fi

  if [[ $LINT_ERRORS -gt 0 ]]; then
    echo "  -> $LINT_ERRORS problema(s) bloqueante(s)." >&2
  else
    echo "  -> ok"
  fi
}

# Roda psql com a conexao do projeto. Aceita multi-statement e meta-commands (\d \dp \du ...),
# que o `supabase db query` rejeita. Os args sao repassados ao psql (-f arquivo, ou nada => stdin).
psql_exec() {
  if ! command -v psql >/dev/null 2>&1; then
    echo "ERRO: psql nao encontrado. 'brew install libpq' (e linke no PATH)." >&2
    return 4
  fi
  pg_env || return $?
  echo "psql: aplica de verdade (multi-statement + meta-commands OK; sem ROLLBACK)." >&2
  local rc=0
  psql -X -v ON_ERROR_STOP=1 "$@" || rc=$?
  unset PGPASSWORD
  return $rc
}

dry_run_sql() {
  local file="$1" clean
  clean="$(strip_sql_comments "$file")"

  if ! command -v psql >/dev/null 2>&1; then
    echo "ERRO: psql nao encontrado. 'brew install libpq' (e linke no PATH), ou use --check pra validacao offline." >&2
    return 4
  fi

  # Como lidar com a transacao propria do arquivo (transaction-per-migration):
  #   wrap   -> sem BEGIN/COMMIT proprio: embrulha direto
  #   strip  -> exatamente 1 BEGIN inicial + 1 COMMIT final: remove os dois (a remocao do
  #             COMMIT e o que garante que nada aplica) e embrulha no nosso BEGIN/ROLLBACK
  #   refuse -> qualquer outro caso (multiplos COMMIT, ou COMMIT fora do fim): recusa
  local txmode
  txmode="$(printf '%s' "$clean" | perl -0777 -ne '
    my $s=$_;
    my $lead  = ($s=~/\A\s*(?:BEGIN|START\s+TRANSACTION)\s*;/i) ? 1 : 0;
    my $n=0; $n++ while $s=~/\bCOMMIT\s*;/gi;
    my $trail = ($s=~/\bCOMMIT\s*;\s*\z/i) ? 1 : 0;
    if    ($n==0)                     { print "wrap" }
    elsif ($lead && $n==1 && $trail)  { print "strip" }
    else                              { print "refuse" }
  ')"
  if [[ "$txmode" == "refuse" ]]; then
    echo "ERRO: controle de transacao ambiguo (multiplos COMMIT, ou COMMIT fora do fim)." >&2
    echo "      dry-run so e seguro com no maximo 1 BEGIN inicial + 1 COMMIT final. Revise manual." >&2
    return 3
  fi

  pg_env || return $?

  local target tmp="" abs
  abs="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"
  if [[ "$txmode" == "strip" ]]; then
    tmp="$(mktemp -t dbq-dryrun.XXXXXX)"
    perl -0777 -pe 's/\A(\s*)(?:BEGIN|START\s+TRANSACTION)\s*;/$1/i; s/\bCOMMIT\s*;\s*(?:--[^\n]*)?\s*\z/\n/i;' "$abs" > "$tmp"
    # INVARIANTE DE SEGURANCA: nenhum COMMIT pode sobreviver no payload — senao a transacao
    # externa comitaria de verdade. Se a deteccao (no SQL sem comentarios) e o strip (no cru)
    # divergirem (ex.: comentario apos o COMMIT), o COMMIT pode escapar. Nesse caso, RECUSA.
    if strip_sql_comments "$tmp" | grep -iqE '\bCOMMIT\b'; then
      rm -f "$tmp"
      echo "ERRO: nao consegui remover o COMMIT com seguranca (forma/comentario inesperado apos COMMIT)." >&2
      echo "      Recusando pra nao arriscar aplicar de verdade. Revise manual." >&2
      return 3
    fi
    target="$tmp"
    echo "dry-run: arquivo tem transacao propria (BEGIN/COMMIT) — removidos pro teste e embrulhado em ROLLBACK."
  else
    target="$abs"
  fi

  echo "dry-run: executando em transacao e desfazendo (ROLLBACK)..."
  local rc=0
  # O caminho vai entre aspas simples pro psql: o heredoc abaixo nao e citado
  # (o `\i` precisa chegar literal), entao um diretorio com espaco viraria dois
  # argumentos e o `\i` falharia. Aspas simples se escapam dobrando dentro de
  # meta-comando do psql.
  local quoted_target="${target//\'/\'\'}"
  psql -X -q -v ON_ERROR_STOP=1 <<SQL || rc=$?
BEGIN;
\i '$quoted_target'
ROLLBACK;
SQL
  unset PGPASSWORD
  [[ -n "$tmp" ]] && rm -f "$tmp"
  if [[ $rc -eq 0 ]]; then
    echo "  -> OK: o SQL executa sem erros. Nada foi aplicado (ROLLBACK)."
    return 0
  else
    echo "  -> FALHOU: o SQL tem erro (acima). Nada foi aplicado." >&2
    return 1
  fi
}

case "$MODE" in
  check)
    [[ -n "$SQL_FILE" ]] || { echo "ERRO: --check requer -f arquivo.sql" >&2; exit 2; }
    [[ -f "$SQL_FILE" ]] || { echo "ERRO: arquivo nao encontrado: $SQL_FILE" >&2; exit 2; }
    lint_sql "$SQL_FILE"
    [[ $LINT_ERRORS -eq 0 ]] || exit 2
    ;;
  dry-run)
    [[ -n "$SQL_FILE" ]] || { echo "ERRO: --dry-run requer -f arquivo.sql" >&2; exit 2; }
    [[ -f "$SQL_FILE" ]] || { echo "ERRO: arquivo nao encontrado: $SQL_FILE" >&2; exit 2; }
    lint_sql "$SQL_FILE"
    [[ $LINT_ERRORS -eq 0 ]] || { echo "Abortado pelo lint (use --force pra destrutivos intencionais)." >&2; exit 2; }
    dry_run_sql "$SQL_FILE"
    ;;
  psql)
    # Arquivo: linta antes (destrutivo exige --force), depois roda via psql -f.
    # Inline: roda direto via stdin (mesmo contrato do modo normal — nao linta inline ad-hoc).
    if [[ -n "$SQL_FILE" ]]; then
      [[ -f "$SQL_FILE" ]] || { echo "ERRO: arquivo nao encontrado: $SQL_FILE" >&2; exit 2; }
      lint_sql "$SQL_FILE"
      [[ $LINT_ERRORS -eq 0 ]] || { echo "Abortado pelo lint (use --force pra destrutivos intencionais)." >&2; exit 2; }
      psql_exec -f "$SQL_FILE"
    elif [[ -n "$SQL_INLINE" ]]; then
      psql_exec <<<"$SQL_INLINE"
    else
      echo "ERRO: --psql requer -f arquivo.sql ou SQL inline entre aspas." >&2
      exit 2
    fi
    ;;
  run)
    rc=0
    supabase db query --db-url "$SUPABASE_DB_URL" "$@" || rc=$?
    if [[ $rc -ne 0 ]]; then
      # Se o input parece multi-statement (`;` seguido de mais SQL) ou meta-command (\d ...),
      # a causa provavel e a limitacao do `supabase db query` — sugere o caminho via psql.
      probe=""
      [[ -n "$SQL_FILE" && -f "$SQL_FILE" ]] && probe="$(cat "$SQL_FILE")"
      [[ -z "$probe" ]] && probe="$SQL_INLINE"
      # multi-statement (`;` seguido de mais SQL, mesmo em outra linha) ou meta-command (\d ...).
      # perl -0777 slurpa o arquivo todo — grep e line-oriented e perderia `;` no fim de linha.
      if printf '%s' "$probe" | perl -0777 -ne 'exit( /;\s*\S/s || /(?:^|\s)\\[a-z]/i ? 0 : 1 )'; then
        echo "dica: 'supabase db query' nao aceita multi-statement nem meta-commands (\\d, \\dp, \\du)." >&2
        if [[ -n "$SQL_FILE" ]]; then
          echo "      Rode o mesmo via psql:  ./scripts/db-query.sh --psql -f $SQL_FILE" >&2
        else
          echo "      Rode o mesmo via psql:  ./scripts/db-query.sh --psql \"<sua query>\"" >&2
        fi
      fi
    fi
    exit $rc
    ;;
esac
