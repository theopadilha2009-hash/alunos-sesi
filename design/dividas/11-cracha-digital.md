# Dívidas · 11-cracha-digital

Achados de quem desenhou o Crachá digital (`/alunos/[slug]`). Um DOM só, dois
conceitos; o que faltou nos sistemas está no `<style>/* no-sistema */` da tela,
com proposta de port abaixo. Não duplico as dívidas 17/06 — só confirmo que a
tela 11 esbarra nas mesmas faltas.

## 1. `.barra`/`.barra-fill` e `.cartao-nota` não existem no B (segue 17 §2 e 06 §3)

- **Onde:** a barra de 80% da insígnia "Queridinha da Turma" e as notas dos
  cartões (deep-link `?curriculo=1`, 404 honesto, HMAC) só têm regra em
  `sistema-a.css` (§20 e §6). O B não define nenhuma das duas.
- **Como a tela resolveu:** copiei exatamente as regras propostas em
  `dividas/17-galeria.md` §2 (`.barra` com trilho `--surface-3`, fill
  `--accent`) e o espelho de `.cartao-nota` com os tokens do B, escopadas em
  `/* no-sistema */`.
- **Regra proposta (onda de correção):** portar `.barra/.barra-fill/.barra-fina`
  e `.cartao-nota` para `sistema-b.css`. Consolidar com as dívidas 17/06 — a
  barra é consumida por 06, 11 e vai ser por 12/13 (NFC/validar).

## 2. Avatar: um DOM não serve os dois sistemas (`--lg/-xl` vs `-lg/-xl`)

- **Onde:** `sistema-a.css` §18 nomeia `.avatar-sm/.avatar-lg` (e `--cor`);
  `sistema-b.css` nomeia `.avatar--md/--lg/--xl` (e `--cor-destaque`). O herói
  do crachá precisa de um avatar grande nos dois conceitos.
- **Como a tela resolveu:** DOM usa `avatar--xl` (naming do B) + espelho no
  `/* no-sistema */` para o A; cor da sala entra com os dois tokens no mesmo
  `style` (`--cor-destaque: var(--ciano); --cor: var(--ciano)`), porque cada
  sistema lê um.
- **Regra proposta:** canonicar `--sm/--md/--lg/--xl` nos dois sistemas e fazer
  o `.avatar` do A ler `--cor-destaque` com fallback em `--cor` (ou vice-versa),
  eliminando o double-token inline.

## 3. Sem primitivo de "pulso" nem de "play" sobre placeholder (efeitos do crachá)

- **Onde:** o `pulse-ring` do avatar (o app real anima o anel do crachá) e o
  botão play sobre a thumbnail de vídeo não têm classe em nenhum dos sistemas —
  `.olho` é só o placeholder, `.avatar` não tem variante de anel animado
  (o A tem `.avatar-anel` estático; o B tem o ring fixo no box-shadow).
- **Como a tela resolveu:** `[data-conceito] .pulso-anel` (anel com
  `color-mix(--cor-destaque)` + keyframes `cd-pulso`, morto por
  `prefers-reduced-motion` no base.css) e `[data-conceito] .video-play`
  (círculo `color-mix(--accent)` sobre o `.olho` 16/9).
- **Regra proposta:** entrada nos dois sistemas como `.avatar--pulso` e
  `.olho-play` — crachá (09/11/12) e vídeo (06/10/11/12) consomem os dois.

## 4. Variantes de `.selo` são só do B

- **Onde:** `.selo--fixado`, `.selo--validado` e `.selo--suave` existem só em
  `sistema-b.css` §selo. No conceito A, "Fixado" e "Destaque" saem como dois
  carimbos idênticos (perde a codificação por cor + texto que o app real tem em
  `CargosBadges.tsx`).
- **Como a tela resolveu:** deixei cair para o `.selo` base no A (markup único,
  regra de ouro) — sem inventar variante local.
- **Regra proposta:** no A, mapear `--fixado` para o par `--aviso-*` e
  `--validado` para o par `--ok-*` do pastel existente.

## 5. QA visual 02/10: nome sobre a capa clara + redes fora da ilha (hatches na tela)

- **Onde:** (A) a capa do perfil é um `.olho` — no conceito papel o `--surface-2`
  é claro, e o bloco de nome sobe `margin-top: -sp-700` sobre a base da capa: o
  branco `--ilha-texto` do h1 desaparecia ali. E o `ul.badge-redes` de "Redes
  Profissionais & Contato", fora da ilha, vestia no A os tokens de ilha
  (`--ilha-fill/--ilha-line/--ilha-texto` no `a`) → chip branco sobre papel,
  bloco parecia vazio.
- **Como a tela resolveu (hatch local):** scrim na base da capa
  (`[data-conceito="a"] .ilha-escura > .olho::after`, gradiente
  `color-mix(black)`, só no A — o B já tem a capa escura); lista de redes com a
  variante `badge-redes--clara` que o A já define (o B ignora), com o `li` da
  pílula-duplicada desvestido localmente; chips LinkedIn/GitHub/**Instagram** +
  o e-mail institucional preservado (Instagram =
  `https://instagram.com/aliceduarte`, o mesmo URL do linktree da tela 12 —
  CONTEUDO.md não lista Instagram para o elenco).
- **Regra proposta (onda de correção):** variante `.olho--capa` nos dois
  sistemas com scrim escuro de base (uso: capa de perfil/crachá), e o
  `.badge-redes` do A vestir tokens de ilha **somente** aninhado em
  `.ilha-escura` — fora dela o default já é a versão clara, aposentando a
  variante `--clara`.
