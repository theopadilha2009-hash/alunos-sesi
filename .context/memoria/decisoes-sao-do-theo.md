---
name: decisoes-sao-do-theo
description: "Neste projeto o Théo é a única parte — não há Ruan nem Daniel para decidir, e ele autoriza a execução completa"
metadata:
  type: project
---

Em 2026-09-30 o Théo disse, com todas as letras: "não tem Ruan nem Daniel nem
ninguém, literalmente só eu e eu deixo fazer tudo".

O `pendencias-de-decisao.md` vinha segurando itens "para o Daniel decidir"
(design) e "para o Ruan decidir" (gate, banco, produto), e a sessão de revisão
parou nisso: entregou uma lista de `PENDENTE:` esperando terceiros. **Neste
projeto não existe essa espera** — quem decide é o Théo, e ele prefere que a
mudança seja feita a que fique parada.

**Why:** a diretiva global descreve o time da VAMOO (Ruan, líder; Nicolas,
design) e isso vale para o trabalho de suporte; este repositório é pessoal e não
tem essa estrutura. Segurar uma correção por causa de um stakeholder que não
existe custa uma sessão inteira — foi o que aconteceu aqui.

**How to apply:** ao esbarrar num `PENDENTE:` ou num item "continua aberto" de
[[pendencias-de-decisao]], aplique a recomendação em vez de parar, e registre a
decisão na memória. O que **continua** valendo é a parte técnica daquele
arquivo: os itens sob "não reabra" são decisões já tomadas, e desfazê-las é
regressão — foi exatamente o que aconteceu com o gate de moderação em 30/09,
removido por parecer atrito e restaurado no dia seguinte. Ver [[infra-deploy]]
para o fluxo de PR/deploy.
