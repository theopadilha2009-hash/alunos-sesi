/**
 * A marca do app: quatro arcos nas cores do símbolo, girando em volta de um
 * miolo. É desenho nosso — a logo oficial do SESI é marca registrada e não
 * mora no repositório. Se a escola autorizar o uso, é só trocar por um
 * arquivo em `public/`.
 */

const CORES = ["#3FC2BC", "#38B95D", "#F3B544", "#D74D42"] as const;

function ponto(cx: number, cy: number, r: number, grau: number): [number, number] {
  const rad = ((grau - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arco(cx: number, cy: number, r: number, inicio: number, fim: number) {
  const [x1, y1] = ponto(cx, cy, r, inicio);
  const [x2, y2] = ponto(cx, cy, r, fim);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${
    fim - inicio > 180 ? 1 : 0
  } 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function Roseta({
  tamanho = 108,
  girando = false,
}: {
  tamanho?: number;
  girando?: boolean;
}) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Escola SESI"
      style={
        girando
          ? { animation: "roseta-gira 18s linear infinite" }
          : undefined
      }
    >
      <style>{`@keyframes roseta-gira{to{transform:rotate(360deg)}}`}</style>
      {CORES.map((cor, i) => (
        <path
          key={cor}
          d={arco(50, 50, 36, i * 90 + 5, (i + 1) * 90 - 5)}
          stroke={cor}
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <circle cx="50" cy="50" r="17" fill="#02609E" />
      <circle cx="50" cy="50" r="9" fill="#F9E7CF" opacity="0.92" />
    </svg>
  );
}
