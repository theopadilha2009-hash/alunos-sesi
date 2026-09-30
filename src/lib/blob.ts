import { put } from "@vercel/blob/client";

/**
 * Ponte com o Vercel Blob.
 *
 * É o que tira a imagem do corpo do POST: o navegador manda o arquivo direto
 * para o store e o formulário passa a carregar só a URL. O `bodySizeLimit` de
 * 4 MB do Server Action deixa de ser o teto real da edição — duas mídias no
 * limite já somavam os 4.194.304 B exatos e derrubavam o save inteiro.
 *
 * Sem imports do PROJETO de propósito. O editor no browser importa daqui, e
 * `seguranca.ts` (que puxa `node:crypto`) não pode entrar no bundle do cliente;
 * mesma razão de `cores.ts` e `limites.ts` serem folha. O `@vercel/blob/client`
 * é a exceção que não pesa: o upload já era feito com ele, e agora é por conta
 * do `enviarAoBlob`.
 */

/**
 * Host do store público, como fonte de CSP para o `connect-src`.
 *
 * O wildcard não é folga: o host real de um arquivo é
 * `<storeId>.public.blob.vercel-storage.com` — o id do store é o subdomínio.
 * `blob.vercel-storage.com` sozinho é o domínio base, e `connect-src` casa
 * host exato, então o PUT do upload direto era bloqueado no navegador. O erro
 * só aparecia no console, e o aluno via "Não foi possível enviar a imagem".
 *
 * Escopado em `.public.` de propósito: o store é público, e um `*.blob...`
 * largo liberaria também o host de leitura de stores privados.
 */
export const HOST_BLOB = "https://*.public.blob.vercel-storage.com";

/** Raiz das mídias de aluno dentro do store. */
export const RAIZ_MIDIA = "alunos";

/** Extensão do arquivo, pelo tipo MIME. O Blob guarda o nome que mandarmos. */
const EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Nome do arquivo no store. A unicidade fica com o `addRandomSuffix`. */
export function nomeDaImagem(tipo: string): string {
  return `midia.${EXTENSAO[tipo] ?? "bin"}`;
}

/**
 * O caminho de um arquivo novo, escopado pelo aluno.
 *
 * O prefixo com o `alunoId` não é arrumação: é autorização. A rota de upload
 * recusa todo caminho que não comece pela pasta de quem está pedindo o token,
 * então um aluno não escreve — nem sobrescreve — mídia de outro. Sem isso o
 * `pathname` viria do browser e o store inteiro ficaria aberto para quem
 * tivesse uma sessão.
 */
export function caminhoDaMidia(alunoId: string, nome: string): string {
  return `${RAIZ_MIDIA}/${alunoId}/${nome}`;
}

/**
 * O que pode vir depois da pasta do aluno.
 *
 * Não é estética: `%2e%2e` é `..` para quem decodifica, e quem decodifica o
 * caminho é o store, não nós. A checagem literal de `..` não pega essa forma, e
 * o SDK do Blob só recusa `//`. Com o resto preso a este conjunto, não sobra
 * caractere com significado em nenhuma camada — e o que o editor gera
 * (`nomeDaImagem` mais o sufixo do Blob) cabe inteiro nele.
 */
const RESTO_SEGURO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * O caminho pertence à pasta deste aluno?
 *
 * O `..` tem que morrer aqui: `startsWith` sozinho aceitaria
 * `alunos/<id>/../<outro>/x`, e quem normaliza o caminho depois é o Blob, não
 * nós. A checagem de `..` fica como primeira barreira; `RESTO_SEGURO` fecha as
 * formas que ela não enxerga.
 */
export function caminhoPertenceAoAluno(pathname: unknown, alunoId: unknown): boolean {
  if (typeof pathname !== "string" || typeof alunoId !== "string" || !alunoId) {
    return false;
  }
  if (pathname.includes("..")) return false;

  const prefixo = `${RAIZ_MIDIA}/${alunoId}/`;
  if (!pathname.startsWith(prefixo)) return false;

  return RESTO_SEGURO.test(pathname.slice(prefixo.length));
}

/**
 * Data URL → `Blob`, para o `upload()` do cliente.
 *
 * O editor comprime no canvas e produz data URL; o `@vercel/blob/client` quer
 * `Blob`/`File`. Esta é a ponte entre os dois mundos, e é o que permite manter
 * a compressão como estava: o teto de bytes (`conferirTamanhoDaImagem`)
 * continua medindo sobre o data URL, que é o mesmo número de antes — o blob
 * que sobe é sempre menor que o data URL que o gerou.
 */
export function blobDoDataUrl(dataUrl: string): Blob {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("Não é um data URL.");
  }

  const corte = dataUrl.indexOf(",");
  if (corte < 0) {
    throw new Error("Não é um data URL.");
  }

  const cabecalho = dataUrl.slice(5, corte);
  if (!cabecalho.includes("base64")) {
    throw new Error("Data URL sem base64.");
  }

  const tipo = cabecalho.split(";")[0] || "application/octet-stream";
  const binario = atob(dataUrl.slice(corte + 1));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }

  return new Blob([bytes], { type: tipo });
}

/**
 * A frase que a rota escreveu para quem está enviando.
 *
 * Existe porque o `upload()` do `@vercel/blob/client` não serve a esta rota: a
 * resposta não sendo `ok`, ele lança `BlobError("Failed to retrieve the client
 * token")` e **não lê o corpo** (`dist/client.js:398`, medido no pacote
 * instalado). As três frases escritas em `api/upload/route.ts` — "Entre como
 * aluno para enviar imagens.", "Endereço de envio fora da sua pasta.", "Muitos
 * envios em pouco tempo. Aguarde um instante." — morriam no corpo HTTP, e quem
 * enviava via o texto em inglês da biblioteca. Aqui elas voltam a aparecer: a
 * classe separa "frase nossa, pode ir para a tela" de "diagnóstico de
 * plataforma, não pode".
 */
export class EnvioRecusado extends Error {}

/**
 * Sem frase legível na resposta: a da casa — nunca o texto da plataforma.
 *
 * É a mesma frase que a rota devolve no 500, repetida de propósito: o cliente
 * não pode importar de `app/api` (arrastaria `next/server` para o bundle), e o
 * mesmo desenho já está em `lerRespostaEstrela`, que guarda do lado de cá a
 * `RECUSA_PADRAO` da estrela.
 */
const FALHA_AO_ENVIAR = "Não deu para enviar a imagem agora. Tente de novo.";

/**
 * A frase da resposta, quando ela traz uma.
 *
 * O corpo de erro da rota é contrato: ou é uma das três recusas escritas lá, ou
 * é a frase da casa do 500 — texto cru do banco nunca entra ali, e é o que
 * trava `tests/erro-interno.test.mjs`. Fora desse formato (página de erro do
 * Next, resposta de um proxy no caminho), fica a frase da casa.
 */
async function fraseDaResposta(resposta: Response): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { error?: unknown };
    if (typeof corpo?.error === "string" && corpo.error) return corpo.error;
  } catch {
    // Corpo que não é JSON: não há frase, e a da casa já serve.
  }
  return FALHA_AO_ENVIAR;
}

/**
 * Sobe a imagem e devolve a URL pública.
 *
 * Quem faz a requisição é quem consegue ler a resposta, e é essa a razão de o
 * POST do token ser daqui em vez de ficar com o `upload()`: ele descartava o
 * corpo justamente quando havia uma frase para mostrar. O PUT continua com o
 * `put()` da MESMA biblioteca, com o token de cliente que a rota devolveu — é
 * o PUT que o `upload()` fazia por dentro, então o caminho de sucesso não muda.
 *
 * O `clientPayload` é o mesmo que a rota lê em `lerCampo` para escolher o teto
 * do campo: o teto é decisão do servidor, e o cliente só diz onde a imagem vai
 * ser usada.
 */
export async function enviarAoBlob(
  caminho: string,
  arquivo: Blob,
  opcoes: { clientPayload: string; abortSignal?: AbortSignal },
): Promise<string> {
  const resposta = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: opcoes.abortSignal,
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: {
        pathname: caminho,
        clientPayload: opcoes.clientPayload,
        multipart: false,
      },
    }),
  });

  if (!resposta.ok) {
    throw new EnvioRecusado(await fraseDaResposta(resposta));
  }

  const { clientToken } = (await resposta.json()) as { clientToken?: unknown };
  if (typeof clientToken !== "string") {
    throw new EnvioRecusado(FALHA_AO_ENVIAR);
  }

  const { url } = await put(caminho, arquivo, {
    access: "public",
    token: clientToken,
    abortSignal: opcoes.abortSignal,
  });
  return url;
}
