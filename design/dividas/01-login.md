# Dívidas · 01-login (telas/01-login.html)

Achados de quem redesenhou a tela de acesso. Nenhum muda markup de conceito
(regra de ouro): são lacunas dos sistemas que o `<style>/* no-sistema */` da
tela contorna com `var()`/`color-mix()` dos tokens, para a onda de correção
portar. Nenhum hex foi usado no escape hatch.

## 1. Abas: `.aba` é o botão no A e o contentor no B — não há um DOM único

- **Onde:** `sistema-a.css` §7 estiliza `.aba-lista` (contentor) + `.aba`
  (botão, underline 2px); `sistema-b.css` §abas estiliza `.aba` (contentor, com
  border-bottom e `margin-bottom: var(--sp-500)`) e os botões por
  `.aba [role="tab"]`. O mesmo `class="aba"` num botão dentro de
  `.aba-lista` (DOM canônico do inventário) veste no B a régua do contentor:
  borda + recuo de 1,5rem por botão.
- **Atalho na tela:** bloco `/* no-sistema */` §1 espelhando as regras de
  `.aba [role=tab]` do B sobre `.aba-lista .aba` (inclui o nowrap do
  `data-frame="mobile"` que o B só dá a `.aba`).
- **Regra proposta:** o B aceitar o DOM do inventário — `.aba-lista` como
  contentor (mesmas regras atuais de `.aba`) e `.aba` como botão (as regras de
  `.aba [role="tab"]`), mantendo o seletor antigo como alias durante a transição.
- **Impacto:** todas as telas com abas (01, 06, 07, e as variantes de 02–05)
  repetirão o mesmo hatch se nada for portado.

## 2. `.marca-sesi` de logo duplo: o A mostraria os dois logos e não trata o `small`

- **Onde:** o DOM único usa `.logo-modo-light`/`.logo-modo-dark` (PADROES
  §Logos), mas só `sistema-b.css` troca pelo tema; `sistema-a.css` §14 dá altura
  aos `img` e ignora o `display` — no papel branco do A o `logo-sesi-branco.png`
  apareceria invisível ao lado do padrão. E o `<small>` da sub-marca
  ("CRM & PORTFÓLIO ESCOLAR", de `LoginTela.tsx:66-67`) só tem tratamento em
  bloco no B; no A sai na mesma linha da marca.
- **Atalho na tela:** `/* no-sistema */` §2 — no A esconde `.logo-modo-dark` e
  põe o `small` em bloco com `--fs-100`/`--faint`.
- **Regra proposta (sistema-a, §14):**
  `[data-conceito="a"] .marca-sesi .logo-modo-dark { display: none; }` e o
  `small` em bloco (o A é sempre claro; dentro de `.ilha-escura` do A o hatch
  de cada tela decide o branco, como já faz a galeria).

## 3. `aria-busy` com spinner só existe no A

- **Onde:** `sistema-a.css` §3 desenha o anel de 14px em
  `.btn[aria-busy="true"]::before`; o B define `[disabled]` (opacidade) mas não
  tem nada para o carregando — e o carregando do login é o estado dos três
  submits (`LoginTela.tsx:164,250,327`: "Entrando...", "Criando conta...",
  "Ativando...").
- **Atalho na tela:** `/* no-sistema */` §4 — anel `currentColor` com as vars do
  B (`--raio-full`) e keyframe `ns-girar` (não colide com `a-girar`/`b-*`).
- **Regra proposta (sistema-b, §botão):**
  ```css
  [data-conceito="b"] .btn[aria-busy="true"] { opacity: .8; pointer-events: none; }
  [data-conceito="b"] .btn[aria-busy="true"]::before {
    content: ""; width: 14px; height: 14px; border-radius: var(--raio-full);
    border: 2px solid currentColor; border-right-color: transparent;
    animation: b-girar .8s linear infinite; }
  @keyframes b-girar { to { transform: rotate(360deg); } }
  ```

## 4. `.campo-label`/`.campo-dica` no B (reafirma 17-galeria §3)

- **Onde:** as classes só existem em `sistema-a.css` §4. O login é a segunda
  tela que precisa delas (formulário inteiro em label+dica), e o `<small>` nu do
  hatch da galeria não resolve texto de ajuda com botão inline
  ("Completar com @estudante.sesisenai.org.br", `LoginTela.tsx:221-229`).
- **Atalho na tela:** `/* no-sistema */` §3 espelha as duas no B com tokens
  (`--fs-300/--text` e `--faint`). Vale fundir com a dívida 3 da galeria quando
  o coordenador portar.

## 5. Notas sem ação

- O app tinha `TemaToggle` (`src/components/TemaToggle.tsx`) no canto do card;
  no showcase a troca de tema é chrome da moldura — a tela não duplica o
  botão, só declara o fonte no comentário do `<head>`. Design choice, não
  lacuna.
- `useActionState` mostra a mensagem (`recado recado-erro`) e desabilita o
  submit ao mesmo tempo, mas nunca os dois juntos no mesmo render: a tela
  demonstra o erro no painel Entrar e o carregando na régua de estados, com
  rótulo `.eyebrow` conforme PADROES §Abas.
- As turmas do select são `TURMAS_OFICIAIS` do fonte (`DSM3…DS2-24`), não as
  salas 3ºA–5ºA do `CONTEUDO.md` — são dados do cadastro real, mantidos por
  fidelidade; as cores de sala entram pelo token `--cor-destaque` no
  `.tela` (ciano, a sala da Alice) e colorem o `.selo` no B.
