---
name: seed-demo-025-e-links-sociais
description: O seed da demonstração de 19/10 (025) e o bug dos links sociais que se apagavam — como limpar os demo-* e por que seed com DO UPDATE cai no lint
metadata:
  type: project
---

Demonstração de **19/10/2026**, fechada no PR **#142** (squash `9e500b1`):

- **Bug dos links sociais**: salvar perfil com handle inválido (ex.: `_` no
  GitHub) gravava `null` por cima do link salvo e dizia "sucesso" — o
  normalizador falhava em silêncio e o update era incondicional. Agora é erro
  explícito, mesmo contrato do e-mail. Instagram ganhou normalizador próprio.
- **Seed `025`**: 24 alunos demo (3 por turma) nas 8 turmas oficiais que
  estavam vazias + projetos/Instagram/competências nos 12 do seed 002. Já
  aplicado em produção. `DSM3` (gente real) e auto-cadastros intocados.
  **PENDENTE pós-demo**: limpar com
  `delete from public.alunos where slug like 'demo-%';`
  ou decidir manter. Ver [[pendencias-de-decisao]].

**Why:** o lint do `db-query.sh` (`UPDATE ... sem WHERE`) é regex por
statement e sinaliza qualquer `ON CONFLICT DO UPDATE` sem `WHERE` no mesmo
trecho — o próprio `002_seed_demo.sql` cai nele. `--force` é o caminho
previsto para seeds, não uma gambiarra.

**How to apply:** seed novo segue o padrão da 025: `INSERT ... SELECT ... FROM
(VALUES ...) JOIN salas ON CONFLICT (slug) DO UPDATE`, aplicado com
`--dry-run --force` antes do `--psql --force`. Slugs de dados descartáveis
levam prefixo (`demo-`) para a limpeza ser um delete só.
