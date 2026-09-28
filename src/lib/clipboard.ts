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

  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    // Fora da tela, mas ainda focável — `select()` precisa do elemento visível
    // ao layout para a seleção pegar.
    area.style.position = "fixed";
    area.style.top = "-9999px";
    document.body.appendChild(area);
    area.select();
    const copiou = document.execCommand("copy");
    document.body.removeChild(area);
    return copiou;
  } catch {
    return false;
  }
}
