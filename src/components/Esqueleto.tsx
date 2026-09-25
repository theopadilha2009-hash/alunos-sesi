import type { CSSProperties } from "react";

type Props = {
  largura?: number | string;
  altura?: number | string;
  raio?: number | string;
  className?: string;
  style?: CSSProperties;
};

function medida(valor: number | string) {
  return typeof valor === "number" ? `${valor}px` : valor;
}

/**
 * Bloco cinza que segura o lugar do conteúdo enquanto ele carrega.
 *
 * Fica parado de propósito: o CSS do projeto só tem keyframes de pulso que
 * animam `transform: scale()` (pulsar, pulseNfc, logo-pulse-anim), feitos para
 * ponto e anel pequenos — num retângulo de card viram zoom. Sem keyframe novo,
 * a alternativa é o silêncio.
 *
 * A cor sai de `--surface-3`, que existe nos dois temas. Em tela de fundo
 * escuro fixo (cartão NFC, validação) passe o cinza por `style`.
 */
export function Esqueleto({
  largura = "100%",
  altura = "1rem",
  raio = "var(--raio-p)",
  className,
  style,
}: Props) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        width: medida(largura),
        height: medida(altura),
        borderRadius: medida(raio),
        background: "var(--surface-3)",
        opacity: 0.55,
        ...style,
      }}
    />
  );
}