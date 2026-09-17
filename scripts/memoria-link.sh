#!/usr/bin/env bash
# Liga a memória do Claude Code à memória versionada do projeto.
#
# O agente escreve em ~/.claude/projects/<slug>/memory, que é local e invisível
# para o resto do time. Quando o projeto tem `.context/memoria/`, esse diretório
# vira um symlink para lá — e tudo que o agente registrar nasce dentro do
# repositório.
#
# Sem argumento nenhum, varre TODOS os projetos que o Claude Code conhece e liga
# os que têm a pasta. É o que o `update.sh` chama, então na prática ninguém
# precisa rodar isto à mão.
#
#   scripts/memoria-link.sh                 # varre tudo (idempotente)
#   scripts/memoria-link.sh --repo <path>   # só um projeto
#   scripts/memoria-link.sh --adotar        # cria .context/memoria/ onde falta
#   scripts/memoria-link.sh --dry-run       # mostra o que faria
#
# `--adotar` e `--repo` também escrevem o `README.md` do formato onde ele falta.
#
set -euo pipefail

PROJ_DIR="$HOME/.claude/projects"
ALVO=""
DRY=0
ADOTAR=0
LIGADOS=0
JA=0
AVISOS=0
SEM_README=0
README_NOVO=0

while [ $# -gt 0 ]; do
  case "$1" in
    --repo)    ALVO="$2"; shift 2 ;;
    --adotar)  ADOTAR=1; shift ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "flag desconhecida: $1" >&2; exit 2 ;;
  esac
done

diz() { printf '%s\n' "$*"; }

# O nome do diretório de projeto é o caminho com TODO caractere fora de [a-zA-Z0-9]
# virando '-'. Não é só a barra: espaço, ponto, '+' e '_' entram na conta.
#
# Medido em 26/08/2026 contra os 125 diretórios desta máquina — 87 batem com esta
# regra e os outros 38 são diretórios de worktree, cujo transcript grava o `cwd` do
# clone (a sessão começou lá). Trocar só '/' e espaço, como estava aqui, gera slug
# certo para clone e ERRADO para todo worktree — o caminho tem `.claude`, e o ponto
# ficava intacto. Era por isso que worktree nenhum era ligado, mesmo quando o loop
# chegava nele.
slug_de() { printf '%s' "$1" | LC_ALL=C tr -c 'a-zA-Z0-9' '-' | sed 's/-$//'; }

# O clone que é dono de um caminho: worktree devolve o repo de onde ele saiu.
# `<repo>/.claude/worktrees/<nome>` → `<repo>`.
clone_dono() {
  case "$1" in
    */.claude/worktrees/*) printf '%s' "${1%%/.claude/worktrees/*}" ;;
    *) printf '%s' "$1" ;;
  esac
}

# Fato é o que o agente registra; README e MEMORY.md são andaime — formato e
# índice. Contar os três juntos inflava o número que o `--dry-run` mostra.
conta_fatos() {
  local d="$1" n=0 f
  for f in "$d"/*.md; do
    [ -e "$f" ] || continue
    case "$(basename "$f")" in README.md|MEMORY.md) continue ;; esac
    n=$((n + 1))
  done
  printf '%s' "$n"
}

# A skill `memoria-projeto` manda ler o formato em `.context/memoria/README.md` e,
# em 26/08/2026, nenhum dos 14 projetos adotados tinha o arquivo: quem abria a pasta
# pelo repositório — o time, o Codex, o Grok — via uma pilha de markdown sem saber o
# que torna um fato bom, nem que credencial não entra ali. O ato de adotar é o único
# momento em que dá para garantir isso sem depender de alguém lembrar.
#
# Nunca sobrescreve: README editado à mão é decisão do projeto.
escrever_readme() {
  local mem="$1"
  [ -d "$mem" ] || return 0
  [ -e "$mem/README.md" ] && return 0
  [ "$DRY" -eq 1 ] && { diz "→  escreveria $mem/README.md"; return 0; }

  cat > "$mem/README.md" <<'MD'
# Memória do projeto

Cada `.md` desta pasta é **um fato**. O `MEMORY.md` é o índice que o agente lê no
começo de toda sessão — uma linha por fato, nunca o conteúdo.

A pasta é versionada de propósito: memória que fica na máquina de quem escreveu é
invisível para o resto do time e para os outros agentes.

## Formato

```markdown
---
name: <slug-kebab-case, igual ao nome do arquivo sem .md>
description: <uma linha; é por ela que o agente decide se o fato é relevante>
metadata:
  type: user | feedback | project | reference
---

<o fato. Em `feedback` e `project`, siga com as linhas **Why:** e **How to apply:**>
```

| type | o que guarda |
|---|---|
| `user` | quem é a pessoa: papel, preferências, como quer ser respondida |
| `feedback` | como trabalhar aqui — correção ou caminho confirmado, sempre com o porquê |
| `project` | objetivo, restrição ou estado em curso que o código e o git log não contam |
| `reference` | ponteiro externo: URL, dashboard, ticket |

Ligue fatos relacionados com `[[nome-do-outro-fato]]`. Link para um fato que ainda
não existe é aceitável — marca o que vale escrever depois.

## O que faz um fato valer a pena

1. **Registre o porquê, não o quê.** "A migration 119 removeu o gate" é git log.
   "Usar o carimbo fiscal como gate travava 19 dos 23 negócios porque ele é o lote
   de importação, não a precificação" é memória.
2. **Separe verificado de acreditado**, com essas palavras. Inferência tratada como
   fato manda a próxima sessão investigar o lugar errado com confiança.
3. **Data absoluta.** "Semana passada" não sobrevive a três sessões.
4. **Sem credencial.** Escreva onde o valor vive — `SUPABASE_DB_URL` no `.env.local`,
   item do 1Password —, nunca o valor. Versionar memória é distribuí-la.

Fato que se provou errado se **apaga**. Memória errada é lida com confiança e
ninguém re-checa: é pior que memória faltando.

## Publicar

Escrever aqui deixa o fato no clone, não no repositório. Antes de fechar a sessão:

```bash
git status --short .context/memoria/     # tem linha? falta publicar
~/.claude/scripts/publicar-memoria.sh --titulo "docs(memoria): ..."
```
MD
  README_NOVO=1
  diz "   README.md do formato criado em $mem"
}

# O caminho real de um projeto vem do `cwd` gravado no transcript — derivar do
# nome do diretório é ambíguo assim que o repo tem hífen no nome.
caminho_de() {
  local d="$1" jsonl
  jsonl="$(ls -t "$d"/*.jsonl 2>/dev/null | head -1 || true)"
  [ -n "$jsonl" ] || return 1
  grep -o '"cwd":"[^"]*"' "$jsonl" 2>/dev/null | head -1 | sed 's/.*"cwd":"//; s/"$//'
}

# `caminho_de` depende do transcript, e a instância poda os `.jsonl` antigos.
# Projeto sem transcript perdia o caminho e o loop dava `continue` SEM UMA LINHA
# de aviso: 131 fatos em 3 projetos (ZULLO 105, PROSPECTIQ 19, VERITAS 7) estavam
# presos na máquina desde sempre, e a varredura terminava dizendo que estava tudo
# em dia.
#
# Reverter o slug é impossível — `tr -c 'a-zA-Z0-9' '-'` é lossy, '/', ' ', '.' e
# '_' viram todos '-'. O caminho é o contrário: slugar os diretórios REAIS e ver
# qual bate. Só aceita resposta única; empate é ambiguidade, e ambiguidade vira
# aviso em vez de palpite.
caminho_por_slug() {
  local alvo="$1" c hit="" n=0
  for c in "$HOME"/*/ "$HOME"/WORKSPACES/*/ "$HOME"/WORKSPACES/*/*/ "$HOME"/orca/projects/*/; do
    [ -d "$c" ] || continue
    c="${c%/}"
    [ "$(slug_de "$c")" = "$alvo" ] || continue
    hit="$c"; n=$((n + 1))
  done
  [ "$n" -eq 1 ] || return 1
  printf '%s' "$hit"
}

# Memória que não achou destino não pode sair calada — era esse o silêncio.
relatar_sem_caminho() {
  local d="$1" n
  # Sem o guard, `find` num diretório que não existe falha e o `pipefail` derruba
  # a varredura inteira no primeiro projeto sem `memory/`.
  [ -d "$d/memory" ] || return 0
  n="$(find "$d/memory" -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ' || true)"
  [ "${n:-0}" -gt 0 ] || return 0
  diz "!  $(basename "$d"): $n fato(s) presos na máquina — sem transcript e o slug"
  diz "   não resolve para um diretório único. Ligue à mão, se o projeto ainda existir:"
  diz "   scripts/memoria-link.sh --repo <caminho-do-repo>"
  AVISOS=$((AVISOS + 1))
}

# Segredo cru na memória. O padrão da connection string exige que a senha NÃO
# comece com '<', '$' ou '*': `<SENHA>`, `$SUPABASE_PASS` e `******` são o
# conserto, não o problema — travar neles ensina a contornar o gate.
# Segredo cru na memória: o levantamento de 24/08/2026 achou 6 arquivos com
# credencial real (API key do n8n, connection string com senha) entre 543 fatos
# de 14 projetos. Adotar sem olhar teria commitado credencial de cliente no repo
# do cliente. Versionar memória é distribuí-la — o gate não é opcional.
tem_segredo() {
  local dir="$1"
  find "$dir" -name '*.md' -type f -print0 2>/dev/null \
    | xargs -0 grep -lniE "eyJ[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{20,}|xoxb-[A-Za-z0-9-]{20,}|postgres(ql)?://[^ :@]+:[^ @<$*]{6,}@|AKIA[0-9A-Z]{16}" 2>/dev/null
}

# Cria a pasta versionada e leva a memória local para dentro do repositório.
adotar() {
  local repo="$1" mem dir slug achados
  mem="$repo/.context/memoria"
  slug="$(slug_de "$repo")"
  dir="$PROJ_DIR/$slug/memory"

  # Aqui `.context/memoria` NÃO existe — é o que trouxe o fluxo até `adotar`. Um
  # symlink apontando para ela é link QUEBRADO, e o agente grava nele achando que
  # salvou: o arquivo não fica em lugar nenhum. Contar isso como "já em dia", ou
  # cair no "sem memória local" logo abaixo (link quebrado não passa no `-d`),
  # escondia exatamente o caso que mais dói.
  if [ -L "$dir" ]; then
    if [ -e "$dir" ]; then
      JA=$((JA + 1))
      [ -n "$ALVO" ] && diz "•  $repo: já ligado → $(readlink "$dir")"
    else
      diz "!  $repo: 'memory' aponta para $(readlink "$dir"), que não existe — link quebrado."
      diz "   Rode sem --repo para limpar, ou aponte o repo certo com --repo <caminho>."
      AVISOS=$((AVISOS + 1))
    fi
    return 0
  fi

  [ -d "$dir" ] || { diz "•  $repo: sem memória local — nada a adotar."; return 0; }

  # Sem repositório não há o que versionar: criar `.context/memoria/` no home ou
  # numa pasta solta só espalha arquivo que ninguém vai commitar.
  if [ ! -d "$repo/.git" ]; then
    diz "•  $repo: não é repositório git — memória fica local."
    return 0
  fi

  achados="$(tem_segredo "$dir" || true)"
  if [ -n "$achados" ]; then
    diz "✗  $repo NÃO adotado — credencial na memória:"
    printf '     %s\n' $(printf '%s\n' "$achados" | xargs -n1 basename)
    diz "   Troque o valor por onde ele vive (1Password, .env) e rode de novo."
    AVISOS=$((AVISOS + 1))
    return 0
  fi

  if [ "$DRY" -eq 1 ]; then
    diz "→  adotaria $repo ($(conta_fatos "$dir") fato(s))"
    LIGADOS=$((LIGADOS + 1))
    return 0
  fi

  mkdir -p "$mem"
  ligar "$repo"
}

ligar() {
  local repo="$1" mem dir slug backup base n
  mem="$repo/.context/memoria"
  [ -d "$mem" ] || return 0
  README_NOVO=0   # global: sem zerar, o segundo repo da varredura herda o do primeiro

  # Escrever o README é intenção explícita (--adotar / --repo). Na varredura que o
  # `update.sh` dispara sozinho, só conta: ninguém quer 14 repositórios de cliente
  # com arquivo novo não commitado depois de um comando que era só de sincronizar.
  if [ ! -e "$mem/README.md" ]; then
    if [ "$ADOTAR" -eq 1 ] || [ -n "$ALVO" ]; then
      escrever_readme "$mem"
    else
      SEM_README=$((SEM_README + 1))
    fi
  fi

  slug="$(slug_de "$repo")"
  dir="$PROJ_DIR/$slug/memory"

  if [ -L "$dir" ]; then
    if [ "$(readlink "$dir")" = "$mem" ]; then
      JA=$((JA + 1))
      # `0 ligado(s), 1 já em dia` lê como "nada a fazer" e não diz o que está no
      # lugar — em 26/08/2026 custou cinco comandos e um `bash -x` para descobrir
      # que o repo já estava ligado, e onde. Com --repo pergunta-se de UM projeto:
      # responda sobre ele. Na varredura de 100, o silêncio continua certo.
      [ -n "$ALVO" ] && diz "•  $repo: já ligado → $mem ($(conta_fatos "$mem") fato(s))"
      # Repo já ligado que acabou de ganhar o README tem arquivo novo no clone: sem
      # esta linha ele fica pendurado como mudança não commitada, calado.
      if [ "$README_NOVO" -eq 1 ]; then
        diz "   publique com: scripts/publicar-memoria.sh --repo \"$repo\""
      fi
      return 0
    fi
    diz "!  $repo: 'memory' já é link para $(readlink "$dir") — não mexi."
    AVISOS=$((AVISOS + 1))
    return 0
  fi

  if [ "$DRY" -eq 1 ]; then
    diz "→  ligaria $repo"
    LIGADOS=$((LIGADOS + 1))
    return 0
  fi

  mkdir -p "$(dirname "$dir")"

  if [ -d "$dir" ]; then
    backup="$dir.antes-do-link-$(date +%Y%m%d-%H%M%S)"
    mv "$dir" "$backup"
    ln -s "$mem" "$dir"
    # Memória que só existia na máquina não pode sumir na troca: o que o repo
    # ainda não tem é copiado; o que existe dos dois lados com conteúdo
    # diferente é reportado, nunca sobrescrito.
    n=0
    for f in "$backup"/*.md; do
      [ -e "$f" ] || continue
      base="$(basename "$f")"
      if [ ! -e "$mem/$base" ]; then
        cp "$f" "$mem/$base"
        n=$((n + 1))
      elif ! diff -q "$f" "$mem/$base" >/dev/null 2>&1; then
        diz "!  $base difere do versionado — versão da máquina preservada em $backup"
        AVISOS=$((AVISOS + 1))
      fi
    done
    diz "✓  $repo ligado — $n arquivo(s) da máquina trazidos para o repositório"
    if [ "$n" -gt 0 ] || [ "$README_NOVO" -eq 1 ]; then
      diz "   publique com: scripts/publicar-memoria.sh --repo \"$repo\""
    fi
  else
    ln -s "$mem" "$dir"
    diz "✓  $repo ligado"
    if [ "$README_NOVO" -eq 1 ]; then
      diz "   publique com: scripts/publicar-memoria.sh --repo \"$repo\""
    fi
  fi
  LIGADOS=$((LIGADOS + 1))
}

# Worktree tem diretório de projeto PRÓPRIO (o slug sai do cwd), e o link do clone
# não serve pra ele: numa sessão isolada em worktree, escrever no `.context/memoria`
# do clone é escrever fora da árvore da branch — o guard do harness recusa, e com
# razão. Sem link próprio a memória não tem para onde ir e a sessão desiste de
# registrar. Ligado, o fato nasce dentro do worktree e viaja no PR, igual a código.
ligar_worktrees() {
  local repo="$1" wt
  for wt in "$repo"/.claude/worktrees/*/; do
    [ -d "$wt" ] || continue
    wt="${wt%/}"
    [ -d "$wt/.context/memoria" ] || continue
    ligar "$wt"
  done
}

# Worktree removido deixa o symlink apontando para o vazio. Um link quebrado não é
# só sujeira: o agente escreve nele achando que gravou, e o arquivo não existe em
# lugar nenhum depois.
limpar_quebrados() {
  local dir
  for dir in "$PROJ_DIR"/*/memory; do
    [ -L "$dir" ] || continue
    [ -e "$dir" ] && continue
    if [ "$DRY" -eq 1 ]; then
      diz "→  removeria link quebrado: $dir → $(readlink "$dir")"
    else
      rm "$dir"
      diz "✓  link quebrado removido: $(basename "$(dirname "$dir")")"
    fi
  done
}

if [ -n "$ALVO" ]; then
  ALVO="$(cd "$ALVO" && git rev-parse --show-toplevel)"
  if [ ! -d "$ALVO/.context/memoria" ]; then
    if [ "$ADOTAR" -eq 1 ]; then
      adotar "$ALVO"
      diz "memória: $LIGADOS ligado(s), $JA já em dia, $AVISOS aviso(s)."
      exit 0
    fi
    diz "$ALVO não tem .context/memoria/ — rode com --adotar para criar e migrar."
    exit 1
  fi
  ligar "$ALVO"
  ligar_worktrees "$ALVO"
else
  [ -d "$PROJ_DIR" ] || { diz "sem $PROJ_DIR — o Claude Code ainda não rodou aqui."; exit 0; }
  # Um clone por vez: o `cwd` do transcript pode apontar para o clone ou para um
  # worktree dele, e sem colapsar os dois o mesmo repo seria varrido uma vez por
  # worktree que já existiu. Os worktrees VIVOS são ligados por `ligar_worktrees`,
  # lendo o disco — o diretório de projeto de um worktree já apagado não interessa.
  VISTOS="|"
  for d in "$PROJ_DIR"/*/; do
    [ -d "$d" ] || continue
    repo="$(caminho_de "$d" || true)"
    [ -n "$repo" ] || repo="$(caminho_por_slug "$(basename "$d")" || true)"
    if [ -z "$repo" ]; then
      relatar_sem_caminho "${d%/}"
      continue
    fi
    repo="$(clone_dono "$repo")"
    case "$VISTOS" in *"|$repo|"*) continue ;; esac
    VISTOS="$VISTOS$repo|"
    if [ ! -d "$repo/.context/memoria" ]; then
      [ "$ADOTAR" -eq 1 ] || continue
      adotar "$repo"
      ligar_worktrees "$repo"
      continue
    fi
    ligar "$repo"
    ligar_worktrees "$repo"
  done
  limpar_quebrados
fi

if [ "$SEM_README" -gt 0 ]; then
  diz "•  $SEM_README projeto(s) com memória e sem README do formato."
  diz "   Escreva em todos com: scripts/memoria-link.sh --adotar"
fi

diz "memória: $LIGADOS ligado(s), $JA já em dia, $AVISOS aviso(s)."
