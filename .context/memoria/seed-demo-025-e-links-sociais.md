---
name: seed-demo-025-e-links-sociais
description: O seed da demonstração de 19/10 (025) e o bug dos links sociais que se apagavam — como limpar os demo-* e por que seed com DO UPDATE cai no lint
metadata:
  type: project
---

Demonstração de **19/10/2026**, fechada nos PRs **#142**, **#144** e **#145**:

- **Bug dos links sociais** (#142): salvar perfil com handle inválido (ex.: `_`
  no GitHub) gravava `null` por cima do link salvo e dizia "sucesso". Agora é
  erro explícito, mesmo contrato do e-mail. Instagram ganhou normalizador próprio.
- **Seed `025`** (#142): 24 alunos demo (3 por turma) nas 8 turmas oficiais que
  estavam vazias + projetos/Instagram/competências nos 12 do seed 002. `DSM3`
  (gente real) e auto-cadastros intocados. **PENDENTE pós-demo**: limpar com
  `delete from public.alunos where slug like 'demo-%';` ou decidir manter.
- **Turmas com acento abriam 404** (#144): esta versão do Next entrega
  `params.nome` **percent-encoded** e `chaveDaSala` é só trim+caixa — `3ºB ·
  Robótica FLL`, `2ºA · Automação IoT` e `1ºA · Eletrotécnica` davam 404 desde
  sempre, enquanto as ASCII (`DSM3`) abriam, o que escondeu o defeito. Fix:
  `decodificarSegmento` em `src/lib/cores.ts`.
- **Polimento de operação ao vivo** (#145): erro de emissão de código engolido
  no painel ADM; ativação 10→30/15min (NAT de escola); "aguarde 1 minuto"
  mentiroso do login; moderação sem dizer qual campo; link de projeto cru no
  "Adicionar"; contador de visitas um passo atrás (rota responde 201 e a tela
  soma na hora).

**Achados que ficaram ABERTOS** (baixo impacto, decisão do Théo): aprovar aluno
pendente não existe no CRM, só em `/adm` via ⌘K; sticker fantasma ao remover
projeto; nome >100 chars corta em silêncio; colar e-mail completo no campo
"só o antes do @" dá erro genérico; PDF passa no input de mídia; rate limit do
salvar conta tentativas recusadas; `notFound()` devolve 200 (sistêmico, ver
[[notfound-devolve-200]]).

**Why:** o lint do `db-query.sh` (`UPDATE ... sem WHERE`) é regex por
statement e sinaliza qualquer `ON CONFLICT DO UPDATE` sem `WHERE` no mesmo
trecho — o próprio `002_seed_demo.sql` cai nele. `--force` é o caminho
previsto para seeds, não uma gambiarra.

**How to apply:** seed novo segue o padrão da 025: `INSERT ... SELECT ... FROM
(VALUES ...) JOIN salas ON CONFLICT (slug) DO UPDATE`, aplicado com
`--dry-run --force` antes do `--psql --force`. Slugs de dados descartáveis
levam prefixo (`demo-`) para a limpeza ser um delete só. Página dinâmica que
compare `params` com string do banco precisa passar por `decodificarSegmento`
primeiro — e o teste do `cores.test.mjs` é o lembrete.
