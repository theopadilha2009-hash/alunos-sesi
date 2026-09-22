-- 002_seed_demo.sql — Turma SESI Demo
-- Popula salas e alunos com perfis de tecnologia, robótica e desenvolvimento.

DO $$
DECLARE
  s_robotica uuid;
  s_dev uuid;
  s_auto uuid;
  s_eletro uuid;
BEGIN
  -- Criação das salas
  INSERT INTO public.salas (nome, curso, turno, ordem)
  VALUES ('3ºB · Robótica FLL', 'Mecatrônica & Robótica', 'Manhã', 1)
  ON CONFLICT (nome) DO UPDATE SET ordem = EXCLUDED.ordem
  RETURNING id INTO s_robotica;

  INSERT INTO public.salas (nome, curso, turno, ordem)
  VALUES ('3ºA · Desenvolvimento', 'Desenvolvimento de Sistemas', 'Manhã', 2)
  ON CONFLICT (nome) DO UPDATE SET ordem = EXCLUDED.ordem
  RETURNING id INTO s_dev;

  INSERT INTO public.salas (nome, curso, turno, ordem)
  VALUES ('2ºA · Automação IoT', 'Automação Industrial', 'Tarde', 3)
  ON CONFLICT (nome) DO UPDATE SET ordem = EXCLUDED.ordem
  RETURNING id INTO s_auto;

  INSERT INTO public.salas (nome, curso, turno, ordem)
  VALUES ('1ºA · Eletrotécnica', 'Ensino Médio Integrado', 'Manhã', 4)
  ON CONFLICT (nome) DO UPDATE SET ordem = EXCLUDED.ordem
  RETURNING id INTO s_eletro;

  -- Alunos
  INSERT INTO public.alunos (nome, slug, sala_id, linkedin, github, bio, fixado, destaque, estrelas)
  VALUES
    (
      'Lucas Albuquerque',
      'lucas-albuquerque',
      s_robotica,
      'https://www.linkedin.com/in/lucas-albuquerque',
      'lucasalbuquerque',
      'Capitão da equipe de Robótica FLL SESI. Especialista em programação Python, sensores ultrassônicos e Lego Spike Prime.',
      true,
      true,
      14
    ),
    (
      'Beatriz Vasconcelos',
      'beatriz-vasconcelos',
      s_dev,
      'https://www.linkedin.com/in/beatriz-vasconcelos',
      'biasilvadev',
      'Desenvolvedora Web Frontend apaixonada por React, Next.js e TypeScript. Criando soluções para eventos do SESI.',
      true,
      false,
      11
    ),
    (
      'Gabriel Monteiro',
      'gabriel-monteiro',
      s_auto,
      'https://www.linkedin.com/in/gabriel-monteiro',
      'gabriel-iot',
      'Hardware & IoT com Arduino, ESP32 e C++. Desenvolvo sensores inteligentes e automação para feiras de ciências.',
      false,
      true,
      9
    ),
    (
      'Sofia Mendonça',
      'sofia-mendonca',
      s_dev,
      'https://www.linkedin.com/in/sofia-mendonca',
      'sofia-ux',
      'UI/UX Designer & Prototipagem no Figma. Apaixonada por acessibilidade web, design system e interfaces intuitivas.',
      false,
      false,
      8
    ),
    (
      'Enzo Cavalcanti',
      'enzo-cavalcanti',
      s_robotica,
      'https://www.linkedin.com/in/enzo-cavalcanti',
      'enzorobotica',
      'Piloto e programador de robôs de combate e seguidor de linha. C++ embarcado e modelagem 3D no Fusion 360.',
      false,
      false,
      7
    ),
    (
      'Mariana Ribeiro',
      'mariana-ribeiro',
      s_dev,
      'https://www.linkedin.com/in/mariana-ribeiro',
      'marianaribeiro',
      'Backend & SQL. Apaixonada por APIs REST, Node.js e banco de dados PostgreSQL. Estudando Ciência de Dados e IA.',
      false,
      false,
      6
    ),
    (
      'Pedro Henrique Lima',
      'pedro-henrique-lima',
      s_auto,
      'https://www.linkedin.com/in/pedro-henrique-lima',
      'pedro-iot',
      'Maker e entusiasta de robótica e eletrônica. Montagem de placas de circuito, Raspberry Pi e servidores caseiros.',
      false,
      false,
      5
    ),
    (
      'Camila Antunes',
      'camila-antunes',
      s_eletro,
      'https://www.linkedin.com/in/camila-antunes',
      'camila-dev',
      'Aluna do 1º ano focada em Python, lógica de programação e circuitos elétricos. Sempre pronta para aprender.',
      false,
      false,
      4
    ),
    (
      'Thiago Fagundes',
      'thiago-fagundes',
      s_robotica,
      'https://www.linkedin.com/in/thiago-fagundes',
      'thiagofll',
      'Estratégia e montagem mecânica de robôs FLL e FTC. Modelagem 3D, engrenagens e impressão 3D em PLA.',
      false,
      false,
      3
    ),
    (
      'Larissa Duarte',
      'larissa-duarte',
      s_dev,
      'https://www.linkedin.com/in/larissa-duarte',
      'larissaduarte',
      'Desenvolvedora Mobile com Flutter e React Native. Criando apps educativos para a comunidade estudantil.',
      false,
      false,
      3
    ),
    (
      'Matheus Nogueira',
      'matheus-nogueira',
      s_auto,
      'https://www.linkedin.com/in/matheus-nogueira',
      'matheus-maker',
      'Projetos de automação residencial com ESP32 e Home Assistant. Fã de microcontroladores e robótica.',
      false,
      false,
      2
    ),
    (
      'Isabela Fontes',
      'isabela-fontes',
      s_eletro,
      'https://www.linkedin.com/in/isabela-fontes',
      'isabelafontes',
      'Estudando eletrotécnica, energia renovável e automação. Criando circuitos e protótipos de robótica móvel.',
      false,
      false,
      1
    )
  ON CONFLICT (slug) DO UPDATE SET
    nome = EXCLUDED.nome,
    sala_id = EXCLUDED.sala_id,
    linkedin = EXCLUDED.linkedin,
    github = EXCLUDED.github,
    bio = EXCLUDED.bio,
    fixado = EXCLUDED.fixado,
    destaque = EXCLUDED.destaque,
    estrelas = EXCLUDED.estrelas;
END $$;
