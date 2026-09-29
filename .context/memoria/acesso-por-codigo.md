---
name: acesso-por-codigo
description: "O aluno da planilha assume o próprio perfil com um código que o ADM emite — o caminho que faltava, e por que ele é ditado em voz alta"
metadata:
  node_type: memory
  type: project
---

O ADM emite um código (**Painel ADM** → botão de chave na linha do aluno) e o aluno
resgata em `/` → aba **Ativar** (o rótulo era "Tenho Código", encurtado em
29/09/2026 para as três abas ficarem com a mesma largura no celular), definindo
a própria senha. Entrou em
2026-09-27 (PR #34, migration 015).

**O problema que ele fecha.** O aluno importado pelo ADM ficava órfão: `importarLista`
e `criarAluno` gravam só em `alunos`, nunca em `usuarios` — e `registrarUsuario` SEMPRE
insere um aluno novo, `aprovado: false`. Então o auto-cadastro da mesma pessoa criava
uma **segunda** linha, pendente, e a primeira continuava sem dono. Medido em produção em
27/09/2026: **12 dos 15 alunos sem login**. Depois desta entrega os 12 continuam lá — o
caminho existe, mas ninguém emitiu código para eles ainda.

**Decisões que parecem detalhe e não são:**

- **Crockford Base32 sem I, L, O e U** porque o código é *ditado em voz alta* pelo
  professor, não copiado. O que o aluno digitar no lugar das letras fora do alfabeto
  volta ao dígito (`O`→`0`, `I`/`L`→`1`). O prefixo `SESI` é removido **antes** dessa
  dobra — depois, o `I` de SESI viraria `1` e sobraria um caractere.
- **O banco guarda SHA-256, nunca o código.** Determinístico de propósito, ao contrário
  da senha: o resgate busca `WHERE codigo_hash = $1`, e um hash com salt obrigaria a
  varrer a tabela. Pode ser determinístico porque são 40 bits sorteados, não escolha
  humana.
- **A conta nasce com `!bloqueado` em `senha_hash`** — que `verificarSenha` já recusava.
  Ela existe para segurar o código e o vínculo; não autentica até o resgate.
- **O resgate é de uso único sem janela entre ler e escrever:** o `UPDATE` exige que o
  `codigo_hash` ainda esteja na linha. Dois pedidos simultâneos, só o primeiro passa.

**Não confundir com a aposta 4.** A matrícula do crachá ainda é *derivada* de `id`+`slug`
(`src/lib/identidade.ts`), não atribuída — então `/validar/<slug>` não pode afirmar que o
aluno consta na secretaria. São coisas separadas: aqui o aluno ganha **acesso**; lá ele
ganharia **matrícula real**.

**Pendência:** o login do Lucas Bento ficou sem `estudante.` e sem `.br` — domínio que
não existe. Foi o valor que o Théo passou de próprio punho. Corrigir troca o login de
quem já recebeu a senha, então espera decisão. Ver [[pendencias-de-decisao]].

**Why:** ao ler `auth.ts` daqui a seis meses, `!bloqueado` e o SHA-256 determinístico
parecem descuido — o primeiro como conta quebrada, o segundo como hash fraco. São os
dois o desenho, e cada um tem um motivo medido.

**How to apply:** ao mexer em acesso, confira se a mudança vale para os três caminhos
(login, auto-cadastro, resgate). As regras de senha já divergiram uma vez — 4 caracteres
no cadastro contra 8 na troca — e agora vivem em `problemaDaSenha`, uma só.
