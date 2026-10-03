# dívidas — tela 10 (vitrine)

Registro criado na rodada 4 (sweep 03/10) — o agente da onda 1 não deixou
ledger próprio.

## §1 Rodada 4 — filetes soterrados pelo tema claro

`[data-conceito="b"][data-theme="light"] .cartao { border-color: ... }`
(sistema-b.css) tem especificidade (0,3,0) e vencia os hatches
`[data-conceito] [data-podio]` (0,2,0) — no claro, metais do pódio e filetes
do ranking viravam o mesmo cinza. Fix no hatch: `.cartao[data-podio]` /
`.cartao[data-ranking]` (empate em 0,3,0 + `<style>` posterior ao link).
Proposta p/ o sistema: primitivo `.podio`/`.podio--1..3` com as 3 tintas de
metal por tema, e o light do sistema não should set border-color em carta que
já declara borda própria.

## §2 Rodada 4 — disco numerado do ranking sempre ciano

O avatar do B lê --cor-destaque; as linhas data-ranking setavam só --cor
(legado do A). Markup recebeu --cor-destaque inline nas 4 linhas. Lição
Etapa 2: um token de cor por coisa (--cor-destaque) — o --cor do A é alias a
matar no port.

## §3 pré-existente — .barra

Ver 17-galeria §Encerrado: primitivo consolidado nos dois sistemas, hatch
local removido (rodada 3).
