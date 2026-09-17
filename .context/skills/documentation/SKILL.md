---
type: skill
name: Documentation
description: Escrever e atualizar a documentação do alunos-sesi (README.md, .env.example, docblocks de src/lib/, comentários do src/sql/001_schema.sql e .context/docs/). Use quando adicionar variável de ambiente, rota, script ou tabela, quando o README ficar desatualizado em relação ao código, ou quando precisar registrar o porquê de uma decisão.
skillSlug: documentation
phases: [P, C]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Decida o público: quem lê é aluno/ADM (vai para `README.md`, linguagem de quem usa a tela) ou é quem mantém o código (vai para docblock, comentário de SQL ou `.context/docs/`).
2. Escreva perto da fonte: a explicação de uma constraint mora no comentário da tabela em `src/sql/001_schema.sql`, não no README.
3. Explique o porquê, nunca o quê. O código já diz o quê; o comentário diz por que aquilo é assim e não de outro jeito.
4. Atualize tudo que a mudança toca na mesma leva: código, `.env.example` e a tabela do README quando a mudança é variável de ambiente.
5. Verifique o exemplo que você escreveu rodando o comando de verdade.
6. Confira que nenhum valor de chave foi para o texto.

## Onde cada coisa é documentada

| Assunto | Arquivo |
|---|---|
| Como rodar, variáveis, link secreto do ADM, modelo de acesso, banco, importação, deploy | `README.md` (a única prosa do repo) |
| Nomes das chaves de ambiente (sem valores) | `.env.example` |
| Tabela, coluna, constraint, policy, trigger, view | bloco de comentário acima do objeto em `src/sql/001_schema.sql` |
| Contrato de um módulo de `src/lib/` | docblock no topo do arquivo |
| Comportamento de página, rota e componente | comentário curto no ponto onde a decisão foi tomada |
| Arquitetura, segurança, estratégia de teste, tooling, glossário | `.context/docs/` |
| Procedimento sob demanda | `.context/skills/<slug>/SKILL.md` |

## Quando atualizar o README

- Variável de ambiente nova ou renomeada → linha na tabela de variáveis **e** entrada no `.env.example`. Os dois andam juntos; tabela sem entrada no exemplo deixa o time sem saber que a chave existe.
- Rota nova → acrescentar na descrição das duas portas (vitrine pública e painel do ADM).
- Script novo no `package.json` → seção "Testes e verificação".
- Mudança no modelo de acesso → a tabela "Quem lê / Quem escreve", incluindo o caso de `votos`, que não tem policy nenhuma.
- Mudança no formato aceito na importação (separador, cabeçalho, ordem das colunas) → seção "Importar a turma".
- Mudança no link secreto do ADM (rota, cookie, tempo de vida, resposta de erro) → seção "O link secreto do ADM".

## Estilo deste repositório

- Português do Brasil com acentuação correta. Sem emoji.
- Docblock de módulo em `src/lib/` diz o contrato e a razão de ser do arquivo. Exemplo do padrão que já existe em `src/lib/busca.ts`:

```
/**
 * Busca sem acento: "joao" acha "João", "3oa" acha "3ºA".
 *
 * Sem imports de propósito — este módulo é testado direto pelo `node --test`,
 * que não resolve import sem extensão. Mantenha-o folha.
 */
```

- Quando o comentário existe por causa de um limite do Next 16, diga o limite: é o que impede alguém de "arrumar" o código depois (ex.: `src/proxy.ts` explica que o arquivo se chama `proxy.ts` porque no Next 16 Middleware virou Proxy).
- Nada de número de linha no texto: linha muda, o comentário fica mentindo.
- Nada de valor de chave, nem em exemplo. No `.env.example` só o nome, e a tabela do README só descreve a função de cada uma.
- Tabela para o que é mapeamento 1:1 (variável → onde vive → pra que serve; quem → lê → escreve). Prosa para o que precisa de contexto.
- Sem emoji e sem "simplesmente", "basta", "obviamente" — o texto é para quem está chegando agora.

## Exemplo de atualização real

Adicionar uma variável de ambiente nova exige três edições no mesmo commit:

1. `.env.example` — nome da chave, com o comentário dizendo de onde ela sai (painel do Supabase, CLI da Vercel, etc.).
2. `README.md` — linha na tabela de variáveis, dizendo se ela vive no cliente, no servidor ou só em script.
3. `src/lib/` — se a leitura da variável virou função (`clientePublico()`, `clienteAdmin()`, `segredo()`), o docblock do módulo registra o que acontece quando ela falta.

## Quality Bar

- Doc nova não contradiz o código: se o texto e o código divergem, o código está certo até alguém decidir o contrário — e a decisão vai escrita.
- Toda seção alterada do README continua verdadeira para quem acabou de clonar o repo (`npm install`, `cp .env.example .env.local`, `npm run dev`).
- Exemplo de comando colado no texto foi rodado de verdade.
- Não duplique conteúdo: o README aponta o caminho, `.context/docs/` aprofunda.
- Documentação de feature vai no mesmo commit da feature.

## Resource Strategy

- `scripts/`: nada — a documentação usa os scripts que já existem (`scripts/db-query.sh`, `scripts/vercel-env.sh`).
- `references/`: só se um diagrama ou dump de schema grande não couber aqui.
- `assets/`: nada.
