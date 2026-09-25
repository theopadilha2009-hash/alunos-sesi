#!/usr/bin/env bash
# checar-migrations.sh — prova que src/sql/001..N reproduz o banco do zero.
#
# Por que existe: src/sql/ e a fonte do banco, mas nada garantia que ela
# reproduzisse o banco de verdade. Foi assim que `stickers`, `habilidades_votos`
# e `insignias` ficaram so no Studio: o 005_integridade.sql cria constraint em
# cima de `stickers`, entao um banco limpo morria ali — e como o `DO $$` do 005
# e um statement so, sem bloco de excecao, ele levava junto as constraints de
# projetos e midias. Ninguem descobria porque ninguem nunca rodou 001..N do zero.
#
# Uso:
#   ./scripts/checar-migrations.sh
#     Sobe um Postgres descartavel em Docker, aplica tudo, e derruba no fim.
#
#   PGHOST=... PGPORT=... PGUSER=... PGPASSWORD=... PGDATABASE=... ./scripts/checar-migrations.sh
#     Usa um Postgres que ja existe, em vez de subir container. E assim que o CI
#     roda, contra o `services: postgres` do workflow. Exige um banco VAZIO.
#
# Nunca toca o Supabase: o banco nasce limpo aqui e morre no fim.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Sobrescrevivel pra validar o proprio guard: `SQL_DIR=/tmp/x ./scripts/checar-migrations.sh`
# tem que FALHAR quando o x nao reproduz o banco. Um guard que nunca falhou nao
# provou nada.
SQL_DIR="${SQL_DIR:-$PROJECT_ROOT/src/sql}"

IMAGEM="${IMAGEM:-postgres:16-alpine}"
CONTAINER="sesi-migrations-$$"
PORTA=""
RESUMO="$(mktemp)"

limpar() {
  rm -f "$RESUMO"
  if [[ -n "$CONTAINER" ]]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap limpar EXIT INT TERM

if ! command -v psql >/dev/null 2>&1; then
  echo "ERRO: psql nao encontrado. 'brew install libpq' e linke no PATH." >&2
  exit 4
fi

if [[ ! -d "$SQL_DIR" ]]; then
  echo "ERRO: $SQL_DIR nao existe." >&2
  exit 2
fi

# `nullglob` para o glob virar array vazio quando a pasta esta vazia, em vez de
# sobrar a string literal `*.sql` — com ela o loop rodaria uma vez sobre um
# arquivo que nao existe, e o guard "verificaria" zero migrations sem perceber.
#
# Esta checagem vem antes de subir container de proposito: validar o input
# antes de criar recurso, em vez de gastar 30s de Docker pra descobrir que nao
# havia nada pra aplicar.
shopt -s nullglob
arquivos=("$SQL_DIR"/*.sql)
shopt -u nullglob

# Um guard que nao encontra nada pra verificar nao pode passar verde: seria o
# mesmo defeito de antes com outra roupa — verde sem prova nenhuma.
if [[ ${#arquivos[@]} -eq 0 ]]; then
  echo "ERRO: nenhum .sql em $SQL_DIR — nada foi verificado." >&2
  exit 2
fi

# ── Banco: container descartavel, ou o que ja estiver no ambiente ────────────

if [[ -n "${PGHOST:-}" ]]; then
  CONTAINER=""
  echo "usando o Postgres de PGHOST=$PGHOST:${PGPORT:-5432} (nenhum container sera criado)."
else
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERRO: sem docker e sem PGHOST. Nao ha onde aplicar as migrations." >&2
    exit 4
  fi

  echo "subindo $IMAGEM como $CONTAINER..."
  docker run --rm -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD=sesi -e POSTGRES_DB=sesi \
    -p 127.0.0.1::5432 "$IMAGEM" >/dev/null

  # Fase 1: o Postgres aceita conexao la dentro? Rapido, e nao gasta rede.
  # 120s porque a maquina pode estar sob carga (varios containers de outros
  # projetos rodando). Se o container morrer no meio (porta ocupada, imagem
  # quebrada), esperar nao adianta: sai do laco e mostra o log.
  pronto=0
  for _ in $(seq 1 240); do
    if docker exec "$CONTAINER" pg_isready -U postgres -d sesi >/dev/null 2>&1; then
      pronto=1
      break
    fi
    [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" == "true" ]] || break
    sleep 0.5
  done

  if [[ $pronto -ne 1 ]]; then
    echo "ERRO: o Postgres do container nao subiu. Ultimas linhas do log dele:" >&2
    docker logs --tail 15 "$CONTAINER" 2>&1 | sed 's/^/  | /' >&2
    exit 1
  fi

  # Porta aleatoria no loopback: duas execucoes em paralelo nao brigam.
  PORTA="$(docker port "$CONTAINER" 5432 | head -1)"
  PORTA="${PORTA##*:}"
  if [[ -z "$PORTA" ]]; then
    echo "ERRO: nao consegui descobrir a porta publicada do container." >&2
    exit 1
  fi

  # Fase 2: o Postgres responde pelo HOST? O pg_isready acima roda DENTRO do
  # container, mas quem aplica as migrations e o psql daqui, pela porta
  # publicada — e o proxy do Docker leva um instante a mais para atender.
  # Esperar so a fase 1 deixava uma corrida: a conexao do host falhava com exit
  # 2 (erro de conexao) logo depois de o container dizer que estava pronto.
  pronto=0
  for _ in $(seq 1 120); do
    if PGPASSWORD=sesi psql -X -q -h 127.0.0.1 -p "$PORTA" -U postgres -d sesi \
      -c 'select 1' >/dev/null 2>&1; then
      pronto=1
      break
    fi
    [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" == "true" ]] || break
    sleep 0.5
  done

  if [[ $pronto -ne 1 ]]; then
    echo "ERRO: o Postgres nao respondeu pela porta $PORTA. Ultimas linhas do log dele:" >&2
    docker logs --tail 15 "$CONTAINER" 2>&1 | sed 's/^/  | /' >&2
    exit 1
  fi

  export PGHOST=127.0.0.1 PGPORT="$PORTA" PGUSER=postgres PGPASSWORD=sesi PGDATABASE=sesi
fi

executar() {
  psql -X -q -v ON_ERROR_STOP=1 "$@"
}

# ── Shim de roles ───────────────────────────────────────────────────────────
# anon/authenticated/service_role so existem no Supabase; as policies de RLS os
# citam, entao um Postgres cru precisa deles antes do 001.
#
# Este shim NAO pode morar em src/sql/: la e a pasta que vira banco de producao,
# e no Supabase esses papeis ja existem e tem dono. Aqui ele e so do teste.

echo "aplicando o shim de roles do Supabase..."
executar <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT;
  END IF;
END $$;
SQL

# ── 001..N, em ordem, parando no primeiro erro ──────────────────────────────
# `set -e` nao serve aqui: preciso saber QUAL arquivo quebrou e mostrar a saida
# dele, entao o `if` captura o codigo em vez de deixar o shell morrer.

echo "aplicando as migrations de $SQL_DIR, em ordem:"
falhou=""
total=0
for arquivo in "${arquivos[@]}"; do
  nome="$(basename "$arquivo")"
  total=$((total + 1))
  if executar <"$arquivo" >"$RESUMO" 2>&1; then
    printf '  ok      %s\n' "$nome"
  else
    printf '  FALHOU  %s\n' "$nome" >&2
    falhou="$nome"
    break
  fi
done

if [[ -n "$falhou" ]]; then
  echo >&2
  echo "saida do psql em $falhou:" >&2
  sed 's/^/  | /' "$RESUMO" >&2
  echo >&2
  echo "O repositorio NAO reproduz o banco: 001..$(printf '%s' "$falhou" | cut -c1-3) para em $falhou." >&2
  echo "Corrija a migration (ou o drift que ela expos) e rode de novo." >&2
  exit 1
fi

echo
echo "OK: $total migrations aplicadas num banco limpo, sem erro."
