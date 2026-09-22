-- 003_crm_auth.sql — CRM Escolar SESI, Autenticação e Portfólio
-- Adiciona suporte a usuários, instagram, projetos, mídias (imagens/GIFs) e perfil do Super ADM.

-- 1. Colunas extras na tabela alunos
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS projetos jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS midias jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Tabela de usuários para autenticação
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE CHECK (length(btrim(username)) BETWEEN 3 AND 50),
  senha_hash text NOT NULL,
  role text NOT NULL DEFAULT 'aluno' CHECK (role IN ('super_adm', 'adm', 'aluno')),
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- RLS para tabela usuarios: bloqueio total para anon e authenticated.
-- Toda autenticação e consulta de usuários é executada exclusivamente
-- no servidor pelo clienteAdmin() (service_role).
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_leitura ON public.usuarios;

-- 3. Sala DSM3 e Perfil do Super ADM (Telor de Espadilha)
DO $$
DECLARE
  v_sala_dsm3 uuid;
  v_aluno_id uuid;
  -- Hash SHA-256 de 'theo1234' com o salt padrão 'sesi_salt_2026'
  -- echo -n "sesi_salt_2026:theo1234" | shasum -a 256
  v_senha_hash text := '9a72134cf33be074e6ef26e5e8e9dfab1e01235b83ae6c78bf30fe359a35e61c';
BEGIN
  -- Garante a sala DSM3
  INSERT INTO public.salas (nome, curso, turno, ordem)
  VALUES ('DSM3', 'Desenvolvimento de Sistemas', 'Manhã', 0)
  ON CONFLICT (nome) DO UPDATE SET curso = EXCLUDED.curso
  RETURNING id INTO v_sala_dsm3;

  -- Garante o perfil Telor de Espadilha
  INSERT INTO public.alunos (
    nome,
    slug,
    sala_id,
    linkedin,
    github,
    instagram,
    bio,
    fixado,
    destaque,
    estrelas,
    projetos,
    midias
  )
  VALUES (
    'Telor de Espadilha',
    'telor-de-espadilha',
    v_sala_dsm3,
    'https://www.linkedin.com/in/theopadilha',
    'theopadilha',
    '@theopadilha',
    'Super ADM & Desenvolvedor no SESI DSM3. Focado em arquitetura web, robótica e ecossistemas escolares inteligentes.',
    true,
    true,
    30,
    '[
      {
        "id": "proj-1",
        "titulo": "Alunos SESI CRM & Portfólio",
        "descricao": "Plataforma central de vitrine profissional e portfólios escolares em Next.js e Supabase.",
        "link": "https://github.com/theopadilha",
        "imagem": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80"
      },
      {
        "id": "proj-2",
        "titulo": "Robô Autônomo FLL",
        "descricao": "Navegação por odometria e sensores PID para competições de robótica SESI.",
        "link": "https://github.com/theopadilha",
        "imagem": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80"
      }
    ]'::jsonb,
    '[
      {
        "url": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80",
        "tipo": "imagem",
        "legenda": "Workspace de Desenvolvimento DSM3"
      },
      {
        "url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
        "tipo": "imagem",
        "legenda": "Código e automação escolar"
      }
    ]'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE SET
    nome = EXCLUDED.nome,
    sala_id = EXCLUDED.sala_id,
    linkedin = EXCLUDED.linkedin,
    github = EXCLUDED.github,
    instagram = EXCLUDED.instagram,
    bio = EXCLUDED.bio,
    fixado = EXCLUDED.fixado,
    destaque = EXCLUDED.destaque,
    estrelas = EXCLUDED.estrelas,
    projetos = EXCLUDED.projetos,
    midias = EXCLUDED.midias
  RETURNING id INTO v_aluno_id;

  -- Garante o usuário theo1234
  INSERT INTO public.usuarios (username, senha_hash, role, aluno_id)
  VALUES ('theo1234', v_senha_hash, 'super_adm', v_aluno_id)
  ON CONFLICT (username) DO UPDATE SET
    senha_hash = EXCLUDED.senha_hash,
    role = EXCLUDED.role,
    aluno_id = EXCLUDED.aluno_id;

END $$;
