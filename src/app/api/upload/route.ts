import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { obterSessao } from "@/lib/auth";
import { caminhoPertenceAoAluno } from "@/lib/blob";
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

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const sessao = await obterSessao();
        if (!sessao?.alunoId) {
          throw new Error("Entre como aluno para enviar imagens.");
        }

        if (!caminhoPertenceAoAluno(pathname, sessao.alunoId)) {
          throw new Error("Endereço de envio fora da sua pasta.");
        }

        const limite = await limitar(`upload:${sessao.alunoId}`, 40, 60 * 1000);
        if (!limite.permitido) {
          throw new Error("Muitos envios em pouco tempo. Aguarde um instante.");
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
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
