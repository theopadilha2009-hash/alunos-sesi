#!/usr/bin/env bash
# vercel-env.sh — Manage Vercel env vars and deployments without the Vercel CLI.
#
# Usage:
#   ./scripts/vercel-env.sh pull          # Pull env vars into .env.local
#   ./scripts/vercel-env.sh list          # List env var names (no values)
#   ./scripts/vercel-env.sh deploy        # Trigger preview deploy
#   ./scripts/vercel-env.sh deploy prod   # Trigger production deploy
#
# Reads VERCEL_TOKEN + VERCEL_ORG_ID from ~/.claude/.env.tokens
# Reads VERCEL_PROJECT_ID from .env.local

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"
GLOBAL_TOKENS="$HOME/.claude/.env.tokens"

# ── helpers ──────────────────────────────────────────────────────────────────

die() { echo "ERROR: $*" >&2; exit 1; }

read_var() {
  local file="$1" key="$2"
  { grep -E "^${key}=" "$file" 2>/dev/null || true; } | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# ── load credentials ─────────────────────────────────────────────────────────

[[ -f "$GLOBAL_TOKENS" ]] || die "~/.claude/.env.tokens not found. Run ~/.claude/scripts/bootstrap-project.sh first."

VERCEL_TOKEN="$(read_var "$GLOBAL_TOKENS" VERCEL_TOKEN)"
VERCEL_ORG_ID="$(read_var "$GLOBAL_TOKENS" VERCEL_ORG_ID)"

[[ -n "$VERCEL_TOKEN" ]] || die "VERCEL_TOKEN not set in $GLOBAL_TOKENS"
[[ -n "$VERCEL_ORG_ID" ]] || die "VERCEL_ORG_ID not set in $GLOBAL_TOKENS"

[[ -f "$ENV_FILE" ]] || die "$ENV_FILE not found."

VERCEL_PROJECT_ID="$(read_var "$ENV_FILE" VERCEL_PROJECT_ID)"
[[ -n "$VERCEL_PROJECT_ID" ]] || die "VERCEL_PROJECT_ID not set in $ENV_FILE"

API="https://api.vercel.com"
AUTH="Authorization: Bearer $VERCEL_TOKEN"

# ── commands ─────────────────────────────────────────────────────────────────

cmd_pull() {
  echo "Pulling env vars from Vercel..."

  local response
  response="$(curl -sS -H "$AUTH" \
    "${API}/v9/projects/${VERCEL_PROJECT_ID}/env?teamId=${VERCEL_ORG_ID}&decrypt=true" 2>&1)"

  # Check for API errors
  local error_msg
  error_msg="$(echo "$response" | jq -r '.error.message // empty' 2>/dev/null)"
  if [[ -n "$error_msg" ]]; then
    die "Vercel API error: $error_msg"
  fi

  # Parse env vars — only development target
  local vars
  vars="$(echo "$response" | jq -r '
    .envs[]
    | select(.target | if type == "array" then (. | index("development")) else . == "development" end)
    | "\(.key)=\(.value)"
  ' 2>/dev/null)"

  if [[ -z "$vars" ]]; then
    echo "No development env vars found for this project."
    return 0
  fi

  # Build new .env.local preserving manual entries
  local tmp_file
  tmp_file="$(mktemp)"

  # Keep existing lines that are manual (not from Vercel API, not blank)
  local pulled_keys
  pulled_keys="$(echo "$vars" | cut -d'=' -f1)"

  if [[ -f "$ENV_FILE" ]]; then
    while IFS= read -r line; do
      # Skip empty lines and comments at end
      [[ -z "$line" ]] && continue
      # Keep comments
      if [[ "$line" == \#* ]]; then
        # Skip old vercel markers
        [[ "$line" == "# [vercel]"* ]] && continue
        echo "$line" >> "$tmp_file"
        continue
      fi
      # Keep lines whose key is NOT in pulled vars
      local key="${line%%=*}"
      if ! echo "$pulled_keys" | grep -qx "$key"; then
        echo "$line" >> "$tmp_file"
      fi
    done < "$ENV_FILE"
  fi

  # Ensure VERCEL_PROJECT_ID is preserved
  if ! grep -q "^VERCEL_PROJECT_ID=" "$tmp_file" 2>/dev/null; then
    echo "VERCEL_PROJECT_ID=$VERCEL_PROJECT_ID" >> "$tmp_file"
  fi

  # Ensure SUPABASE_DB_URL is preserved
  local existing_db_url
  existing_db_url="$(read_var "$ENV_FILE" SUPABASE_DB_URL)"
  if [[ -n "$existing_db_url" ]] && ! grep -q "^SUPABASE_DB_URL=" "$tmp_file" 2>/dev/null; then
    echo "SUPABASE_DB_URL=$existing_db_url" >> "$tmp_file"
  fi

  # Add pulled vars
  echo "" >> "$tmp_file"
  echo "# [vercel] Pulled $(date +%Y-%m-%d) — do not edit manually" >> "$tmp_file"
  echo "$vars" >> "$tmp_file"

  mv "$tmp_file" "$ENV_FILE"

  local count
  count="$(echo "$vars" | wc -l | tr -d ' ')"
  echo "Pulled $count env vars into .env.local"
}

cmd_list() {
  echo "Env vars for project $VERCEL_PROJECT_ID:"
  echo ""

  curl -sS -H "$AUTH" \
    "${API}/v9/projects/${VERCEL_PROJECT_ID}/env?teamId=${VERCEL_ORG_ID}" \
    | jq -r '.envs[] | "  \(.key)  [\(.target | if type == "array" then join(",") else . end)]"' \
    | sort

  echo ""
}

cmd_deploy() {
  local target="${1:-preview}"
  local branch
  branch="$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")"

  # Nome do projeto e repoId numérico vêm da API do Vercel — o basename do
  # diretório local pode ser inválido (maiúsculas) e o v13 não aceita
  # "owner/repo" como repoId.
  local project_info project_name repo_id
  project_info="$(curl -sS -H "$AUTH" "${API}/v9/projects/${VERCEL_PROJECT_ID}?teamId=${VERCEL_ORG_ID}")"
  project_name="$(echo "$project_info" | jq -r '.name // empty')"
  repo_id="$(echo "$project_info" | jq -r '.link.repoId // empty')"
  [[ -n "$project_name" ]] || die "Could not resolve project name from Vercel API."
  [[ -n "$repo_id" ]] || die "Project has no linked GitHub repo (link.repoId vazio)."

  echo "Deploying $project_name@$branch ($target)..."

  local payload
  if [[ "$target" == "prod" || "$target" == "production" ]]; then
    payload="{\"name\":\"$project_name\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"ref\":\"$branch\",\"repoId\":$repo_id}}"
  else
    payload="{\"name\":\"$project_name\",\"gitSource\":{\"type\":\"github\",\"ref\":\"$branch\",\"repoId\":$repo_id}}"
  fi

  local response
  response="$(curl -sS -X POST -H "$AUTH" -H "Content-Type: application/json" \
    "${API}/v13/deployments?teamId=${VERCEL_ORG_ID}" \
    -d "$payload" 2>&1)"

  local deploy_url
  deploy_url="$(echo "$response" | jq -r '.url // empty' 2>/dev/null)"
  local error_msg
  error_msg="$(echo "$response" | jq -r '.error.message // empty' 2>/dev/null)"

  if [[ -n "$error_msg" ]]; then
    die "Deploy failed: $error_msg"
  elif [[ -n "$deploy_url" ]]; then
    echo "Deploy triggered: https://$deploy_url"
  else
    echo "Deploy response:"
    echo "$response" | jq . 2>/dev/null || echo "$response"
  fi
}

# ── main ─────────────────────────────────────────────────────────────────────

case "${1:-help}" in
  pull)   cmd_pull ;;
  list)   cmd_list ;;
  deploy) cmd_deploy "${2:-preview}" ;;
  *)
    echo "Usage: $0 {pull|list|deploy [prod|preview]}"
    echo ""
    echo "  pull     Pull env vars from Vercel into .env.local"
    echo "  list     List env var names and targets (no values)"
    echo "  deploy   Trigger a deploy (default: preview, or 'prod')"
    exit 1
    ;;
esac
