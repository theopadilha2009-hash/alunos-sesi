/**
 * Copia texto para a área de transferência, dizendo se deu certo.
 *
 * `navigator.clipboard` não existe em contexto não-seguro e, em alguns
 * navegadores, exige permissão que pode ser negada. O `execCommand("copy")`
 * legado ainda cobre esses casos, então ele entra como segunda tentativa.
 *
 * Devolve `true`/`false` em vez de lançar porque quem chama precisa reagir: sem
 * o retorno, o `catch {}` que havia em cada tela engolia a falha em silêncio e o
 * botão simplesmente não virava "Copiado!" — o aluno ficava sem saber se copiou.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  if (!texto) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Permissão negada ou contexto não-seguro: tenta o caminho antigo.
  }

  const area = document.createElement("textarea");
  // `select()` tira o foco de onde ele estava. Três destes botões vivem em
  // modal com trava de foco: não devolver deixa o teclado preso fora do diálogo.
  const focoAnterior = document.activeElement as HTMLElement | null;

  try {
    area.value = texto;
    area.setAttribute("readonly", "");
    // Fora da tela, mas ainda focável — `select()` precisa do elemento visível
    // ao layout para a seleção pegar.
    area.style.position = "fixed";
    area.style.top = "-9999px";
    document.body.appendChild(area);
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    // `finally` e não o fim do bloco: se `execCommand` lançar (ou nem existir,
    // o que dá TypeError), o `return false` do `catch` sairia sem remover o nó,
    // e cada clique deixaria um textarea preso no body.
    area.remove();
    focoAnterior?.focus();
  }
}
