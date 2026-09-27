---
type: doc
name: midia
description: Onde a mídia do perfil mora — upload direto para o Vercel Blob, vídeo de YouTube/Vimeo e a CSP que libera os dois
category: architecture
generated: 2026-09-27
status: filled
scaffoldVersion: "2.0.0"
---

# Mídia

Até 2026-09-27 a imagem do perfil era data URL viajando dentro do JSONB, no
corpo do Server Action. O `bodySizeLimit` de 4 MB era o teto real da edição, e
duas mídias no limite somavam os **4.194.304 B exatos**: o Next recusava antes
da action, o aluno caía no error boundary e perdia a edição inteira — inclusive
a capa, que estava válida.

Agora o navegador manda o arquivo direto para o store e o formulário carrega só
a URL. O vídeo seguiu o caminho oposto: em vez de hospedar arquivo, o perfil
passou a embutir YouTube e Vimeo por `{ id, tipo }`.

## Onde cada mídia mora

| Mídia | Coluna | O que é guardado | Teto |
|---|---|---|---|
| Galeria | `alunos.midias` (JSONB) | URL pública do Blob + legenda | 12 itens, 2 MB por item |
| Capa de projeto | `projetos[].imagem` | URL pública do Blob | 10 projetos, 2 MB por item |
| Foto do aluno | `alunos.foto_url` | data URL no banco | 120 KB |
| Capa do perfil | `alunos.banner_url` | data URL no banco | 220 KB |
| Stickers | `alunos.stickers` (JSONB) | data URL no banco | 12 itens, 512 KB cada, 2 MB de soma |
| Vídeo | `alunos.videos` (JSONB) | `{ id, tipo, titulo? }` — nenhum byte nosso | 4 por perfil |

Só **galeria** e **capa de projeto** usam o upload direto. Foto, capa e stickers
continuam data URL no corpo do POST: 120 KB + 220 KB + 2 MB de stickers ≈ 2,4 MB,
abaixo dos 4 MB do `bodySizeLimit`. Foi por isso que a rodada parou nas duas
maiores — a rota de upload já aceita um campo `sticker`, mas nenhum cliente o
chama hoje.

O data URL antigo continua renderizando: o `img-src` libera `data:` e
`urlImagemSegura` o aceita, então nada do que já estava gravado quebrou. Não
existe migration que mova o acervo antigo para o Blob — um perfil com 12 mídias
no teto antigo ainda pesa 24 MB de JSONB.

## O upload direto

O caminho de uma imagem, do clique até o banco:

```
PaginaMeuPerfil.aceitarMidia()   comprime no canvas → data URL
  └─ blobDoDataUrl()             data URL → Blob (a ponte; lib/blob.ts)
       └─ upload()               @vercel/blob/client
            ├─ POST /api/upload  → assina um token de curta duração
            └─ PUT direto no store, sem passar pelo nosso servidor
                 └─ devolve a URL pública
                      └─ <input name="midias"> leva a URL no POST do Action
```

A rota **não recebe bytes**. Ela confere a sessão, o caminho e o ritmo, e
responde com o token; quem recebe o arquivo é o Blob. É isso que tira o
`bodySizeLimit` do caminho da edição.

`onBeforeGenerateToken` (em `src/app/api/upload/route.ts`) faz três coisas:

1. **Sessão.** `obterSessao()` e exige `alunoId`. Sem login de aluno, não há
   token — a mensagem é "Entre como aluno para enviar imagens.".
2. **Caminho.** O `pathname` vem do browser e o `onBeforeGenerateToken` **não
   pode reescrevê-lo**, só recusá-lo. Por isso o caminho nasce escopado —
   `alunos/<alunoId>/midia.<ext>` (`caminhoDaMidia`) — e
   `caminhoPertenceAoAluno` recusa tudo que não caia na pasta de quem pediu.
   **Essa checagem é a autorização inteira**: sem ela, qualquer aluno com sessão
   escreveria (e sobrescreveria) mídia na pasta de outro, ou na raiz do store.
   Ela recusa `..` de propósito: `startsWith` sozinho aceitaria
   `alunos/<id>/../<outro>/x`, e quem normaliza o caminho depois é o Blob.
3. **Ritmo e teto.** 40 envios por minuto por aluno (`limitar("upload:<id>",
   40, 60_000)`, na tabela `tentativas`), `allowedContentTypes` de quatro tipos
   de imagem e `maximumSizeInBytes` por campo (`TETO_POR_CAMPO`). O teto do
   servidor existe porque a checagem boa — `conferirTamanhoDaImagem` — roda no
   browser do aluno, e um `fetch` à mão não passa por ela.

`addRandomSuffix: true` deixa a unicidade do nome com o Blob: sem ele, dois
uploads `midia.jpg` do mesmo aluno se sobrescreveriam.

Do lado do cliente, `PaginaMeuPerfil` só barra o arquivo **antes** de subir
(`conferirTamanhoDaImagem`, medido sobre o data URL — o blob que sobe é sempre
menor que ele) e mostra "Enviando a imagem…" enquanto o Blob não responde. Sem
esse estado, o aluno clica em "Adicionar" e não vê nada acontecer.

Testes: `tests/blob.test.mjs` trava a conversão data URL → Blob (incluindo os
bytes acima de 127, que o `atob` devolveria corrompidos sem o `charCodeAt` byte
a byte) e as recusas de `caminhoPertenceAoAluno` (outra pasta, id que é prefixo
do outro, `..`, pasta sem arquivo, raiz do store, entrada que não é string).

## A CSP e o host que não era o host

O upload direto é a única coisa não same-origin que o browser fala, então ele
precisou entrar no `connect-src`. O primeiro valor foi
`https://blob.vercel-storage.com` — **errado**, e o erro foi encontrado no e2e
de 2026-09-27: o host real de um arquivo é
`<storeId>.public.blob.vercel-storage.com` (o id do store é o subdomínio), e
`connect-src` casa host exato. O PUT era bloqueado no navegador, o aluno via
"Não foi possível enviar a imagem" e o erro real só aparecia no console.

O teste unitário existia e **passava**, porque comparava dois literais iguais —
ambos errados. O valor hoje é `https://*.public.blob.vercel-storage.com`
(`HOST_BLOB` em `blob.ts`, `HOST_BLOB_CSP` em `csp.ts`), e o `*.` é escopado em
`.public.` de propósito: um `*.blob.vercel-storage.com` largo liberaria também
o host de leitura de stores privados.

Os dois arquivos são folha e não podem se importar — o type-stripping do
`node --test` não resolve import relativo sem extensão —, então quem garante que
os literais não se separem é `tests/csp.test.mjs`. Ele agora não compara só a
igualdade: verifica que a fonte **cobre a forma real do host**
(`<storeId>.public.blob.vercel-storage.com`), que é o teste que teria pegado o
bug.

## Vídeo: `{ id, tipo }`, nunca a URL colada

`alunos.videos` guarda `[{"id": "dQw4w9WgXcQ", "tipo": "youtube", "titulo": "Braço robótico"}]`
— o id da plataforma, não o link que o aluno colou. Duas razões:

1. **Allowlist de host de verdade.** Para imagem o projeto aceita qualquer
   `https:` de propósito, porque o aluno digita a URL do GIF e `<img>` não
   executa nada. Vídeo vira `<iframe>` — navegação de outra origem dentro do
   nosso documento —, e "qualquer host" ali é exatamente o que o `frame-src`
   existe para impedir. Guardando só o id, o endereço do iframe é montado por
   `urlEmbed` (`src/lib/video.ts`) e o host é sempre um de dois.
2. **A URL do aluno é descartável.** `youtu.be/x?si=...` e
   `watch?v=x&t=42` são o mesmo vídeo; gravar a original levaria parâmetro de
   rastreio de compartilhamento para o banco e quebraria o embed no dia em que a
   plataforma mudasse o formato do link.

O que `normalizarVideo` aceita e recusa:

- **Hosts** por igualdade exata, nunca `includes` — `youtube.com.evil.com`
  contém `youtube.com` e passaria numa checagem por substring. A lista cobre
  `youtube.com` (com `www`, `m`, `music`), `youtu.be`, `youtube-nocookie.com`,
  `vimeo.com` e `player.vimeo.com`.
- **Formas** que as pessoas realmente copiam: `youtu.be/<id>`, `watch?v=`,
  `/embed/`, `/shorts/`, `/live/`, `vimeo.com/<id>`,
  `player.vimeo.com/video/<id>`. Link sem protocolo ganha `https://` (copiar do
  campo de endereço às vezes perde o esquema) e `http:` é recusado — a página é
  https e o `upgrade-insecure-requests` bloquearia o iframe em silêncio.
- **Id** por regex: YouTube, 11 caracteres de base64url; Vimeo, 6 a 12 dígitos.
  O id entra na URL do iframe, então valor livre ali é injeção no endereço.

`urlEmbed` usa `https://www.youtube-nocookie.com/embed/<id>` — o embed comum
grava cookie de rastreio no navegador de quem visita o perfil, que aqui é aluno
de escola. Há teste só para isso, porque trocar de volta para `youtube.com`
funcionaria igual e é exatamente o tipo de "arrumação" que passa despercebida.

`VideoEmbed` (`src/components/VideoEmbed.tsx`) é **fachada**: antes do clique
aparece só a miniatura (`i.ytimg.com`, que o `img-src` já cobre) e um botão; o
`<iframe>` só nasce depois. O embed do YouTube custa cerca de 1 MB de script de
terceiro, e um perfil com quatro vídeos pagaria isso na primeira dobra para quem
talvez nem assista. No Vimeo não existe URL de miniatura sem chamada de API,
então a fachada é o fundo do card com o rótulo — o ganho de não carregar o
player antes da hora continua valendo.

O vídeo aparece em quatro lugares: a aba "Vídeos" do editor
(`PaginaMeuPerfil`) e três renderizadores — `PerfilInterativo` (crachá),
`/u/[slug]` (cartão NFC) e `ModalPerfilBreve` (CRM). Os três últimos fatiam em
`MAX_VIDEOS` e descartam item sem `id` — a
coluna é JSON cru, e um `{ tipo: "youtube" }` sem id viraria um iframe apontando
para lugar nenhum.

O **título** do vídeo é texto do aluno e passa pela moderação escolar em
`salvarPerfilAction`, junto das legendas de mídia: o embed é do YouTube, mas o
rótulo em cima dele é nosso. Sem isso, o único campo de texto novo do perfil
seria o único sem moderação.

Migration: `src/sql/013_videos_do_aluno.sql` (aplicada em produção), coluna
`jsonb NOT NULL DEFAULT '[]'` — lista vazia é "nenhum vídeo" e o app não trata
NULL em cada leitura. Sem CHECK, pelo mesmo motivo de `banner_url` (012): o que
entra já passou por `normalizarVideo`, que é allowlist de host **e** regex de id,
e um CHECK que discorda do app recusa dado que o app aceita.
`tests/video.test.mjs` cobre as formas aceitas, as armadilhas de host
(`youtube.com.br`, `notyoutube.com`), os ids com forma errada, o `youtube-nocookie`
e o `frame-src` fechado.

## O `frame-src` deixou de ser `'none'`

Era `'none'` enquanto não havia iframe nenhum. Virou uma **allowlist fechada de
dois hosts** (`youtube-nocookie.com`, `player.vimeo.com`) — a única diretiva do
projeto que restringe por host e não por esquema, justamente porque governa
navegação de outra origem. O risco declarado é ela virar `https:` "só para
funcionar", e é o que `tests/video.test.mjs` tranca: sem curinga, sem fonte a
mais, sem `http:`.

Ver `csp.ts` para o resto da política (o nonce, o `style-src` sem nonce, o
`img-src` por esquema) e `security.md` para os segredos.

## O que ficou de fora

- **Upload de vídeo próprio (ClipeCurto): decidido não fazer.** No plano Hobby
  da Vercel o Blob **para de funcionar** ao estourar o limite (1 GB de storage /
  10 GB de transfer) e não cobra excedente — um vídeo pesado derrubaria o store
  inteiro, inclusive as imagens do perfil. O embed de YouTube/Vimeo cobre o caso
  de uso sem esse risco. *(O comportamento do plano Hobby é o registrado na
  decisão; não foi medido no repo.)*
- **GIF do Giphy: bloqueado.** Falta a chave da API — não há `GIPHY_*` no
  `.env.example` nem no CI —, e obtê-la exige criar conta em
  developers.giphy.com. Sem ela, a onda de GIF entrega só a biblioteca curada de
  presets.
- **Migração do acervo em base64.** As mídias gravadas antes desta rodada
  continuam data URL no JSONB e continuam funcionando; não há migration que as
  mova para o Blob.
- **Otimização de perfil: sem ganho medido.** Lighthouse 12 mobile em
  `/alunos/theo-padilha` deu **CLS = 0.0000**, então `width`/`height` não têm o
  que corrigir; o elemento LCP é um `<p>` de texto, então o gargalo é resposta
  do servidor ("Reduce initial server response time", ~599 ms), não mídia. As
  imagens do Unsplash já vêm com `?w=800`.
