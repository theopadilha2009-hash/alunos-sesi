---
name: visao-geral-escolar
description: "20/10/2026: o CRM ganhou a home 'Visão geral' como porta de entrada, e vitrine/turma ganharam cabeçalho escolar e métricas com ícone; o que usa dado real e o que ainda não existe"
metadata:
  node_type: memory
  type: project
  originSessionId: b3f2abba-0980-4f2a-be8c-adf9bdbaad97
  modified: 2026-10-20T22:19:26.129Z
---

# A camada "escola" da UI (20/10/2026)

O Théo pediu uma cara mais de escola, com uma referência de dashboard escolar
lateral + cards + progresso + calendário. O que entrou, sem schema novo:

- **CRM**: nova aba **Visão geral**, agora a primeira e o destino padrão de
  quem loga (`AbaAtiva = "inicio"` em `CrmApp.tsx`). Componente
  `src/components/crm/VisaoGeral.tsx`, CSS `src/app/styles/visao-geral-2026.css`
  no FIM de `globals.css`. Tudo derivado do que já existe: projetos do perfil,
  `insigniasDe` (6 conquistas), estrelas, soma de `habilidades_votos`, `retrato`
  da sala (colegas, estrelas, completude), desafios ativos e `meusEnvios`.
  Quando não há aluno vinculado, a tela vira a visão da escola (alunos, turmas,
  projetos, desafios) para o ADM.
- **Vitrine `/alunos`**: cabeçalho `Escola SESI SENAI · Joinville` + subtítulo,
  e as 5 métricas ganharam o quadrado de ícone tintado. **Bug corrigido no
  caminho:** o `.numero span` da vitrine pegava o `<span>` interno do
  `NumeroAnimado` e o número saía a 12px em vez de 27px; a regra
  `.numero b .numero-animado` devolve a tipografia do `<b>`.
- **Turma `/turmas/[nome]`**: mesmo cabeçalho + 4 métricas (alunos, estrelas,
  competências distintas, % com LinkedIn).

**Direção visual**: a de [[direcao-visual-tabelas]] — flat, sem sombra, sem
gradiente decorativo, só tokens e `color-mix` com a cor da sala. Os únicos
gradientes são de dado (anel de conquistas e barras). Contraste medido no
navegador nos dois temas: pior caso 6,06:1 no claro e 6,41:1 no escuro; zero
overflow horizontal a 390px.

**O que NÃO existe e por isso não foi desenhado**: curso/módulo/aula, notas,
presença, calendário letivo e "próximas aulas" não têm tabela no banco.
"Próximas entregas" usa os desafios do mural (o `prazo` é texto livre, não
data). Um calendário/mês de verdade pede schema novo — é a fronteira do
[[segundo-app-nao-definido]], não um enfeite de CSS.