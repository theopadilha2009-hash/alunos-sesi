# CONTEÚDO — elenco fixo do showcase

Todos os dados de pessoas são daqui, idênticos em todas as telas (o showcase conta
uma história só). Strings de UI você copia do arquivo-fonte da tela (PADROES.md §
Conteúdo). Números são ilustrativos.

## Contexto

Escola SESI · Joinville–SC. turmas de Informática, ano letivo 2026. Vitrine com
10 alunos aprovados. Quem usa o CRM no showcase é **Alice Duarte** (perfil completo,
aba "Meu Perfil" e editor). O ADM mostra a fila com 3 pendentes.

## Salas (cor = derivada da paleta; no app real é hash em `cores.ts`)

| Sala | Cor | Alunos |
|---|---|---|
| 3ºA | `--ciano` (#3FC2BC) | 4 |
| 3ºB | `--verde` (#38B95D) | 2 |
| 4ºA | `--amarelo` (#F3B544) | 2 |
| 5ºA | `--vermelho` (#D74D42) | 2 |

Aluno pode ter **cor de perfil própria** escolhida (override): Luana usa
`--azul-claro`, Enzo usa `--petroleo` — é a feature `cor_perfil`.

## Alunos (nome · slug · sala · estrelas · bio em ≤280 · links)

1. **Alice Duarte** · `alice-duarte` · 3ºA · 14 ★ · "Terceiro ano, foco em front-end.
   Fiz o portfólio da turma em Next.js e ensino planilha pra quem quiser." ·
   github.com/aliceduarte · linkedin.com/in/aliceduarte · alice@estudante.sesisenai.org.br
2. **Luana Ferraz** · `luana-ferraz` · 3ºA · 11 ★ · "Design e dados. Mexo com Figma,
   Power BI e uns scripts em Python." · github.com/luanaferraz
3. **Pedro Ivo Schmitt** · `pedro-ivo-schmitt` · 3ºA · 9 ★ · "Automação: n8n no dia a
   dia do grêmio. Tenho medo de tarefa repetitiva."
4. **Davi Bittencourt** · `davi-bittencourt` · 3ºA · 6 ★ · "Back-end e banco. Se tem
   SELECT, tem eu." · github.com/davibit
5. **Yasmin Rocha** · `yasmin-rocha` · 3ºB · 12 ★ · "Vídeo e interação. Meu portfólio
   tem até QR code que abre reel."
6. **Enzo Marchiori** · `enzo-marchiori` · 3ºB · 8 ★ · "Games e React Native. Projeto
   da feira: app de trigonometria com placar."
7. **Thales Wobeto** · `thales-wobeto` · 4ºA · 10 ★ · "Redes e infraestrutura. Montei
   a rede do laboratório novo." · linkedin.com/in/thaleswobeto
8. **Bruna Selming** · `bruna-selming` · 4ºA · 5 ★ · "IA aplicada: treinei um classificador
   de resíduos pra cantina."
9. **Otávio Redivo** · `otavio-redivo` · 5ºA · 7 ★ · "Veterano. Mentor dos menores e
   suspeito de quase todo deploy quebrado."
10. **Marina Kowalski** · `marina-kowalski` · 5ºA · 13 ★ · "Produto. Documento tudo,
   prototipo rápido, testo com a turma inteira." · github.com/mkowalski

Pendentes de aprovação (fila do ADM): **Rafael Kuntz** (5ºA), **Iasmin Bonilha**
(3ºB), **Nathan Prado** (4ºA) — aparecem só no Painel ADM/standalone, nunca na
vitrine (404 honesto).

## Projetos (repetem iguais em todas as telas)

- **Portfólio da Turma** (Alice, 3ºA) — Next.js + Supabase, vitrine dos alunos.
- **Painho de Resíduos** (Bruna, 4ºA) — classificador de resíduos da cantina.
- **TriNet** (Enzo, 3ºB) — app de trigonometria com placar, React Native.
- **GrêmioFlow** (Pedro Ivo, 3ºA) — automações n8n do grêmio.
- **Rota Lab** (Thales, 4ºA) — rede do laboratório novo (documentação + mapa).
- **Reel QR** (Yasmin, 3ºB) — portfólio em vídeo com QR.

## Competências (habilidades; as 10 endossáveis do app podem aparecer com +1)

`React`, `Next.js`, `Python`, `SQL`, `Figma`, `n8n`, `Power BI`, `Excel`, `UI Design`,
`Documentação` — distribuídas 3–4 por aluno como no elenco acima. Endossos visíveis
exemplo: React 6 apoios (Alice), SQL 4 (Davi).

## Mídias/vídeos

Capas de projeto: placeholder CSS com gradiente de tokens (PADROES). Vídeo: um
YouTube embed estático por perfil com thumbnail placeholder (id fictício
`SESIVITRINE01`). Galeria do Meu Perfil: 4 imagens placeholder com legendas reais
de estilo ("Feira de Profissões 2026", "Deploy da vitrine", "Laboratório novo",
"Gravação do reel").

## Números da turma (Retrato / Hall da Fama / métricas do ADM)

10 alunos · 4 salas · 76 estrelas no total · completude geral 65% (com LinkedIn 7,
com GitHub 6) · Hall: 1º Alice (14★), 2º Marina (13★), 3º Yasmin (12★). Ranking de
salas: 3ºA (40★, 75%), 5ºA (20★, 50%), 3ºB (20★, 50%), 4ºA (15★, 75%).

## Insígnias (escada real de `insignias.ts` aplicada à Alice)

Alice: "Primeira Estrela" (conquistada), "Em Ascensão" (conquistada), "Queridinha da
Turma" (8★/10 — faltam 2), barra de progresso 80%.

## Textos institucionais (usar, não inventar)

- Validação: "SISTEMA FIESC · SESI SENAI", "AUTENTICAÇÃO PÚBLICA DIGITAL",
  selo "MATRÍCULA VALIDADA · ESTUDANTE ATIVO", rodapé "Código de integridade
  (HMAC-SHA256)" + hash fictício `a3f9…c1d2` (24 chars visíveis).
- Cartão NFC: header "SESI SC · JOINVILLE", lista linktree: Crachá Digital,
  Selo de Matrícula, LinkedIn, GitHub, Instagram, Mini-Currículo (A4).
- Rodapé público: "Escola SESI · Formando desenvolvedores para o futuro."
- Matrícula derivada no estilo do app: `3A26-0041-887` (Alice).
