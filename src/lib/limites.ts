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

export type CampoPerfil = "midias" | "projetos" | "stickers" | "foto";

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

const TETO: Record<CampoPerfil, string> = {
  midias: "2 MB por imagem",
  projetos: "2 MB por imagem",
  stickers: "512 KB por sticker",
  foto: "120 KB por foto",
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
    `O perfil aceita ${MAX_MIDIAS} imagens, ${MAX_PROJETOS} projetos e ${LIMITES_STICKERS.max} stickers.`
  );
}

/** Teto de bytes de um único item, por campo. */
const TETO_BYTES: Record<CampoPerfil, number> = {
  midias: MAX_DATA_URL_IMAGEM,
  projetos: MAX_DATA_URL_IMAGEM,
  stickers: LIMITES_STICKERS.maxDataUrlBytes,
  foto: MAX_DATA_URL_FOTO,
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
