# A direção visual "Frutiger Aero" (19/10/2026)

O Théo pediu a nova direção visual do app: "mais iPhone, bolha de vidro com
cores reais, tipo Frutiger Aero" — a estética 2004-2013 (vidro fosco, brilho
especular, gradiente de céu, cores saturadas e naturais). Decisão de escopo
que ele respondeu: **Tabelas & Alunos primeiro; se a direção agradar, espalha
pro resto** — e o vidro vale **nos dois temas** (claro aqua; escuro iOS com
blur e glow). PR #150, no ar.

Como ficou escrito (o padrão para espalhar):

- O material vive em `src/app/styles/frutiger-2026.css` e TUDO é escopado em
  `.aba-frutiger`, a classe do wrapper da seção no CrmApp — nenhum pixel
  fora da tela muda. Ao levar a outra aba, a classe viaja junto.
- Palco atmosférico: o wrapper recebe o gradiente (céu de meio-dia no claro;
  petróleo com aurora no escuro). Os painéis borram E saturam esse fundo
  (`backdrop-filter: blur(18px) saturate(1.4)`), com borda branca
  translúcida e brilho especular de 1px no topo. Fallback `@supports` para
  browser sem backdrop-filter (vidro vira superfície fechada).
- Cores de sala: deixam de ser pastel lavado e viram bolhas saturadas
  (`color-mix` 34% da cor + borda 72% + sombra da cor). A cor tem função:
  identificar a turma de relance. Mesma cor do banco, mais presença.
- Disciplina: sem brilho decorativo solto; movimento só no hover/resposta;
  `prefers-reduced-motion` desliga as transições.

Junto entrou o que a aba prometia desde sempre e nunca teve: filtros locais
(`PainelTabelaAlunos.tsx`) — busca sem acento, chips de sala, estrelados,
fixados, com redes, contagem. LOCAIS da aba de propósito: os filtros da
Portfólio já vazaram pra cá uma vez e filtravam sem controle na tela.

Selfie de aprovação: screenshots reais nos 2 temas via rota de preview
temporária com dados fake (rota removida antes do commit; padrão que
funcionou para validar visual de tela atrás de login sem tocar em dado de
produção).
