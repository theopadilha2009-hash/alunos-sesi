-- 021 — Stickers do Giphy salvos em rendição leve.
--
-- O editor de perfil e o cartão público renderizavam stickers apontando para o
-- ORIGINAL do Giphy (`/giphy.gif`), 8-11x maior que o exibido: o
-- `3oKIPnAiaMCws8nOsE` tem 2,3 MB e aparece a 44px na galeria (`.preset-thumb`)
-- e a no máximo 70px por padrão no cartão. Medido em 16/10/2026: abrir o editor
-- baixava 5,9 MB de imagem, quase tudo isso.
--
-- A troca é SÓ de rendição — `/200.gif` é o MESMO GIF a 200px de largura
-- (>=4x o thumb de 44px, >=2,8x o sticker padrão de 70px), invisível na tela.
-- A lista de ids é EXPLÍCITA de propósito: a variante NÃO existe para todo id —
-- `unQ3IJU2RG7DO` responde 404 em `/200.gif` e continua no original (conferido
-- por `curl` em 16/10/2026). O mesmo cuidado está no `PRESETS_STICKERS` do
-- `StickerCanvas.tsx`, que passou a usar `/200.gif`.
--
-- Idempotente: depois de rodar, nenhuma url casa com `/giphy.gif` da lista e o
-- `where` fica vazio. Num banco limpo — o CI reproduz o schema por estas
-- migrations — não há linha de aluno e o update é no-op.

update public.alunos a
set stickers = (
  select jsonb_agg(
    case
      when t.s->>'url' ~ '^https://media\.giphy\.com/media/(10bKPDUM5H7m7u|3oKIPnAiaMCws8nOsE|xT9IgzoKnwFNmISR8I|3o7btPCcdNniyf0ArS|l41lFw057lAJQMwg0)/giphy\.gif$'
      then jsonb_set(t.s, '{url}', to_jsonb(replace(t.s->>'url', '/giphy.gif', '/200.gif')))
      else t.s
    end
    order by t.ord
  )
  from jsonb_array_elements(a.stickers) with ordinality as t(s, ord)
)
where a.stickers is not null
  and jsonb_typeof(a.stickers) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(a.stickers) as x
    where x->>'url' ~ '^https://media\.giphy\.com/media/(10bKPDUM5H7m7u|3oKIPnAiaMCws8nOsE|xT9IgzoKnwFNmISR8I|3o7btPCcdNniyf0ArS|l41lFw057lAJQMwg0)/giphy\.gif$'
  );