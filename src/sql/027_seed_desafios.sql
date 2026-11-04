-- 027_seed_desafios.sql — o Mural de Desafios nascia vazio
--
-- Achado de 04/11: `public.desafios` nunca teve seed. As telas anunciam o mural
-- e o contador do menu mostrava 0 desde sempre — "não botou a merda dos
-- desafios". Este arquivo cria quatro desafios que correspondem ao que as turmas
-- de Desenvolvimento de Sistemas e Robótica FLL já entregam nos projetos do
-- portfólio (é o que a vitrine tem: Robô FLL, treinador do Spike Prime, site de
-- evento, automação com ESP32).
--
-- `responsavel` fica NULL de propósito: não invento nome de professor. Quem
-- conduz é preenchido pelo ADM quando souber — a coluna existe desde a 026.
--
-- Idempotente: `on conflict (id) do nothing`, e o CI aplica do zero.

insert into public.desafios
  (id, titulo, subtitulo, categoria, prazo, recompensa, insignia_icone,
   descricao, criterios, submissoes_count, ativo, responsavel)
values
  (
    'desafio-robotica-fll',
    'Missão Robô FLL',
    'Construa e programe um robô que complete as missões da temporada',
    'Robótica FLL',
    '30 de novembro',
    'Insígnia Robótica',
    'trofeu',
    'Monte um robô com o kit Spike Prime e programe pelo menos três missões da temporada atual. O robozinho precisa completar as tarefas sozinho, sem ajuda da mão, e dentro do tempo da rodada.',
    '["Robô montado com peças do kit oficial","Pelo menos 3 missões completadas","Programa versionado no GitHub do aluno","Vídeo curto mostrando a rodada"]'::jsonb,
    0,
    true,
    null
  ),
  (
    'desafio-automacao-iot',
    'Automação com ESP32',
    'Um sensor do mundo real virando decisão na tela ou no ato',
    'Automação IoT',
    '15 de dezembro',
    'Insígnia IoT',
    'trofeu',
    'Escolha um problema da escola ou de casa e resolva com um ESP32 lendo pelo menos um sensor. A leitura precisa virar alguma ação: acender, avisar, registrar ou publicar.',
    '["Usa ESP32 e ao menos um sensor","A leitura gera uma ação automática","Esquema de ligação documentado","Código no GitHub do aluno"]'::jsonb,
    0,
    true,
    null
  ),
  (
    'desafio-web-evento',
    'Site do evento',
    'Uma página real que alguém de fora consiga usar',
    'Desenvolvimento Web',
    '20 de dezembro',
    'Insígnia Web',
    'trofeu',
    'Crie o site de um evento da escola: quem organiza, quando acontece, o que vai ter e como se inscrever. Precisa estar no ar, abrir no celular e funcionar de verdade.',
    '["Publicado em uma URL real","Funciona no celular sem rolar para o lado","Tem formulário ou inscrição funcional","Contraste legível nos dois temas"]'::jsonb,
    0,
    true,
    null
  ),
  (
    'desafio-design-ux',
    'Antes e depois de uma tela',
    'Mostre o problema, a solução e o porquê',
    'Design & UI/UX',
    '18 de dezembro',
    'Insígnia Design',
    'trofeu',
    'Escolha uma tela do app da escola e proponha uma versão melhor. O que vale é o raciocínio: o que estava ruim para o usuário, o que você mudou, e o que mediu para provar que melhorou.',
    '["Antes e depois lado a lado","Explica para quem a mudança serve","Ao menos um contraste ou tamanho medido","Peça entregue em versão aberta/fechada"]'::jsonb,
    0,
    true,
    null
  )
on conflict (id) do nothing;