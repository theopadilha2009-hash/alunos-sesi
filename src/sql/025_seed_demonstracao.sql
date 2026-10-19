-- 025_seed_demonstracao.sql — dados mockados para a demonstração de 19/10/2026.
--
-- Duas frentes, ambas com perfis completos (bio, GitHub, Instagram, LinkedIn,
-- projetos e competências) para a vitrine não abrir vazia na frente da escola:
--
--   1. 24 alunos NOVOS nas 8 turmas oficiais que estavam a zero (DSM3-25,
--      DS1-25, DS2-25, DS4-25, DS1-26, DS2-26, DS1-24, DS2-24) — 3 por turma.
--      O `DSM3` fica de fora de propósito: é a turma do fundador, tem gente
--      real. Todo aluno novo usa slug com prefixo `demo-`, então a limpeza
--      pós-demonstração é uma linha:
--
--        delete from public.alunos where slug like 'demo-%';
--
--   2. Os 12 alunos do seed 002 (turmas antigas de robótica/desenvolvimento)
--      ganham o que faltava: projetos no JSONB, Instagram e competências.
--      O UPDATE toca só `instagram`, `projetos` e `habilidades` — nome, sala,
--      links e estrelas continuam sendo do 002, que os reafirma num banco
--      limpo (o CI aplica 002 antes deste arquivo, então a reprodução do zero
--      termina no mesmo estado).
--
-- Tudo é idempotente (ON CONFLICT (slug) DO UPDATE / UPDATE por slug) e os
-- valores respeitam as CHECK do banco: handle do GitHub sem `_`, LinkedIn
-- como URL completa, Instagram com @, bio <= 280, projetos <= 10 e
-- competências da allowlist de `src/lib/habilidades.ts`.

INSERT INTO public.alunos
  (nome, slug, sala_id, linkedin, github, instagram, bio, projetos, habilidades, cor_perfil, estrelas, destaque)
SELECT
  v.nome, v.slug, s.id, v.linkedin, v.github, v.instagram,
  v.bio, v.projetos::jsonb, v.habilidades::jsonb, v.cor, v.estrelas, v.destaque
FROM (VALUES
  -- DS1-24 -----------------------------------------------------------------
  ('Ana Beatriz Ferraz', 'demo-ana-ferraz', 'DS1-24',
   'https://www.linkedin.com/in/ana-ferraz', 'ana-ferraz', '@ana.ferraz.dev',
   'Primeiro ano de Desenvolvimento de Sistemas. Aprendendo Python e logica, e montando meus primeiros sites com HTML e CSS.',
   '[{"id":"proj-1","titulo":"Calculadora em Python","descricao":"Calculadora de linha de comando com as quatro operacoes, feita para treinar funcoes e condicionais.","link":"https://github.com/ana-ferraz/calculadora-python"}]',
   '["Python","Web Frontend"]', '#3FC2BC', 5, false),
  ('Caio Martins', 'demo-caio-martins', 'DS1-24',
   'https://www.linkedin.com/in/caio-martins', 'caio-martins', '@caio.martins.dev',
   'Curioso por jogos. Estudo logica de programacao e C basico, e no tempo livre faco prototypes de jogos simples para aprender estruturas de dados.',
   '[{"id":"proj-1","titulo":"Jogo da cobrinha em C","descricao":"Snake rodando no terminal, com placar salvo em arquivo. Primeiro projeto completo em C.","link":"https://github.com/caio-martins/snake-c"}]',
   '["C++ & Embarcados","Python"]', '#F3B544', 3, false),
  ('Yuri Sampaio', 'demo-yuri-sampaio', 'DS1-24',
   'https://www.linkedin.com/in/yuri-sampaio', 'yuri-sampaio', '@yuri.sampaio',
   'Primeiro ano, lado de hardware. Gosto de entender como o circuito funciona antes de programar em cima dele.',
   '[{"id":"proj-1","titulo":"Semáforo com Arduino","descricao":"Cruzamento com dois semáforos sincronizados, LEDs e temporização por milissegundos.","link":"https://github.com/yuri-sampaio/semaforo-arduino"}]',
   '["Hardware & IoT","Robótica"]', '#4881AE', 2, false),

  -- DS2-24 -----------------------------------------------------------------
  ('Rafaela Nunes', 'demo-rafaela-nunes', 'DS2-24',
   'https://www.linkedin.com/in/rafaela-nunes', 'rafaela-nunes', '@rafaela.nunes.dev',
   'Segundo ano de DS. Frontend com React e um olho em design: gosto de fechar a tela bonita e acessível.',
   '[{"id":"proj-1","titulo":"Site do grêmio estudantil","descricao":"Site institucional com calendário de eventos e formulário de sugestões, feito em Next.js.","link":"https://github.com/rafaela-nunes/site-gremio"},
    {"id":"proj-2","titulo":"Kit de componentes da turma","descricao":"Biblioteca de botões e cards padronizados que a turma reutiliza nos projetos.","link":"https://github.com/rafaela-nunes/kit-ui-turma"}]',
   '["Web Frontend","Design & UI/UX"]', '#D74D42', 8, true),
  ('Diego Tavares', 'demo-diego-tavares', 'DS2-24',
   'https://www.linkedin.com/in/diego-tavares', 'diego-tavares', '@diego.tavares',
   'Backend e banco de dados. Modelagem, consultas e relatórios: gosto quando o sistema resolve um problema real da escola.',
   '[{"id":"proj-1","titulo":"Sistema de biblioteca","descricao":"Empréstimos, devoluções e multas com PostgreSQL e Node.js, com relatório mensal em CSV.","link":"https://github.com/diego-tavares/biblioteca-escolar"}]',
   '["Backend & SQL","Python"]', '#2D929E', 6, false),
  ('Bruno Alcântara', 'demo-bruno-alcantara', 'DS2-24',
   'https://www.linkedin.com/in/bruno-alcantara', 'bruno-alcantara', '@bruno.alcantara',
   'Mobile com Flutter. Publiquei meu primeiro app na conta da escola e agora refatoro o que aprendi errado nele.',
   '[{"id":"proj-1","titulo":"App de tarefas em Flutter","descricao":"Lista de tarefas com notificações locais e tema claro/escuro, feito para estudar gerenciamento de estado.","link":"https://github.com/bruno-alcantara/tarefas-flutter"}]',
   '["Mobile"]', '#38B95D', 4, false),

  -- DS1-25 -----------------------------------------------------------------
  ('Júlia Cardoso', 'demo-julia-cardoso', 'DS1-25',
   'https://www.linkedin.com/in/julia-cardoso', 'julia-cardoso', '@julia.cardoso.dev',
   'Primeiro ano de DS. Programo em JavaScript e tenho paixão por ensino: meus projetos quase sempre viram material de estudo para a turma.',
   '[{"id":"proj-1","titulo":"Quiz educativo em JavaScript","descricao":"Quiz de matemática e lógica com ranking local, usado na semana de provas da turma.","link":"https://github.com/julia-cardoso/quiz-educativo"}]',
   '["Web Frontend","IA & Dados"]', '#3FC2BC', 7, false),
  ('Felipe Araújo', 'demo-felipe-araujo', 'DS1-25',
   'https://www.linkedin.com/in/felipe-araujo', 'felipe-araujo', '@felipe.araujo',
   'Python e backend. Documento tudo o que construo e gosto de API bem testada mais do que tela bonita.',
   '[{"id":"proj-1","titulo":"API de agenda escolar","descricao":"Agenda de provas e trabalhos com FastAPI e SQLite, documentada no Swagger.","link":"https://github.com/felipe-araujo/api-agenda"}]',
   '["Python","Backend & SQL"]', '#4881AE', 5, false),
  ('Manuela Dias', 'demo-manuela-dias', 'DS1-25',
   'https://www.linkedin.com/in/manuela-dias', 'manuela-dias', '@manuela.dias',
   'Design e prototipagem no Figma. Transformo o que a turma desenha no papel em tela navegável.',
   '[{"id":"proj-1","titulo":"Redesign do cardápio da cantina","descricao":"Protótipo navegável do cardápio digital da cantina, com filtros por restrição alimentar.","link":"https://github.com/manuela-dias/cardapio-cantina"}]',
   '["Design & UI/UX"]', '#F3B544', 3, false),

  -- DS2-25 -----------------------------------------------------------------
  ('Otávio Ramos', 'demo-otavio-ramos', 'DS2-25',
   'https://www.linkedin.com/in/otavio-ramos', 'otavio-ramos', '@otavio.ramos',
   'Segundo ano de DS, lado de automação. ESP32, sensores e muito fio organizado em protoboard.',
   '[{"id":"proj-1","titulo":"Estufa automatizada com ESP32","descricao":"Umidade, temperatura e irrigação automática com leitura pelo navegador da escola.","link":"https://github.com/otavio-ramos/estufa-esp32"},
    {"id":"proj-2","titulo":"Monitor de tomada inteligente","descricao":"Mede consumo de uma tomada e envia alerta quando passa do limite do mês.","link":"https://github.com/otavio-ramos/tomada-inteligente"}]',
   '["Hardware & IoT","C++ & Embarcados"]', '#38B95D', 9, true),
  ('Clara Bezerra', 'demo-clara-bezerra', 'DS2-25',
   'https://www.linkedin.com/in/clara-bezerra', 'clara-bezerra', '@clara.bezerra',
   'Dados e IA aplicados a problema de escola: separar lixo, prever nota, organizar fila. Python e muitas planilhas.',
   '[{"id":"proj-1","titulo":"Classificador de resíduos","descricao":"Modelo de visão computacional que identifica tipo de resíduo pela câmera do celular.","link":"https://github.com/clara-bezerra/classificador-residuos"},
    {"id":"proj-2","titulo":"Painel de notas da turma","descricao":"Gráficos de evolução por bimestre com pandas e matplotlib, alimentados por CSV.","link":"https://github.com/clara-bezerra/painel-notas"}]',
   '["IA & Dados","Python"]', '#D74D42', 11, true),
  ('Gustavo Peixoto', 'demo-gustavo-peixoto', 'DS2-25',
   'https://www.linkedin.com/in/gustavo-peixoto', 'gustavo-peixoto', '@gustavo.peixoto',
   'Robótica e impressão 3D. Projeto as peças no Fusion 360, imprimo em PLA e programo o movimento no Arduino.',
   '[{"id":"proj-1","titulo":"Braço robótico de mesa","descricao":"Braço de 4 graus de liberdade impresso em 3D, controlado por joystick e servo motores.","link":"https://github.com/gustavo-peixoto/braco-robotico"}]',
   '["Robótica","Modelagem 3D"]', '#2D929E', 6, false),

  -- DS4-25 -----------------------------------------------------------------
  ('Helena Cruz', 'demo-helena-cruz', 'DS4-25',
   'https://www.linkedin.com/in/helena-cruz', 'helena-cruz', '@helena.cruz.dev',
   'Quarto ano de DS. Fullstack com foco em produto: prefiro um sistema pequeno que a escola usa de verdade a um grande que ninguém abre.',
   '[{"id":"proj-1","titulo":"Portal de notas da turma","descricao":"Consulta de notas por bimestre com login simples e exportação em PDF.","link":"https://github.com/helena-cruz/portal-notas"}]',
   '["Backend & SQL","Web Frontend"]', '#4881AE', 7, false),
  ('Leonardo Vidal', 'demo-leonardo-vidal', 'DS4-25',
   'https://www.linkedin.com/in/leonardo-vidal', 'leonardo-vidal', '@leonardo.vidal',
   'Mobile e web. Gosto de app que funciona offline e de mapa: os dois projetos abaixo nasceram de dor real de transporte.',
   '[{"id":"proj-1","titulo":"App de carona solidária","descricao":"Cadastro de caronas entre alunos com horário e ponto de encontro, em React Native.","link":"https://github.com/leonardo-vidal/caronas-sesi"}]',
   '["Mobile","Web Frontend"]', '#3FC2BC', 5, false),
  ('Miguel Fontana', 'demo-miguel-fontana', 'DS4-25',
   'https://www.linkedin.com/in/miguel-fontana', 'miguel-fontana', '@miguel.fontana',
   'Embarcados e segurança eletrônica. RFID, fechaduras e o prazer de ver o LED verde acender na primeira vez.',
   '[{"id":"proj-1","titulo":"Controle de acesso com RFID","descricao":"Leitor RFID com cadastro de cartões em EEPROM e trilha sonora de acerto e erro.","link":"https://github.com/miguel-fontana/acesso-rfid"}]',
   '["C++ & Embarcados"]', '#F3B544', 4, false),

  -- DS1-26 -----------------------------------------------------------------
  ('Bianca Teixeira', 'demo-bianca-teixeira', 'DS1-26',
   'https://www.linkedin.com/in/bianca-teixeira', 'bianca-teixeira', '@bianca.teixeira',
   'Primeiro ano de DS, turma de 2026. Comecei por Python e não parei mais: agora ensino as colegas da salinha do almoço.',
   '[{"id":"proj-1","titulo":"Conversor de unidades","descricao":"Conversor de temperatura, distância e moedas com interface de terminal.","link":"https://github.com/bianca-teixeira/conversor-unidades"}]',
   '["Python"]', '#38B95D', 2, false),
  ('Rodrigo Sales', 'demo-rodrigo-sales', 'DS1-26',
   'https://www.linkedin.com/in/rodrigo-sales', 'rodrigo-sales', '@rodrigo.sales',
   'Primeiro ano, focado em web. Minha meta do ano é publicar um site por bimestre e documentar o que aprendi em cada um.',
   '[{"id":"proj-1","titulo":"Página da feira de ciências","descricao":"One-page com grades, exposições e mapa das bancas da feira deste ano.","link":"https://github.com/rodrigo-sales/feira-ciencias"}]',
   '["Web Frontend"]', '#2D929E', 3, false),
  ('Fernanda Lopes', 'demo-fernanda-lopes', 'DS1-26',
   'https://www.linkedin.com/in/fernanda-lopes', 'fernanda-lopes', '@fernanda.lopes',
   'Design e código na mesma medida. Estudo tipografia e acessibilidade enquanto aprendo meu primeiro framework.',
   '[{"id":"proj-1","titulo":"Portfólio pessoal","descricao":"Portfólio em HTML e CSS puro, com versão de alto contraste e navegação por teclado.","link":"https://github.com/fernanda-lopes/portfolio"}]',
   '["Design & UI/UX","Web Frontend"]', '#D74D42', 2, false),

  -- DS2-26 -----------------------------------------------------------------
  ('Arthur Pinheiro', 'demo-arthur-pinheiro', 'DS2-26',
   'https://www.linkedin.com/in/arthur-pinheiro', 'arthur-pinheiro', '@arthur.pinheiro',
   'Segundo ano de DS. Robô seguidor de linha é meu projeto de vida: já perdi a conta de quantas versões de calibração fiz.',
   '[{"id":"proj-1","titulo":"Robô seguidor de linha","descricao":"Seguidor de linha com Raspberry Pi Pico e matriz de sensores, com calibração por botão.","link":"https://github.com/arthur-pinheiro/seguidor-linha"}]',
   '["Robótica","Python"]', '#F3B544', 6, false),
  ('Larissa Prado', 'demo-larissa-prado', 'DS2-26',
   'https://www.linkedin.com/in/larissa-prado', 'larissa-prado', '@larissa.prado',
   'IA aplicada ao dia a dia da escola. Meu foco é chatbot que responde dúvida de horário, prova e material sem inventar resposta.',
   '[{"id":"proj-1","titulo":"Chatbot de dúvidas escolares","descricao":"Bot de regras com base de conhecimento editável pela turma, integrado ao site da escola.","link":"https://github.com/larissa-prado/chatbot-escolar"}]',
   '["IA & Dados"]', '#3FC2BC', 4, false),
  ('Vinícius Melo', 'demo-vinicius-melo', 'DS2-26',
   'https://www.linkedin.com/in/vinicius-melo', 'vinicius-melo', '@vinicius.melo',
   'Eletrônica e IoT. Gosto de projeto que cabe na mão e que a família consegue usar em casa depois da feira.',
   '[{"id":"proj-1","titulo":"Termômetro com display","descricao":"Sensor de temperatura e umidade com display OLED e histórico das últimas 24 horas.","link":"https://github.com/vinicius-melo/termometro-oled"}]',
   '["Hardware & IoT"]', '#4881AE', 3, false),

  -- DSM3-25 ----------------------------------------------------------------
  ('Carolina Freitas', 'demo-carolina-freitas', 'DSM3-25',
   'https://www.linkedin.com/in/carolina-freitas', 'carolina-freitas', '@carolina.freitas',
   'Terceiro ano de DSM. Backend e análise de dados: meu TCC é um painel de frequência que a coordenação acompanha semanalmente.',
   '[{"id":"proj-1","titulo":"Dashboard de frequência","descricao":"Frequência por turma e por aluno com alertas de evasão, em Node.js e PostgreSQL.","link":"https://github.com/carolina-freitas/dashboard-frequencia"},
    {"id":"proj-2","titulo":"Relatórios automáticos","descricao":"Geração semanal de relatórios em PDF enviados por e-mail para os professores.","link":"https://github.com/carolina-freitas/relatorios-pdf"}]',
   '["Backend & SQL","IA & Dados"]', '#2D929E', 10, true),
  ('Eduardo Nakamura', 'demo-eduardo-nakamura', 'DSM3-25',
   'https://www.linkedin.com/in/eduardo-nakamura', 'eduardo-nakamura', '@eduardo.nakamura',
   'Terceiro ano de DSM. Mobile e backend, e a lição que o TCC me deu: a parte difícil é o cadastro, não o gráfico.',
   '[{"id":"proj-1","titulo":"App de reservas do laboratório","descricao":"Reserva de máquinas do laboratório com fila por horário e confirmação por e-mail.","link":"https://github.com/eduardo-nakamura/reservas-lab"}]',
   '["Mobile","Backend & SQL"]', '#D74D42', 8, false),
  ('Paloma Andrade', 'demo-paloma-andrade', 'DSM3-25',
   'https://www.linkedin.com/in/paloma-andrade', 'paloma-andrade', '@paloma.andrade',
   'Terceiro ano de DSM. Frontend e projeto social: transformei o trabalho de conclusão em plataforma de voluntariado da escola.',
   '[{"id":"proj-1","titulo":"Plataforma de voluntariado","descricao":"Vagas de ação social da escola com inscrição, horas registradas e certificado em PDF.","link":"https://github.com/paloma-andrade/voluntariado"}]',
   '["Web Frontend","Design & UI/UX"]', '#38B95D', 7, false)
) AS v(nome, slug, turma, linkedin, github, instagram, bio, projetos, habilidades, cor, estrelas, destaque)
JOIN public.salas s ON s.nome = v.turma
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  sala_id = EXCLUDED.sala_id,
  linkedin = EXCLUDED.linkedin,
  github = EXCLUDED.github,
  instagram = EXCLUDED.instagram,
  bio = EXCLUDED.bio,
  projetos = EXCLUDED.projetos,
  habilidades = EXCLUDED.habilidades,
  cor_perfil = EXCLUDED.cor_perfil,
  estrelas = EXCLUDED.estrelas,
  destaque = EXCLUDED.destaque;

-- Os 12 do seed 002 ganham projetos, Instagram e competências. Nome, sala,
-- links e estrelas continuam de conta do 002. Um UPDATE por aluno (em vez de
-- UPDATE ... FROM (VALUES)) porque o lint do db-query.sh é regex e não enxerga
-- WHERE depois de um FROM comprido.

UPDATE public.alunos SET
  instagram = '@lucas.albuquerque.fll',
  projetos = '[{"id":"proj-1","titulo":"Robô FLL 2026","descricao":"Robô da temporada atual da FIRST LEGO League, com missões priorizadas por pontos por segundo.","link":"https://github.com/lucasalbuquerque/robo-fll"},
    {"id":"proj-2","titulo":"Treinador de sensores Spike Prime","descricao":"App web que lê os sensores do Spike pela porta serial e plota os valores em tempo real.","link":"https://github.com/lucasalbuquerque/spike-sensores"}]'::jsonb,
  habilidades = '["Robótica","Python"]'::jsonb
WHERE slug = 'lucas-albuquerque';

UPDATE public.alunos SET
  instagram = '@biasilva.dev',
  projetos = '[{"id":"proj-1","titulo":"Site do evento SESI","descricao":"Site da mostra de ciências com programação por dia, fotos e inscrição por formulário.","link":"https://github.com/biasilvadev/site-evento"}]'::jsonb,
  habilidades = '["Web Frontend","Design & UI/UX"]'::jsonb
WHERE slug = 'beatriz-vasconcelos';

UPDATE public.alunos SET
  instagram = '@gabriel.iot',
  projetos = '[{"id":"proj-1","titulo":"Estação meteorológica ESP32","descricao":"Temperatura, umidade e pressão publicadas num painel web, com histórico de 7 dias.","link":"https://github.com/gabriel-iot/estacao-meteorologica"}]'::jsonb,
  habilidades = '["Hardware & IoT","C++ & Embarcados"]'::jsonb
WHERE slug = 'gabriel-monteiro';

UPDATE public.alunos SET
  instagram = '@sofia.ux.design',
  projetos = '[{"id":"proj-1","titulo":"Design system da escola","descricao":"Cores, tipografia e componentes do padrão visual usado nos projetos da turma de desenvolvimento.","link":"https://github.com/sofia-ux/design-system-escola"}]'::jsonb,
  habilidades = '["Design & UI/UX"]'::jsonb
WHERE slug = 'sofia-mendonca';

UPDATE public.alunos SET
  instagram = '@enzorobotica',
  projetos = '[{"id":"proj-1","titulo":"Robô de combate 3 kg","descricao":"Chassi de policarbonato, escudo impresso e controle por rádio, campeão da internal de 2026.","link":"https://github.com/enzorobotica/robo-combate"}]'::jsonb,
  habilidades = '["Robótica","Modelagem 3D","C++ & Embarcados"]'::jsonb
WHERE slug = 'enzo-cavalcanti';

UPDATE public.alunos SET
  instagram = '@marianaribeiro.dev',
  projetos = '[{"id":"proj-1","titulo":"API de mural de avisos","descricao":"Mural por turma com autenticação de professor e expiração automática de aviso.","link":"https://github.com/marianaribeiro/api-mural"}]'::jsonb,
  habilidades = '["Backend & SQL","IA & Dados"]'::jsonb
WHERE slug = 'mariana-ribeiro';

UPDATE public.alunos SET
  instagram = '@pedro.iot',
  projetos = '[{"id":"proj-1","titulo":"Servidor caseiro Raspberry Pi","descricao":"Media server e backup da família rodando num Pi, com painel de temperatura do gabinete.","link":"https://github.com/pedro-iot/servidor-caseiro"}]'::jsonb,
  habilidades = '["Hardware & IoT"]'::jsonb
WHERE slug = 'pedro-henrique-lima';

UPDATE public.alunos SET
  instagram = '@camila.dev.br',
  projetos = '[{"id":"proj-1","titulo":"Jogo de adivinhação em Python","descricao":"Jogo de números com níveis e placar, feito para o clube de lógica do primeiro ano.","link":"https://github.com/camila-dev/adivinhacao-python"}]'::jsonb,
  habilidades = '["Python"]'::jsonb
WHERE slug = 'camila-antunes';

UPDATE public.alunos SET
  instagram = '@thiagofll',
  projetos = '[{"id":"proj-1","titulo":"Chassi de robô FTC impresso","descricao":"Chassi modular impresso em PLA com encaixe para motores e sensores sem parafuso.","link":"https://github.com/thiagofll/chassi-ftc"}]'::jsonb,
  habilidades = '["Modelagem 3D","Robótica"]'::jsonb
WHERE slug = 'thiago-fagundes';

UPDATE public.alunos SET
  instagram = '@larissaduarte.app',
  projetos = '[{"id":"proj-1","titulo":"App de leitura em Flutter","descricao":"Registro de leituras com meta anual e estatísticas por gênero, offline first.","link":"https://github.com/larissaduarte/app-leitura"}]'::jsonb,
  habilidades = '["Mobile"]'::jsonb
WHERE slug = 'larissa-duarte';

UPDATE public.alunos SET
  instagram = '@matheus.maker',
  projetos = '[{"id":"proj-1","titulo":"Automação da iluminação da sala","descricao":"ESP32 com sensor de presença e luminosidade que decide acender ou não as luzes.","link":"https://github.com/matheus-maker/iluminacao-auto"}]'::jsonb,
  habilidades = '["Hardware & IoT"]'::jsonb
WHERE slug = 'matheus-nogueira';

UPDATE public.alunos SET
  instagram = '@isabelafontes',
  projetos = '[{"id":"proj-1","titulo":"Medidor de energia solar","descricao":"Placa pequena com sensor de corrente que estima a geração do dia e guarda num cartão SD.","link":"https://github.com/isabelafontes/medidor-solar"}]'::jsonb,
  habilidades = '["Hardware & IoT","Python"]'::jsonb
WHERE slug = 'isabela-fontes';
