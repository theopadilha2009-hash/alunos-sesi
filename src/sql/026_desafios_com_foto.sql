-- 026_desafios_com_foto.sql — desafio com imagem de apresentação e responsável
--
-- Pedido de 04/11/2026: "faça uns desafios com fotos de apresentação aí, tipo
-- professor Ewerton, Julia e Marcelo". O Mural de Desafios só tinha texto;
-- agora cada desafio pode ter uma imagem de capa e o nome de quem conduz.
--
-- `imagem_url` guarda a URL do Blob (upload da própria pessoa), nunca data URL:
-- uma capa pesada em base64 no banco chegaria inteira em cada listagem do mural.
--
-- `responsavel` é texto livre de propósito — quem apresenta o desafio não é
-- usuário do sistema, e amarrar a uma tabela exigiria cadastro de professor
-- (fluxo que não existe e que não foi pedido).

alter table public.desafios
  add column if not exists imagem_url  text,
  add column if not exists responsavel text;

comment on column public.desafios.imagem_url is
  'Capa do desafio (URL do Vercel Blob). Null = o mural mostra o ícone da categoria.';
comment on column public.desafios.responsavel is
  'Quem apresenta/conduz o desafio (ex.: "Prof. Ewerton"). Texto livre, pode ser null.';
