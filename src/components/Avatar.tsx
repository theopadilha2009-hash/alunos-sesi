import type { CSSProperties } from "react";
import { iniciais } from "@/lib/links";

/**
 * O avatar do aluno: a foto quando existe, as iniciais quando não.
 *
 * Existe porque a foto era o slot mais aberto do sistema — `alunos.foto_url`
 * está no schema desde o 001, vem no `SELECT` da lista, e chega até a tela em
 * cinco lugares diferentes, todos desenhando `<span className="avatar">` com as
 * iniciais na mão. Nenhum deles lia o campo. A coluna existia e ninguém a usava.
 *
 * `className` carrega o tamanho (`mini-avatar`, `hall-avatar`, `nfc-avatar`…),
 * então quem chama continua dono do layout: aqui só se decide foto ou iniciais.
 *
 * O bloco inteiro é `aria-hidden` e a imagem tem `alt=""`: o nome do aluno está
 * sempre ao lado no DOM, então anunciar o avatar o diria duas vezes — e no caso
 * das iniciais, diria "TL" antes do nome, que é ruído, não informação. Era o que
 * os avatares de cartão e de tabela já faziam antes de virarem componente; o
 * `aria-hidden` some quando a marcação é reescrita, e some calado.
 */
export function Avatar({
  nome,
  foto,
  className = "",
  style,
}: {
  nome: string;
  foto?: string | null;
  className?: string;
  /** Quem chama pinta o avatar com a cor da sala; o componente não adivinha. */
  style?: CSSProperties;
}) {
  return (
    <span className={`avatar ${className}`.trim()} style={style} aria-hidden="true">
      {foto ? <img className="avatar-img" src={foto} alt="" loading="lazy" /> : iniciais(nome)}
    </span>
  );
}
