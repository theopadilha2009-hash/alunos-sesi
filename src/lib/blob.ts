/**
 * Ponte com o Vercel Blob.
 *
 * É o que tira a imagem do corpo do POST: o navegador manda o arquivo direto
 * para o store e o formulário passa a carregar só a URL. O `bodySizeLimit` de
 * 4 MB do Server Action deixa de ser o teto real da edição — duas mídias no
 * limite já somavam os 4.194.304 B exatos e derrubavam o save inteiro.
 *
 * Sem imports do projeto de propósito. O editor no browser importa daqui, e
 * `seguranca.ts` (que puxa `node:crypto`) não pode entrar no bundle do cliente;
 * mesma razão de `cores.ts` e `limites.ts` serem folha.
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
 * O caminho pertence à pasta deste aluno?
 *
 * O `..` tem que morrer aqui: `startsWith` sozinho aceitaria
 * `alunos/<id>/../<outro>/x`, e quem normaliza o caminho depois é o Blob, não
 * nós.
 */
export function caminhoPertenceAoAluno(pathname: unknown, alunoId: unknown): boolean {
  if (typeof pathname !== "string" || typeof alunoId !== "string" || !alunoId) {
    return false;
  }
  if (pathname.includes("..")) return false;

  const prefixo = `${RAIZ_MIDIA}/${alunoId}/`;
  if (!pathname.startsWith(prefixo)) return false;

  const resto = pathname.slice(prefixo.length);
  return resto.length > 0 && !resto.startsWith("/");
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
