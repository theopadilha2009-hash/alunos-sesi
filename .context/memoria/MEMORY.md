# Memória do projeto

Índice dos fatos. Uma linha por fato — o conteúdo está no arquivo.

- [Rotacionar os tokens do transcript](rotacionar-tokens-do-transcript.md) — quatro tokens (Vercel ×2, Supabase, PAT do GitHub) passaram pelo chat e nenhum foi rotacionado; a varredura do git de 15/10 mostrou que o repo está limpo
- [O segundo app não foi definido](segundo-app-nao-definido.md) — o Théo falou em "dois apps"; só a Vitrine foi entregue
- [Infra e deploy](infra-deploy.md) — onde o app está publicado, onde vivem as chaves e qual URL usar no smoke test
- [Pendências de decisão](pendencias-de-decisao.md) — o gate de moderação é intencional e já foi removido uma vez; o que mais fechou e o que segue aberto
- [As decisões são do Théo](decisoes-sao-do-theo.md) — neste projeto não há Ruan nem Daniel para decidir: recomendar e executar, não parar
- [Acesso por código](acesso-por-codigo.md) — o aluno da planilha assume o perfil com um código ditado em voz alta; 12 dos 15 ainda esperam
- [Showcase de design A|B](design-showcase.md) — Etapa 2 (port ao app) executada com B como alvo em 10 PRs; escolha por tela e Etapa 3 seguem abertas
- [Feedback do PDF "Plataforma sesi"](feedback-pdf-plataforma-sesi.md) — 23 anotações do Théo (06/10); frente 1 (currículo + crachá) fechada, o resto é fix de design ou feature a decidir
- [Auditoria visual das 16 telas](auditoria-visual-16-telas.md) — 60+ achados (08-09/10); em 15-16/10 fecharam o sticker do cartão (#122) e parte do contraste do claro (#123/#124), e o "ícone invisível" do ADM se provou falso
- [Tabela cortada e o falso "pesado"](tabela-corte-e-o-falso-peso.md) — o corte da coluna de ações (fix #119) e a medição que não achou lentidão nenhuma; a porta 3000 desta máquina é de outro projeto
- [O peso das imagens (Giphy)](peso-das-imagens-stickers.md) — o "pesado" de 16/10 era real: GIFs do Giphy no original a 44px (5,9MB no modal); por que o Resource Timing não mostrava, e o fix da rendição #126
- [notFound() devolve 200](notfound-devolve-200.md) — sistêmico no Next 16.3.5 (página dinâmica), pré-existente, não é o loading nem o proxy; impacto baixo porque os perfis são noindex
