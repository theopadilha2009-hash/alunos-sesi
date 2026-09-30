import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { obterSessao } from "@/lib/auth";
import { caminhoPertenceAoAluno } from "@/lib/blob";
import { logger } from "@/lib/debug";
import { LIMITES_STICKERS, MAX_DATA_URL_IMAGEM } from "@/lib/limites";
import { limitar } from "@/lib/rate-limit";

/**
 * O token do upload direto.
 *
 * O arquivo NÃO passa por aqui: esta rota só decide se o navegador pode falar
 * com o store, e responde com um token de vida curta. Quem recebe os bytes é o
 * Vercel Blob. É o que faz o `bodySizeLimit` de 4 MB do Server Action deixar de
 * ser o teto da edição.
 *
 * O `pathname` chega do browser, e o `onBeforeGenerateToken` não pode
 * reescrevê-lo — só recusá-lo. Daí a checagem de que ele cai dentro da pasta
 * de quem pediu: sem ela, qualquer aluno com sessão escreveria na pasta de
 * outro, ou na raiz do store.
 */

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Teto do arquivo, por campo de destino.
 *
 * É a segunda linha de defesa: o cliente já barra em `conferirTamanhoDaImagem`
 * antes de subir, mas essa checagem roda no browser do aluno. Aqui o teto é do
 * servidor, e é o que impede um `fetch` à mão de encher o store.
 *
 * Os valores são os mesmos tetos de data URL: como o blob é sempre menor que o
 * data URL que o gerou, o arquivo que sobe nunca chega perto deles.
 */
const TETO_POR_CAMPO: Record<string, number> = {
  midia: MAX_DATA_URL_IMAGEM,
  projeto: MAX_DATA_URL_IMAGEM,
  sticker: LIMITES_STICKERS.maxDataUrlBytes,
  capa: MAX_DATA_URL_IMAGEM,
  foto: MAX_DATA_URL_IMAGEM,
};

/** Qual teto usar. Campo desconhecido cai no de mídia, que é o maior. */
function lerCampo(clientPayload: string | null): string {
  try {
    const dado = JSON.parse(clientPayload ?? "") as { campo?: unknown };
    const campo = dado?.campo;
    return typeof campo === "string" && campo in TETO_POR_CAMPO ? campo : "midia";
  } catch {
    return "midia";
  }
}

/**
 * Recusa com frase escrita para o aluno.
 *
 * O `catch` desta rota pega dois tipos de erro muito diferentes: as recusas
 * escritas neste arquivo, que são frases nossas para quem está enviando, e o
 * que mais der errado lá dentro — assinatura de callback inválida, store sem
 * token, resposta estranha da API do Blob. A `BlobError` da biblioteca traz
 * texto da plataforma ("Invalid callback signature"), que é diagnóstico.
 *
 * A classe é a linha divisória: só o que nasce `RecusaDeEnvio` tem a frase
 * repassada no corpo; o resto vai para o log.
 *
 * Nota de leitura, medida no `@vercel/blob` instalado (`dist/client.js:398`):
 * o `upload()` do browser lança `BlobError` genérico quando a resposta não é
 * `ok`, sem ler o corpo — então hoje estas frases não chegam à tela de ninguém.
 * Elas continuam aqui porque são nossas (não são vazamento) e porque é o que a
 * rota devolve por contrato. Fazer a frase aparecer é mudança de comportamento
 * e está registrada em `.context/memoria/pendencias-de-decisao.md`.
 */
class RecusaDeEnvio extends Error {}

/** A frase da recusa, e só dela. Qualquer outro erro não tem frase para a tela. */
function fraseDaRecusa(error: unknown): string | null {
  return error instanceof RecusaDeEnvio ? error.message : null;
}

/** Quando não é recusa nossa: o aluno não pode receber o texto da biblioteca. */
const FALHA_AO_ENVIAR = "Não deu para enviar a imagem agora. Tente de novo.";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const sessao = await obterSessao();
        if (!sessao?.alunoId) {
          throw new RecusaDeEnvio("Entre como aluno para enviar imagens.");
        }

        if (!caminhoPertenceAoAluno(pathname, sessao.alunoId)) {
          throw new RecusaDeEnvio("Endereço de envio fora da sua pasta.");
        }

        const limite = await limitar(`upload:${sessao.alunoId}`, 40, 60 * 1000);
        if (!limite.permitido) {
          throw new RecusaDeEnvio("Muitos envios em pouco tempo. Aguarde um instante.");
        }

        return {
          allowedContentTypes: TIPOS_IMAGEM,
          maximumSizeInBytes: TETO_POR_CAMPO[lerCampo(clientPayload)],
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    const motivo = fraseDaRecusa(error);
    if (motivo) {
      // Recusa nossa: a frase foi escrita para o aluno, e o 400 diz que o
      // pedido é que estava errado.
      return NextResponse.json({ error: motivo }, { status: 400 });
    }

    // Daqui para baixo não é recusa — é falha do servidor, e o texto que veio
    // junto nomeia a plataforma. Fica no log; para o aluno vai a frase da casa.
    //
    // atalho: todo não-recusa vira 500, inclusive `BlobError` de requisição
    // malformada (assinatura de callback, tipo de evento), que seria 400;
    // revisitar se a rota passar a ter `onUploadCompleted`, porque aí existe
    // webhook e um 5xx vira retentativa — separar com `instanceof BlobError`.
    logger.error("upload", "falha ao autorizar o envio", error);
    return NextResponse.json({ error: FALHA_AO_ENVIAR }, { status: 500 });
  }
}
