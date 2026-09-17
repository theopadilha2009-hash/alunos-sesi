---
type: skill
name: Security Audit
description: Auditar a segurança do alunos-sesi pelo checklist real do projeto — RLS nas três tabelas, votos sem policy, service_role só no servidor, exigirAdm() em toda Server Action, cookies httpOnly e a chave do ADM fora do HTML. Use quando for revisar o modelo de acesso, mexer em RLS ou Server Action, ou avaliar exposição de chave.
skillSlug: security-audit
phases: [R, V]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Rode os greps do código antes de qualquer coisa — eles pegam a maior parte dos problemas sem tocar no banco.
2. Confira o banco de verdade com `./scripts/db-query.sh --psql`: RLS ligada, policy no lugar, `votos` sem policy nenhuma.
3. Percorra o checklist abaixo na ordem, marcando cada item como conforme ou não conforme.
4. Classifique cada achado por severidade e diga a correção em uma linha.
5. Separe o que é decisão de desenho (não é achado) do que é falha.

## Checklist do projeto

### 1. RLS ligada nas três tabelas

`salas`, `alunos` e `votos` precisam de `enable row level security`. A fonte é `src/sql/001_schema.sql`; o estado real vem do banco:

```bash
./scripts/db-query.sh --psql "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname in ('salas','alunos','votos');"
```

Os três têm que voltar com `relrowsecurity = true`. Tabela nova que entrar sem RLS é achado crítico.

### 2. `votos` sem policy nenhuma

```bash
./scripts/db-query.sh --psql "select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public' order by tablename;"
```

Esperado: policy de `select` em `salas` e em `alunos`, para `anon` e `authenticated`, e **nenhuma linha para `votos`**. Qualquer policy em `votos` quebra o "1 estrela por pessoa", porque a leitura passa a ser possível pelo cliente anon. Escrita em `alunos`/`salas` também não pode existir: quem escreve é a `service_role`, nas rotas de servidor.

### 3. `service_role` só no servidor

```bash
grep -rn "supabase/admin\|SUPABASE_SERVICE_ROLE_KEY" src/
```

Só pode aparecer em `src/lib/supabase/admin.ts`, `src/lib/dados.ts` (`votosDoVisitante`), `src/app/adm/acoes.ts` e `src/app/api/estrela/route.ts`. Se aparecer em arquivo com a diretiva `"use client"` — hoje `src/components/Vitrine.tsx`, `CartaoAluno.tsx`, `TemaToggle.tsx`, `adm/ImportarLista.tsx` e `adm/FormAluno.tsx` — é achado crítico: a chave entrega o banco inteiro. Atenção ao grepar: a string `"use client"` também aparece em comentário, como no docblock de `src/lib/supabase/admin.ts`; confira a primeira linha do arquivo, não a ocorrência solta.

Confira também que nada de `clienteAdmin()` é devolvido cru para o cliente e que `NEXT_PUBLIC_*` só carrega URL e anon key.

### 4. `exigirAdm()` em toda Server Action

```bash
grep -n "export async function\|await exigirAdm()" src/app/adm/acoes.ts
```

Cada `export async function` precisa de `await exigirAdm()` na primeira linha. O `matcher` de `src/proxy.ts` não cobre o POST da Server Action, então a guarda dentro da ação é a única barreira — ação nova sem ela é achado crítico. O mesmo vale para a página `src/app/adm/page.tsx`, que chama `notFound()` quando `crachaValido()` falha.

### 5. Cookies httpOnly e assinados

`opcoesCookie()` em `src/lib/sessao.ts` é a única fonte dos atributos: `httpOnly: true`, `sameSite: "lax"`, `secure` em produção, `path: "/"`. Verifique que cookie novo (se houver) passa por ela e não é escrito à mão com `document.cookie`. Os dois cookies guardam valor assinado (`valor.hmac`), e `abrirAssinado()` usa `timingSafeEqual`; o crachá do ADM guarda o HMAC da chave, não a chave — vazamento de crachá não entrega `ADM_CHAVE`, e trocar a chave invalida tudo.

### 6. Chave do ADM nunca renderizada

```bash
grep -rn "ADM_CHAVE" src/ next.config.ts
```

Só `src/lib/sessao.ts` deve ler `process.env.ADM_CHAVE` (`segredo()` e `chaveValida()`). A rota `/adm/[chave]` é Route Handler, e não página, exatamente para não renderizar HTML com a chave no `Referer` de subrecurso; chave errada responde 404, não 401, para não confirmar que a rota existe. Achado se: a chave virar prop, aparecer em `metadata`, em log (`console.log` do valor) ou em qualquer HTML servido.

### 7. Identidade do voto nunca vem do corpo

`src/app/api/estrela/route.ts` lê o visitante de `cookies()` com `abrirAssinado()` e valida o `alunoId` do corpo contra `RE_UUID`. O corpo só pode carregar `alunoId`. Aceitar `visitante_id` do request (ou de query string) é achado crítico: viraria voto ilimitado trocando um número.

### 8. Entrada validada nos dois lados

`normalizarLinkedin()` e `normalizarGithub()` em `src/lib/links.ts` espelham as constraints `linkedin_url` e `github_handle` de `public.alunos`; `slugificar()` cabe na CHECK do slug; `parseLista()` recusa nome com menos de 2 letras e bio é limitada a 280. Mudança em um lado sem o outro abre caminho para erro de insert ou para dado fora de padrão no banco.

### 9. Cabeçalhos e indexação

`next.config.ts` aplica em `/:path*`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` (é o que impede a chave de vazar em `Referer` enquanto ela está na barra de endereço), `X-Frame-Options: DENY` e `Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'`. Em `/adm/:path*`, `X-Robots-Tag: noindex, nofollow`. `src/app/robots.ts` desautoriza `/adm` e o layout raiz usa `robots: { index: false, follow: false }`. Remover qualquer um desses é achado.

### 10. Segredos fora do git

`.env.local` está no `.gitignore` (`.env*`, com `!.env.example`). Confirme que `.env.example` só tem nomes de chave, sem valor. Chave vazada se rotaciona na hora — e trocar `ADM_CHAVE` invalida crachás do ADM e cookies de voto, então isso é comunicado, não surpresa.

### 11. CSRF nas Server Actions

As ações do painel são POST e o Next compara `Origin` com `Host`, rejeitando origem diferente; o cookie é `sameSite: "lax"`. Não existe token próprio no projeto, e não precisa — mas se algum dia entrar proxy/CDN com domínio diferente, isso vira `serverActions.allowedOrigins` no `next.config.ts`. Ação nova exposta por GET seria achado.

## Exemplo de relatório

```
## Auditoria — alunos-sesi

### Crítico
1. src/app/adm/acoes.ts — `removerSala` não chama exigirAdm().
   O matcher de src/proxy.ts não cobre o POST da ação, então qualquer
   visitante apaga sala pelo painel.
   Correção: `await exigirAdm();` na primeira linha.

### Alto
2. src/components/adm/PainelAlunos.tsx — import de @/lib/supabase/admin
   dentro de arquivo "use client". A service_role iria para o bundle.
   Correção: mover a operação para uma Server Action em acoes.ts.

### Médio
3. Rate limit ausente em POST /api/estrela: um navegador vota em todos
   os alunos da turma em sequência. O "1 por aluno" continua valendo.
   Correção: limite por visitante por janela, se virar problema.

### Conforme
- RLS ligada em salas, alunos e votos; votos sem policy.
- Cookies httpOnly e assinados por opcoesCookie().
- Chave do ADM só em src/lib/sessao.ts; rota devolve 404 e não renderiza HTML.
```

## Quality Bar

- Achado sempre com arquivo, comportamento e correção em uma linha. Sem "poderia ser melhor".
- Severidade: crítico = service_role exposta, ação sem guarda, policy faltando em tabela nova, chave renderizada; alto = validação divergindo do SQL, cookie sem httpOnly, identidade vinda do request; médio = ausência de rate limit, log com dado sensível.
- Isto **não** é achado, é desenho: `votos` sem policy; 404 em vez de 401 na chave errada; build do CI com env de mentira; `console.error` de erro do Supabase sem dado de aluno.
- Auditar o banco de verdade com `--psql`; conclusão baseada só em leitura de arquivo é "não verificado no banco".
- Não aplicar correção de schema sem dry-run: `./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql`.
- Nunca cole valor de chave no relatório, nem parcial.

## Resource Strategy

- `scripts/`: vale um script de auditoria quando o checklist virar rotina (RLS + policies + grants numa saída só, em cima do `scripts/db-query.sh`).
- `references/`: só para o SQL de auditoria completo (policies, grants, funções `security definer`).
- `assets/`: nada.
