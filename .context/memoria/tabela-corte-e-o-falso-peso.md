---
name: tabela-corte-e-o-falso-peso
description: O corte da coluna de ações na tabela de alunos (fix #119) e por que a queixa de "app pesado" não se confirmou na medição
metadata:
  type: project
---

Em 13/10/2026 o Théo mandou um print da aba **Tabelas & Alunos** cortada à
direita e disse "ta quebrado... e parece pesado", pedindo `/otimizar-app`.

**O corte (real, corrigido no PR #119).** A tabela pedia 1295px num container
de 1030px — 265px de corte, e a coluna inteira "Crachá & Ações" ficava fora da
vista. O que consumia, medido coluna a coluna:
- o `<th>` "Redes Profissionais (LinkedIn / GitHub)" forçava 256px de largura
  mínima (`minWidth: "16rem"` inline no `TabelaAlunos.tsx`) — era o maior custo
  fixo e sozinho respondia por quase todo o corte;
- a coluna Aluno absorvia o espaço livre (376px) por causa de `.tabela-aluno-bio
  { max-width: 28ch }` (`vitrine.css`) + nome de 1.05rem;
- os badges de rede com rótulo ocupavam 178px em duas linhas.

Fix: rótulo curto "Redes" (`title` guarda o completo), teto de 15.5rem na
coluna Aluno com os selos caindo para a 2ª linha (`flex-wrap` no
`.tabela-nome-wrap` — sem isso o nome truncava para "Be..."), bio em 18ch,
badges só-ícone **escopados em `.tabela-alunos`** (o resto do app segue com
rótulo), padding 1.25rem→0.8rem/0.6rem. Medido: **265px → 0px**, com os nomes
completos visíveis. **Lição de método:** ao encolher uma tabela, medir a largura
de CADA coluna (`td.getBoundingClientRect().width`) — o corte não estava na
coluna que parecia grande, estava num `<th>` com `min-width` inline.

**O "peso" (não confirmado).** Medi antes de tocar em qualquer coisa:
CPU da main thread 0,1%, zero long task na rolagem, TTFB 216ms (n=10),
124KB no boot, 0px de salto de layout, `x-vercel-id: gru1::gru1` (função e
banco na mesma região). **Nenhuma métrica acusou lentidão.** Pela regra da
skill `otimizar-app`, "sem ganho medido" é resultado: não commitei `perf:`.
As duas causas prováveis da sensação: o `next dev` local (compila cada rota na
hora — 800ms a 1,3s por página) e o disco da máquina a **90%** (20GB livres).

**Pegadinha que custou várias rodadas:** a porta 3000 desta máquina está ocupada
por OUTRO projeto (um "Configurador 3D Giardino"); o `npm run start` do
alunos-sesi falhava com `EADDRINUSE` em silêncio e o QA media o app errado.
Sempre subir o `start` numa porta explícita (`PORT=3187 npm run start`) e
conferir `document.title` antes de confiar na medição.

**Segunda pegadinha:** `rm -rf .next` é obrigatório quando se mexe em CSS e o
build anterior fica em cache — sem isso o `.next/static/css` sai vazio e a
página renderiza sem estilo, o que faz o QA medir um layout que não existe.

Relacionado: [[auditoria-visual-16-telas]] (o mesmo corte já tinha sido apontado
lá), [[infra-deploy]].
