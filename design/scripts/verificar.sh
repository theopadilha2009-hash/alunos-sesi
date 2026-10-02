#!/usr/bin/env bash
# Gates do showcase design/ (PADROES.md § Gates). P0 = reprova; P1 = warning.
set -u
cd "$(dirname "$0")/.." || exit 2
D="$(pwd)"
falhas=0
avisos=0

say() { printf '%s\n' "$*"; }
p0() { say "P0: $*"; falhas=$((falhas+1)); }
p1() { say "P1: $*"; avisos=$((avisos+1)); }

say "── 1. cor literal fora de header/no-sistema (telas)"
while IFS= read -r line; do
  [ -n "$line" ] && say "   $line" && falhas=$((falhas+1))
done < <(awk '
  /<!--/ { c=1 }
  c { if ($0 ~ /-->/) c=0; next }
  /no-sistema/ { s=1 }
  s { if ($0 ~ /<\/style>/) s=0; next }
  $0 ~ /#[0-9a-fA-F]{3,8}/ { print FILENAME":"NR": "$0 }
' telas/*.html 2>/dev/null)

say "── 2. classes órfãs (usadas em telas, ausentes nos sistemas)"
defined=$(grep -hoE '\.[a-zA-Z][a-zA-Z0-9_-]*' sistemas/*.css 2>/dev/null | sed 's/^\.//' | sort -u)
used=$(grep -hoE 'class="[^"]*"' telas/*.html componentes/*.html 2>/dev/null | sed 's/class="//; s/"$//' | tr ' ' '\n' | grep -E '^[a-zA-Z][a-zA-Z0-9_-]*$' | sort -u)
orfas=$(comm -23 <(echo "$used") <(echo "$defined"))
if [ -n "$orfas" ]; then
  while IFS= read -r c; do p0 "classe .$c usada sem definição nos sistemas"; done <<< "$orfas"
fi

say "── 3. links relativos que não resolvem"
for f in index.html componentes/*.html telas/*.html; do
  [ -f "$f" ] || continue
  base=$(dirname "$f")
  while IFS= read -r u; do
    case "$u" in http:*|https:*|\#*|data:*|mailto:*|"") continue ;; esac
    [ -e "$base/$u" ] || p0 "$f → $u (inexistente)"
  done < <(grep -hoE '(src|href)="[^"]+"' "$f" | sed -E 's/^(src|href)="//; s/"$//')
done

say "── 4. orçamento ≤1.200 linhas"
for f in telas/*.html; do
  [ -f "$f" ] || continue
  n=$(wc -l < "$f")
  [ "$n" -gt 1200 ] && p1 "$f tem $n linhas"
done

say "── 5. cabeça obrigatória em cada tela"
for f in telas/*.html; do
  [ -f "$f" ] || continue
  miss=""
  grep -q 'lang="pt-BR"' "$f" || miss="$miss lang"
  grep -q 'name="viewport"' "$f" || miss="$miss viewport"
  grep -q 'sistemas/base.css' "$f" || miss="$miss base.css"
  grep -q 'sistema-a.css' "$f" || miss="$miss sistema-a"
  grep -q 'sistema-b.css' "$f" || miss="$miss sistema-b"
  grep -q 'moldura.css' "$f" || miss="$miss moldura.css"
  grep -q 'sesi.showcase.conceito' "$f" || miss="$miss anti-FOUC"
  grep -q 'moldura.js' "$f" || miss="$miss moldura.js"
  grep -q 'data-tela' "$f" || miss="$miss data-tela"
  [ -n "$miss" ] && p0 "$f sem:$miss"
done

say "── 6. prefers-reduced-motion nos dois sistemas"
grep -q 'prefers-reduced-motion' sistemas/sistema-a.css || p0 "sistema-a.css sem reduced-motion"
grep -q 'prefers-reduced-motion' sistemas/sistema-b.css || p0 "sistema-b.css sem reduced-motion"

say "── 7. inventário de arquivos"
for f in index.html PADROES.md CONTEUDO.md componentes/galeria.html \
         sistemas/base.css sistemas/sistema-a.css sistemas/sistema-b.css \
         sistemas/moldura.css sistemas/moldura.js scripts/verificar.sh; do
  [ -f "$f" ] || p0 "falta $f"
done
n=$(ls telas/*.html 2>/dev/null | wc -l | tr -d ' ')
[ "$n" -ge 16 ] || p0 "esperadas 16 telas, vistas $n"
for i in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16; do
  ls telas/$i-*.html >/dev/null 2>&1 || p0 "falta tela $i"
done

say "── 8. hub referencia as 17 peças"
for f in telas/*.html componentes/galeria.html; do
  grep -q "$(basename "$f")" index.html 2>/dev/null || p1 "hub não linka $f"
done

say ""
say "RESULTADO: $falhas falha(s) P0, $avisos aviso(s) P1"
[ "$falhas" -eq 0 ] || exit 1
