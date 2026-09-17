#!/usr/bin/env bash
# Publica a memória do projeto (.context/memoria/) e deixa o clone limpo.
#
# O agente escreve a memória direto no clone principal, via symlink. O clone
# fica em `main` e é read-only por convenção, então o que ele escreve nasce
# como mudança local — e é aí que mora a fricção que este script existe para
# fechar:
#
#   1. publicar exige worktree, porque commit direto na main é bloqueado;
#   2. depois do merge, o clone continua com as MESMAS linhas como mudança
#      local, e `git pull` recusa sobrescrevê-las;
#   3. o `git checkout --` que resolveria é bloqueado pelo hook de sessão
#      paralela — com razão: restaurar arquivo apaga o que outra sessão esteja
#      editando naquele exato caminho.
#
# Fazer isso à mão significa acertar os três passos toda vez. Aqui é um comando,
# e o descarte do passo 3 só acontece depois de provar, arquivo por arquivo, que
# o conteúdo local é idêntico ao que acabou de ser publicado.
#
# O merge espera o CI. Publicar memória é quase sempre markdown inofensivo, mas
# "quase sempre" não é gate: o Semgrep e o scan de segredos rodam nesses PRs e,
# sem espera, o merge acontece antes de eles falarem. Um segredo colado por
# engano num fato entraria na `main` com o alarme ainda tocando.
#
# Em repo que exige aprovação humana no PR, o merge para mesmo com o CI verde e
# o passo 3 nunca acontece sozinho: o clone fica com as linhas publicadas como
# mudança local, que é exatamente a fricção que este script existe para fechar.
# `--admin` resolve isso mergeando com privilégio de administrador — e é opt-in
# de propósito. Contornar revisão obrigatória é decisão de quem roda, não default
# de script: só passe a flag em repo onde o self-merge já é a sua convenção.
#
# Uso:
#   scripts/publicar-memoria.sh [--repo <path>] [--titulo "..."] [--sem-merge]
#                               [--sem-ci] [--timeout-ci <segundos>] [--admin]
#
set -euo pipefail

REPO="$(pwd)"
TITULO=""
MERGE=1
ESPERAR_CI=1
TIMEOUT_CI=900
ADMIN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)      REPO="$2"; shift 2 ;;
    --titulo)    TITULO="$2"; shift 2 ;;
    --sem-merge) MERGE=0; shift ;;
    --sem-ci)    ESPERAR_CI=0; shift ;;
    --admin)     ADMIN=1; shift ;;
    --timeout-ci) TIMEOUT_CI="$2"; shift 2 ;;
    -h|--help)   sed -n '2,/^set -euo/p' "$0" | sed '$d'; exit 0 ;;
    *) echo "flag desconhecida: $1" >&2; exit 2 ;;
  esac
done

# `--admin` existe para contornar revisão humana, não verificação. Juntas, as duas
# flags mergeariam sem CI e sem review — nenhum gate de pé, que é o oposto do que
# a espera de CI protege (um segredo colado por engano num fato).
if [ "$ADMIN" -eq 1 ] && [ "$ESPERAR_CI" -eq 0 ]; then
  echo "--admin com --sem-ci deixaria o merge sem nenhum gate. Escolha um." >&2
  exit 2
fi

cd "$REPO"
REPO="$(git rev-parse --show-toplevel)"
cd "$REPO"
MEM=".context/memoria"

[ -d "$MEM" ] || { echo "sem $MEM neste repo — nada a publicar." >&2; exit 1; }

# O que mudou: modificados + novos. `-uall` é obrigatório: sem ele, uma pasta
# `.context/memoria/` recém-criada aparece como UM diretório em vez dos arquivos,
# e a cópia para o worktree falha ("No such file or directory") — que é
# exatamente o caso do projeto que acabou de ser adotado, o mais comum aqui.
# Laço em vez de `mapfile`: o bash que vem no macOS é o 3.2, que não o tem.
ALVOS=()
while IFS= read -r linha; do
  [ -n "$linha" ] && ALVOS+=("$linha")
done < <(git status --porcelain -uall -- "$MEM" | awk '{print $2}')

if [ "${#ALVOS[@]}" -eq 0 ]; then
  echo "memória em dia — nada a publicar."
  exit 0
fi

git fetch origin -q
DEFAULT="$(git symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)"
DEFAULT="${DEFAULT#origin/}"

# O `git` deste clone pode resolver pelo osxkeychain enquanto o `gh` está logado
# na conta de outro repositório — aí o push funciona e o `gh pr create` morre com
# `Could not resolve to a Repository`, que lê como repo inexistente. O resultado é
# pior do que falhar cedo: a branch já subiu e fica órfã, sem PR. Testa as contas
# de `gh auth status` e usa a que enxerga o repositório, só neste processo.
if [ -z "${GH_TOKEN:-}${GITHUB_TOKEN:-}" ] && ! gh repo view --json name >/dev/null 2>&1; then
  for _c in $(gh auth status 2>&1 | sed -n 's/.*account \([A-Za-z0-9_-]*\).*/\1/p' | sort -u); do
    _t="$(gh auth token -u "$_c" 2>/dev/null || true)"
    [ -n "$_t" ] || continue
    if GH_TOKEN="$_t" gh repo view --json name >/dev/null 2>&1; then
      export GH_TOKEN="$_t"
      echo "conta gh: $_c (a ativa não enxerga este repositório)"
      break
    fi
  done
  unset _c _t
  if ! gh repo view --json name >/dev/null 2>&1; then
    echo "erro: nenhuma conta do gh enxerga este repositório — 'gh auth login' na conta dona do repo." >&2
    exit 1
  fi
fi

# O conteúdo local é uma versão que a base JÁ TEVE e já substituiu?
#
# É o resíduo de quem publicou de um worktree: lá a memória foi editada e subiu,
# aqui o arquivo ficou como estava antes. O git deste clone não sabe distinguir
# isso de conteúdo novo — os dois aparecem como "modificado" —, e tratar como
# novo republica a versão velha POR CIMA da nova, desfazendo a atualização em
# silêncio (30/08/2026, zullo-imoveis: três memórias perderiam o aviso de
# "superado em …" que o worktree tinha acabado de publicar).
#
# A prova é o blob: se o conteúdo daqui é exatamente alguma versão anterior do
# arquivo na base, ele não tem nada de inédito para publicar. Vinte commits de
# histórico por arquivo cobrem qualquer sessão real e mantêm isto barato.
eh_superado() {
  local f="$1" h c
  h="$(git hash-object -- "$f" 2>/dev/null)" || return 1
  [ -n "$h" ] || return 1
  for c in $(git rev-list -n 20 "origin/$DEFAULT" -- "$f" 2>/dev/null); do
    [ "$(git rev-parse -q --verify "$c:$f" 2>/dev/null)" = "$h" ] && return 0
  done
  return 1
}

# Descarta as linhas locais que a base já resolveu — idênticas ao publicado ou
# versão superada dele — e avança o clone.
# Confere arquivo por arquivo antes: memória perdida não volta.
sincronizar_clone() {
  local f
  for f in "$@"; do
    diff -q <(git show "origin/$DEFAULT:$f" 2>/dev/null) "$f" >/dev/null 2>&1 && continue
    eh_superado "$f" && continue
    echo "ABORTADO: '$f' difere do publicado — foi reescrito no meio do caminho." >&2
    echo "Rode de novo para publicar a versão nova; nada foi descartado." >&2
    exit 1
  done
  for f in "$@"; do
    if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      git checkout -- "$f"      # rastreado: volta ao HEAD, que o pull avança
    else
      rm -f "$f"                # novo: vem de volta no pull, idêntico
    fi
  done
  git merge --ff-only "origin/$DEFAULT" -q 2>/dev/null \
    || echo "aviso: clone não avançou sozinho (branch local à frente ou divergente)." >&2
}

# O clone é compartilhado e quem commita `.context/memoria` leva o que estiver
# pendente ali, tenha escrito ou não. Então outra sessão pode ter publicado estes
# mesmos arquivos enquanto esta ainda rodava — e republicar o que já está na base
# gera um PR que conflita consigo mesmo. Foi o que aconteceu em 28/08/2026: o índice
# recebeu as mesmas duas linhas por dois caminhos e o merge virou impossível.
PENDENTES=()
JA=()
SUPERADOS=()
for f in "${ALVOS[@]}"; do
  if diff -q <(git show "origin/$DEFAULT:$f" 2>/dev/null) "$f" >/dev/null 2>&1; then
    JA+=("$f")
  elif eh_superado "$f"; then
    SUPERADOS+=("$f")
  else
    PENDENTES+=("$f")
  fi
done

if [ "${#JA[@]}" -gt 0 ]; then
  echo "já na $DEFAULT, publicado por outra sessão (${#JA[@]}):"
  printf '  %s\n' "${JA[@]}"
fi

if [ "${#SUPERADOS[@]}" -gt 0 ]; then
  echo "superado — a $DEFAULT tem versão MAIS NOVA destes (${#SUPERADOS[@]}):"
  printf '  %s\n' "${SUPERADOS[@]}"
  echo "  (publicados de um worktree; o que está aqui é a versão anterior e será descartada)"
fi

# Resolvidos os dois casos ANTES de publicar: eles não dependem do PR, e deixar
# para o fim faria o clone continuar sujo sempre que o merge não acontecesse
# (--sem-merge, revisão humana pendente, CI vermelho).
RESOLVIDOS=(${JA[@]+"${JA[@]}"} ${SUPERADOS[@]+"${SUPERADOS[@]}"})
if [ "${#RESOLVIDOS[@]}" -gt 0 ]; then
  sincronizar_clone "${RESOLVIDOS[@]}"
fi

if [ "${#PENDENTES[@]}" -eq 0 ]; then
  echo "nada a publicar — o que estava aqui já está na $DEFAULT. Clone sincronizado: $(git rev-parse --short HEAD)"
  exit 0
fi

ALVOS=("${PENDENTES[@]}")
echo "a publicar (${#ALVOS[@]}):"
printf '  %s\n' "${ALVOS[@]}"

BRANCH="docs/memoria-$(date +%Y%m%d-%H%M%S)"
WT="$(mktemp -d)/memoria"

# Worktree a partir do remoto, não do HEAD local: o clone pode estar atrás, e
# publicar em cima de base velha ressuscitaria memória apagada.
git worktree add -q -b "$BRANCH" "$WT" "origin/$DEFAULT"
trap 'git worktree remove --force "$WT" 2>/dev/null || true' EXIT

for f in "${ALVOS[@]}"; do
  mkdir -p "$WT/$(dirname "$f")"
  cp "$REPO/$f" "$WT/$f"
done

cd "$WT"
git add -- "$MEM"
git commit -q -m "${TITULO:-docs(memoria): publica o que a sessão registrou}

Memória escrita pelo agente nesta sessão, publicada pelo
scripts/publicar-memoria.sh."
git push -q -u origin "$BRANCH"

PR_URL="$(gh pr create --base "$DEFAULT" --head "$BRANCH" \
  --title "${TITULO:-docs(memoria): publica o que a sessão registrou}" \
  --body "Memória escrita pelo agente, publicada por \`scripts/publicar-memoria.sh\`.

Arquivos: ${#ALVOS[@]}" 2>&1 | tail -1)"
echo "PR: $PR_URL"

if [ "$MERGE" -eq 0 ]; then
  echo "--sem-merge: revise e mergeie o PR; rode de novo depois para limpar o clone."
  exit 0
fi

# Quais checks a branch base realmente exige. Só eles podem impedir um merge:
# é o que o GitHub aplica, e ler o rollup inteiro como se fosse obrigatório
# transforma qualquer job opcional vermelho num bloqueio que não existe. Foi o
# que aconteceu em 26/08/2026 no intelligent-car-care: o "Deploy Preview" falhava
# por um token Vercel inválido — nada a ver com o conteúdo publicado, e não
# required — e ainda assim o script recusou o merge e mandou "corrija".
#
# Sem permissão de admin o endpoint de proteção responde 403/404. Aí não dá para
# saber o que é obrigatório, e o certo é continuar tratando todo check como
# bloqueante: é o lado seguro do erro.
REQUIRED=""
TEM_REQUIRED=0
descobrir_required() {
  local json
  json="$(gh api "repos/{owner}/{repo}/branches/$DEFAULT/protection" \
            --jq '.required_status_checks.contexts[]?' 2>/dev/null)" || return 0
  [ -n "$json" ] || return 0
  REQUIRED="$json"
  TEM_REQUIRED=1
}

# `$1` é o nome de um check; responde se ele pode barrar o merge.
eh_required() {
  [ "$TEM_REQUIRED" -eq 0 ] && return 0
  printf '%s\n' "$REQUIRED" | grep -Fxq -- "$1"
}

# Filtra uma lista de nomes de check (uma por linha), deixando só os required.
so_required() {
  local nome
  [ "$TEM_REQUIRED" -eq 0 ] && { cat; return 0; }
  while IFS= read -r nome; do
    [ -n "$nome" ] && eh_required "$nome" && printf '%s\n' "$nome"
  done
}

# Espera o CI antes de mergear. Fail-fast: o primeiro check vermelho encerra,
# em vez de aguardar os outros — quem falhou já respondeu a pergunta.
#
# Um check sem `conclusion` ainda está correndo; `SKIPPED`/`NEUTRAL` contam como
# passados (neste repo o Build e o Tests são pulados de propósito em PR que não
# toca código de app). A ausência total de checks é tratada como repo sem CI,
# mas só depois de uma carência: eles levam alguns segundos para aparecer, e ler
# "zero checks" cedo demais é o mesmo erro que não esperar.
esperar_ci() {
  local inicio agora estado pend falhou n ausentes avisou nome opcional
  inicio=$(date +%s)
  avisou=0
  descobrir_required
  while :; do
    estado="$(gh pr view "$PR_URL" --json statusCheckRollup \
      --jq '[(.statusCheckRollup // [])[]
             | {n: (.name // .context // "check"),
                c: ((.conclusion // .state // "") | ascii_upcase)}]
            | .[] | "\(.n)\t\(.c)"' 2>/dev/null || true)"

    n=$(printf '%s' "$estado" | grep -c . || true)
    falhou="$(printf '%s\n' "$estado" | awk -F'\t' \
      '$2 ~ /FAILURE|ERROR|TIMED_OUT|CANCELLED|ACTION_REQUIRED|STARTUP_FAILURE/ {print $1}')"
    pend="$(printf '%s\n' "$estado" | awk -F'\t' \
      '$2 == "" || $2 ~ /PENDING|QUEUED|IN_PROGRESS|EXPECTED|WAITING/ {print $1}')"

    # Um required que a branch exige mas que ainda não apareceu no rollup conta
    # como pendente. Sem isto o script mergearia na janela entre o PR abrir e o
    # job obrigatório ser agendado — justamente o que a espera existe para evitar.
    ausentes=""
    if [ "$TEM_REQUIRED" -eq 1 ]; then
      while IFS= read -r nome; do
        [ -n "$nome" ] || continue
        printf '%s\n' "$estado" | cut -f1 | grep -Fxq -- "$nome" || ausentes="$ausentes$nome
"
      done <<EOF_REQ
$REQUIRED
EOF_REQ
    fi

    # Vermelho que a base não exige não impede merge — mas some do relatório se
    # ninguém disser nada, então avisa uma vez e segue.
    if [ -n "$falhou" ] && [ "$avisou" -eq 0 ]; then
      opcional="$(printf '%s\n' "$falhou" | while IFS= read -r nome; do
        [ -n "$nome" ] && ! eh_required "$nome" && printf '%s\n' "$nome"
      done)"
      if [ -n "$opcional" ]; then
        echo "check(s) vermelho(s) que a $DEFAULT não exige — não bloqueiam o merge:" >&2
        printf '%s\n' "$opcional" | sed 's/^/  /' >&2
        avisou=1
      fi
    fi

    falhou="$(printf '%s\n' "$falhou" | so_required)"
    pend="$(printf '%s\n' "$pend" | so_required)"
    pend="$(printf '%s\n%s' "$pend" "$ausentes" | grep -v '^$' || true)"

    if [ -n "$falhou" ]; then
      # sem aspas o printf quebraria "ci / Quality" em três linhas
      echo "CI VERMELHO — nada foi mergeado:" >&2
      printf '%s\n' "$falhou" | sed 's/^/  /' >&2
      echo "PR aberto em $PR_URL. Corrija, e rode de novo para publicar." >&2
      return 1
    fi

    agora=$(date +%s)
    if [ "$n" -eq 0 ]; then
      # sem checks: carência de 45s antes de concluir que o repo não tem CI
      [ $((agora - inicio)) -ge 45 ] && { echo "sem checks neste repo — seguindo."; return 0; }
    elif [ -z "$pend" ]; then
      echo "CI verde ($n checks)."
      return 0
    fi

    if [ $((agora - inicio)) -ge "$TIMEOUT_CI" ]; then
      echo "CI não concluiu em ${TIMEOUT_CI}s — nada foi mergeado." >&2
      if [ "$n" -eq 0 ]; then
        echo "  nenhum check apareceu" >&2
      else
        echo "  ainda correndo:" >&2
        printf '%s\n' "$pend" | sed 's/^/    /' >&2
      fi
      echo "PR aberto em $PR_URL." >&2
      return 1
    fi
    sleep 15
  done
}

if [ "$ESPERAR_CI" -eq 1 ]; then
  esperar_ci || exit 1
fi

# A base pode ter andado enquanto o CI corria. Sem rebase, o merge morre com
# "the merge commit cannot be cleanly created" e o PR fica órfão — o índice é
# append-only, então o conflito é quase sempre duas publicações no mesmo trecho.
git fetch origin -q
if ! git merge-base --is-ancestor "origin/$DEFAULT" HEAD 2>/dev/null; then
  echo "a $DEFAULT andou durante o CI — rebaseando."
  if git rebase "origin/$DEFAULT" -q; then
    git push -q --force-with-lease
    # História nova, CI novo: mergear com o verde do commit anterior seria furar
    # o próprio gate.
    [ "$ESPERAR_CI" -eq 1 ] && { esperar_ci || exit 1; }
  else
    git rebase --abort 2>/dev/null || true
    echo "conflito ao rebasear em origin/$DEFAULT — nada foi mergeado." >&2
    echo "PR aberto em $PR_URL; resolva o conflito ali e mergeie à mão." >&2
    exit 1
  fi
fi

MERGE_ARGS=(--squash --delete-branch)
if [ "$ADMIN" -eq 1 ]; then
  MERGE_ARGS+=(--admin)
  # Bypass de proteção de branch fica no relatório: quem lê o log depois precisa
  # saber que este merge não passou por revisão.
  echo "--admin: mergeando com privilégio de administrador (sem revisão humana)."
fi

SAIDA_MERGE="$(gh pr merge "$PR_URL" "${MERGE_ARGS[@]}" 2>&1 | grep -v "fatal: '$DEFAULT'" || true)"
[ -n "$SAIDA_MERGE" ] && printf '%s\n' "$SAIDA_MERGE"

if [ "$(gh pr view "$PR_URL" --json state -q .state)" != "MERGED" ]; then
  echo "PR não mergeou — clone fica como está." >&2
  # A saída do gh nomeia a causa; quando é a proteção da branch, a saída existe e
  # é opt-in, então dizer isso aqui poupa a descoberta na segunda tentativa.
  if [ "$ADMIN" -eq 0 ] && printf '%s' "$SAIDA_MERGE" \
       | grep -qiE "base branch policy|protected branch|required|not mergeable"; then
    echo "A $DEFAULT exige aprovação. Se o self-merge é a convenção deste repo," >&2
    echo "rode de novo com --admin; a memória já está no PR, nada se perde." >&2
  fi
  exit 1
fi

cd "$REPO"
git fetch origin -q
sincronizar_clone "${ALVOS[@]}"
echo "publicado e sincronizado: $(git rev-parse --short HEAD) · $(ls "$MEM"/*.md | wc -l | tr -d ' ') fatos"
