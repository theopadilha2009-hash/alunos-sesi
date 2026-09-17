# Memória do projeto

Cada `.md` desta pasta é **um fato**. O `MEMORY.md` é o índice que o agente lê no
começo de toda sessão — uma linha por fato, nunca o conteúdo.

A pasta é versionada de propósito: memória que fica na máquina de quem escreveu é
invisível para o resto do time e para os outros agentes.

## Formato

```markdown
---
name: <slug-kebab-case, igual ao nome do arquivo sem .md>
description: <uma linha; é por ela que o agente decide se o fato é relevante>
metadata:
  type: user | feedback | project | reference
---

<o fato. Em `feedback` e `project`, siga com as linhas **Why:** e **How to apply:**>
```

| type | o que guarda |
|---|---|
| `user` | quem é a pessoa: papel, preferências, como quer ser respondida |
| `feedback` | como trabalhar aqui — correção ou caminho confirmado, sempre com o porquê |
| `project` | objetivo, restrição ou estado em curso que o código e o git log não contam |
| `reference` | ponteiro externo: URL, dashboard, ticket |

Ligue fatos relacionados com `[[nome-do-outro-fato]]`. Link para um fato que ainda
não existe é aceitável — marca o que vale escrever depois.

## O que faz um fato valer a pena

1. **Registre o porquê, não o quê.** "A migration 119 removeu o gate" é git log.
   "Usar o carimbo fiscal como gate travava 19 dos 23 negócios porque ele é o lote
   de importação, não a precificação" é memória.
2. **Separe verificado de acreditado**, com essas palavras. Inferência tratada como
   fato manda a próxima sessão investigar o lugar errado com confiança.
3. **Data absoluta.** "Semana passada" não sobrevive a três sessões.
4. **Sem credencial.** Escreva onde o valor vive — `SUPABASE_DB_URL` no `.env.local`,
   item do 1Password —, nunca o valor. Versionar memória é distribuí-la.

Fato que se provou errado se **apaga**. Memória errada é lida com confiança e
ninguém re-checa: é pior que memória faltando.

## Publicar

Escrever aqui deixa o fato no clone, não no repositório. Antes de fechar a sessão:

```bash
git status --short .context/memoria/     # tem linha? falta publicar
~/.claude/scripts/publicar-memoria.sh --titulo "docs(memoria): ..."
```
