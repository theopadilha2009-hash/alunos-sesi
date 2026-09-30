/**
 * Tetos de mídia do perfil, num módulo puro de propósito.
 *
 * `seguranca.ts` importa `node:crypto` (comparação em tempo constante), então
 * não pode ser importado por client component — e o formulário do Estúdio
 * precisa dos mesmos números para barrar um arquivo grande ANTES de enviar.
 * Aqui as duas pontas bebem da mesma fonte.
 */

export const MAX_MIDIAS = 12;
export const MAX_PROJETOS = 10;

/**
 * Vídeos que o aluno pode colar no perfil.
 *
 * Baixo de propósito. Um perfil é uma apresentação, não um canal: quatro
 * vídeos já ocupam a página inteira, e cada um é um `<iframe>` de outra origem
 * que custa rede e memória na visita. É teto de contagem — o de bytes não se
 * aplica, porque o vídeo de embed não é hospedado por nós.
 */
export const MAX_VIDEOS = 4;

/**
 * Competências que o aluno pode declarar.
 *
 * Menor que a lista fechada de 10 de `LISTA_HABILIDADES` de propósito. O regex
 * da bio corta em 4 porque é heurística; aqui o aluno escolhe a dedo, então
 * cabe mais — mas um perfil com as 10 tags não distingue ninguém, e o perfil
 * existe para distinguir.
 */
export const MAX_HABILIDADES = 6;

/** Teto do data URL de imagem de perfil/capa — o default de `urlImagemSegura`. */
export const MAX_DATA_URL_IMAGEM = 2 * 1024 * 1024;

/**
 * Lado do avatar depois do corte no cliente. O maior consumidor é o PNG do
 * crachá, que desenha um círculo de 140px (`exportar-cracha.ts`); 256 dá folga
 * para tela retina sem virar peso morto no banco.
 */
export const FOTO_LADO = 256;

/**
 * Teto do data URL do avatar.
 *
 * 120 KB é teto, não tamanho esperado: um JPEG 256×256 sai tipicamente entre 15
 * e 25 KB. O teto existe para um arquivo patológico não entrar — e é bem menor
 * que o de mídia porque avatar aparece em lista, em cartão e em tabela, não só
 * na página do dono.
 */
export const MAX_DATA_URL_FOTO = 120 * 1024;

/**
 * Largura da capa depois do corte, no cliente.
 *
 * A capa é uma faixa larga (o container do perfil tem no máximo 52rem — é o
 * `max-width` de `.perfil-moderno`), então 1280 de largura cobre telas retina
 * sem sobrar.
 */
export const LADO_CAPA = 1280;

/**
 * Proporção da capa: 1280×427, a mesma faixa 3:1 de um banner de perfil.
 *
 * A altura NÃO acompanha o original de propósito. Se acompanhasse, uma foto
 * retrato de celular viraria uma capa retrato — e o topo do perfil, que é uma
 * faixa, teria que cortar quase tudo ou esticar a imagem. Recortando aqui, o que
 * o aluno enquadra é o que aparece, e o CSS só redimensiona.
 */
export const PROPORCAO_CAPA = 3;

/**
 * Teto do data URL da capa.
 *
 * Maior que o do avatar (120 KB) porque a imagem também é maior — uma faixa
 * 1280×400 em JPEG sai tipicamente entre 60 e 140 KB. Continua bem abaixo do
 * `bodySizeLimit` de 4 MB do app, que a capa divide com o resto do formulário:
 * perfil inteiro (foto, mídias, stickers e projetos) vai no mesmo POST.
 */
export const MAX_DATA_URL_CAPA = 220 * 1024;

/**
 * O e-mail do aluno é o da escola, não um e-mail pessoal.
 *
 * O campo existe para provar vínculo institucional — é o mesmo papel do
 * `/validar/<slug>`: quem olha de fora vê que aquele perfil pertence a um
 * estudante matriculado. Aceitar `@gmail.com` esvaziaria isso, e é por isso que
 * o sanitizador recusa qualquer domínio que não seja este, incluindo os que
 * apenas TERMINAM com ele (`...sesisenai.org.br.evil.com`).
 *
 * O `.br` no fim não é enfeite: sem ele, o sufixo antigo (`estudante.sesisenai.org`)
 * não casava com o endereço que a escola distribui, e o campo ficou impossível
 * de preencher até 27/09/2026. Se mudar de novo, muda também o CHECK da
 * migration mais recente de `alunos.email` — os dois espelham um ao outro.
 *
 * Fica aqui, e não em `seguranca.ts`, porque o formulário precisa do valor para
 * montar o sufixo fixo do campo — e `seguranca.ts` importa `node:crypto`.
 */
export const DOMINIO_EMAIL_ESCOLA = "estudante.sesisenai.org.br";

/** Teto da parte antes do `@` (o RFC 5321 pede 64). */
export const MAX_EMAIL_LOCAL = 64;

/**
 * Tetos do texto de um projeto, em caracteres.
 *
 * O formulário precisa deles para o `maxLength`, e `sanitizarProjetos` — quem de
 * fato corta — vive em `seguranca.ts`, que importa `node:crypto` e por isso não
 * pode ser lido de um client component. Ficam aqui pela mesma razão de
 * `DOMINIO_EMAIL_ESCOLA`: com o número copiado dos dois lados, o `maxLength` da
 * tela e o corte do servidor ficam livres para divergir em silêncio — e o corte
 * é calado (o excedente só entra na lista de descartes), então a divergência
 * apareceria como texto que o aluno digita, vê salvo e reencontra encolhido.
 */
export const MAX_CARACTERES_TITULO_PROJETO = 80;
export const MAX_CARACTERES_DESCRICAO_PROJETO = 200;

/**
 * Teto do arquivo de banner ANTES de ele virar data URL na memória.
 *
 * Não é o teto do que fica salvo: esse é o de `MAX_DATA_URL_CAPA` (~165 KB de
 * arquivo), e o recorte do modal reencoda a faixa até caber nele — uma foto de
 * celular de 3 MB é o caminho comum e precisa passar. Este é um teto de memória:
 * o `FileReader` monta o data URL inteiro (4/3 do arquivo) antes de o recorte
 * existir, e um arquivo de dezenas de MB travava a aba do aluno sem uma palavra.
 *
 * É número de julgamento, não um limite do produto — por isso mora aqui, junto
 * do teto real, e não solto no componente que o aplica.
 */
export const MAX_BYTES_CAPA = 10 * 1024 * 1024;

export const LIMITES_STICKERS = {
  max: 12,
  tamanhoMin: 16,
  tamanhoMax: 320,
  tamanhoPadrao: 64,
  maxRotulo: 40,
  /** Por sticker: 12 × 4 MB estouraria o bodySizeLimit de 4mb do app. */
  maxDataUrlBytes: 512 * 1024,
  /** Soma dos data URLs de um mesmo perfil. */
  maxTotalBytes: 2 * 1024 * 1024,
} as const;

export type CampoPerfil = "midias" | "projetos" | "stickers" | "foto" | "capa" | "videos";

/** Por que um item enviado não entrou no perfil. */
export type MotivoDescarte =
  | "url-invalida"
  | "link-invalido"
  | "grande-demais"
  | "sem-titulo"
  | "acima-do-limite"
  | "duplicado"
  | "projeto-inexistente";

export interface Descarte {
  motivo: MotivoDescarte;
  campo: CampoPerfil;
}

const ROTULO: Record<MotivoDescarte, string> = {
  "url-invalida": "endereço inválido",
  "link-invalido": "endereço inválido",
  "grande-demais": "arquivo grande demais",
  "sem-titulo": "projeto sem título",
  "acima-do-limite": "acima do limite do perfil",
  duplicado: "item repetido",
  "projeto-inexistente": "projeto que não existe mais",
};

/**
 * O teto de cada campo, como ele aparece no aviso ao aluno.
 *
 * Os números dos irmãos são os do data URL; o da capa é o da imagem decodificada
 * (220 KB de base64 são ~165 KB de arquivo), a mesma unidade que
 * `conferirTamanhoDaImagem` mostra no editor na hora da escolha — e é ele que o
 * aluno tem como referência ao trocar de arquivo. Um texto que discordasse do
 * aviso local mandaria o aluno procurar um erro onde não há.
 */
const TETO: Record<CampoPerfil, string> = {
  midias: "2 MB por imagem",
  projetos: "2 MB por imagem",
  stickers: "512 KB por sticker",
  foto: "120 KB por foto",
  capa: "capa até 165 KB",
  // Vídeo de embed não passa por nós e não tem teto de bytes — este texto
  // nunca é lido por `descreverDescartes` (o motivo dele é `url-invalida`).
  videos: "link de YouTube ou Vimeo",
};

/**
 * Substantivo do que ficou de fora, quando o motivo não é mais específico que o
 * campo. Um `Record` e não um ternário encadeado: com quatro campos o encadeado
 * vira uma linha que ninguém lê, e o compilador deixa de cobrar o campo novo —
 * que é como um `foto` recém-criado acaba rotulado "sticker" no aviso.
 */
const ALVO_PADRAO: Record<CampoPerfil, string> = {
  midias: "imagem",
  projetos: "capa de projeto",
  stickers: "sticker",
  foto: "foto",
  capa: "capa do perfil",
  videos: "vídeo",
};

/**
 * O que de fato ficou de fora.
 *
 * O `campo` sozinho não basta. Em `projetos` três coisas diferentes podem cair:
 * o projeto inteiro (sem título), só a capa, ou só o link — e dizer "1× projeto"
 * quando o projeto entrou e apenas a capa saiu é mentir para o aluno. O motivo
 * diz qual dos três foi; por isso ele, e não o campo, escolhe o substantivo.
 */
function alvoDe({ motivo, campo }: Descarte): string {
  switch (motivo) {
    case "sem-titulo":
      return "projeto";
    case "link-invalido":
      return "link de projeto";
    case "duplicado":
    case "projeto-inexistente":
      return "sticker";
    default:
      return ALVO_PADRAO[campo];
  }
}

/**
 * Uma linha por motivo, com a contagem. `null` quando nada foi descartado — aí
 * o chamador não mostra aviso nenhum.
 *
 * Isto existe porque o descarte era silencioso: o aluno subia a foto, o resto
 * do perfil salvava e a foto sumia sem uma palavra. Perda de dado sem aviso.
 */
export function descreverDescartes(descartes: readonly Descarte[]): string | null {
  if (descartes.length === 0) return null;

  const porMotivo = new Map<string, { motivo: MotivoDescarte; campo: CampoPerfil; n: number }>();
  for (const d of descartes) {
    const chave = `${d.motivo}:${d.campo}`;
    const atual = porMotivo.get(chave);
    if (atual) atual.n++;
    else porMotivo.set(chave, { motivo: d.motivo, campo: d.campo, n: 1 });
  }

  const partes = [...porMotivo.values()].map(({ motivo, campo, n }) => {
    const rotulo =
      motivo === "grande-demais"
        ? `${ROTULO[motivo]} (${TETO[campo]})`
        : ROTULO[motivo];
    return `${n}× ${alvoDe({ motivo, campo })}: ${rotulo}`;
  });

  return (
    `Parte do que você enviou não entrou: ${partes.join("; ")}. ` +
    `O perfil aceita ${MAX_MIDIAS} imagens, ${MAX_PROJETOS} projetos, ` +
    `${LIMITES_STICKERS.max} stickers e ${MAX_VIDEOS} vídeos.`
  );
}

/**
 * Teto de bytes de um único item, por campo.
 *
 * `videos` é o teto do LINK, não de arquivo: o vídeo de embed mora no YouTube
 * ou no Vimeo, e o que entra no banco são ~11 caracteres de id. O número é o
 * mesmo corte de `urlSegura`/`urlImagemSegura`, para os três concordarem.
 */
const TETO_BYTES: Record<CampoPerfil, number> = {
  midias: MAX_DATA_URL_IMAGEM,
  projetos: MAX_DATA_URL_IMAGEM,
  stickers: LIMITES_STICKERS.maxDataUrlBytes,
  foto: MAX_DATA_URL_FOTO,
  capa: MAX_DATA_URL_CAPA,
  videos: 2048,
};

export function tetoDoCampo(campo: CampoPerfil): number {
  return TETO_BYTES[campo];
}

// ── Pré-checagem no cliente ─────────────────────────────────────────────────

/** O base64 ocupa 4/3 do binário original — a conversão abaixo desfaz isso. */
const FATOR_BASE64 = 3 / 4;

/**
 * Bytes de imagem que o data URL carrega.
 *
 * Mede a string inteira, e não só o base64, porque é `url.length` que o
 * servidor compara com o teto (`urlImagemSegura`). Medir uma coisa e comparar
 * outra deixaria os dois lados discordando na fronteira.
 */
function bytesDaImagem(dataUrl: string): number {
  return dataUrl.length * FATOR_BASE64;
}

/** O teto do campo na mesma unidade do tamanho, para os dois serem comparáveis. */
function tetoEmBytesDeImagem(campo: CampoPerfil): number {
  return tetoDoCampo(campo) * FATOR_BASE64;
}

/**
 * Tamanho na unidade que o aluno lê: KB abaixo de 1 MB, MB acima.
 *
 * `paraCima` separa os dois usos. O tamanho real sobe e o teto desce, senão um
 * arquivo que passa do limite por poucos bytes imprimiria "tem cerca de 1,5 MB
 * e o perfil aceita até 1,5 MB". Como os tetos fecham em KB inteiro depois do
 * fator base64 (2 MB de data URL = 1,5 MB de imagem; 512 KB = 384 KB; 120 KB de
 * foto = 90 KB), descer o teto não mente sobre ele, e subir o tamanho garante
 * que os dois números nunca coincidam.
 */
function emTamanho(bytes: number, paraCima: boolean): string {
  const arredondar = paraCima ? Math.ceil : Math.floor;
  const kb = bytes / 1024;
  if (kb < 1024) return `${arredondar(kb)} KB`;
  const mb = arredondar((kb / 1024) * 10) / 10;
  return `${mb.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
}

/**
 * Mensagem quando o data URL passa do teto do campo; `null` quando cabe.
 *
 * O formulário chama isto ANTES de subir. O GIF entra cru, sem passar pelo
 * canvas de `comprimirImagemArquivo`, então um GIF de 5 MB viajava inteiro até
 * o servidor só para ser recusado — e sumia sem aviso. Aqui o aluno descobre na
 * hora, sem gastar o upload.
 *
 * O teto é medido sobre o data URL, que é o que o servidor mede; mas os dois
 * números mostrados são do arquivo, que é o que o aluno vê no Finder.
 */
export function conferirTamanhoDaImagem(url: string, campo: CampoPerfil): string | null {
  if (!url.startsWith("data:image/")) return null;
  if (url.length <= tetoDoCampo(campo)) return null;

  const alvo = ALVO_PADRAO[campo];
  return (
    `Essa ${alvo} tem cerca de ${emTamanho(bytesDaImagem(url), true)} e o perfil aceita ` +
    `até ${emTamanho(tetoEmBytesDeImagem(campo), false)}. Escolha um arquivo menor.`
  );
}

/**
 * O teto do campo como texto para a tela, na unidade do ARQUIVO.
 *
 * É o mesmo número que `conferirTamanhoDaImagem` mostra ao recusar, porque as
 * duas frases saem de `emTamanho(tetoEmBytesDeImagem(campo))` — quem anuncia o
 * teto e quem o aplica não podem discordar.
 *
 * Antes disto o dropzone de capa de projeto dizia "até 4MB" digitado à mão, e o
 * campo barrava em 1,5 MB: o aluno escolhia a foto que a tela dizia caber e ela
 * era descartada. É a terceira vez que o mesmo número digitado de novo diverge —
 * por isso ele não é digitado de novo.
 */
export function tetoLegivelDoCampo(campo: CampoPerfil): string {
  return emTamanho(tetoEmBytesDeImagem(campo), false);
}
