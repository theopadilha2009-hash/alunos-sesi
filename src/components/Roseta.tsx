/**
 * Logo Oficial do SESI — Serviço Social da Indústria.
 * Substitui a antiga roseta em todos os pontos do sistema.
 */

export type LogoSesiProps = {
  tamanho?: number;
  className?: string;
  iconeApenas?: boolean;
  somenteOriginal?: boolean;
};

export function LogoSesi({
  tamanho = 32,
  className = "",
  iconeApenas = false,
  somenteOriginal = false,
}: LogoSesiProps) {
  const altura = tamanho;
  const srcOriginal = iconeApenas ? "/logo-sesi-icone.png" : "/logo-sesi.png";
  const srcBranco = iconeApenas
    ? "/logo-sesi-icone-branco.png"
    : "/logo-sesi-branco.png";

  // A largura tem de estar reservada antes de o PNG chegar, e é para isso que
  // serve o `aspect-ratio` — as proporções saem dos próprios arquivos (264x64
  // o logo completo, 165x64 o ícone). Sem ele o navegador reservava perto de
  // zero para uma `<img>` de altura fixa e largura automática, o texto ao lado
  // encostava no logo e era empurrado quando a imagem pintava: é o "SESI
  // pulando" do login. O `alt` longo piorava — a frase inteira é bem mais
  // larga que os 38px da caixa e virava o tamanho do vão durante o load.
  const proporcao = iconeApenas ? "165 / 64" : "264 / 64";
  const estilo = {
    height: altura,
    width: "auto",
    aspectRatio: proporcao,
    objectFit: "contain" as const,
  };

  return (
    <span
      className={`logo-sesi-wrap ${className}`}
      style={{ height: altura, display: "inline-flex", alignItems: "center" }}
    >
      {somenteOriginal ? (
        <img src={srcOriginal} alt="SESI" className="logo-sesi-img" style={estilo} />
      ) : (
        <>
          <img
            src={srcOriginal}
            alt="SESI"
            className="logo-sesi-img logo-modo-light"
            style={estilo}
          />
          <img
            src={srcBranco}
            alt="SESI"
            className="logo-sesi-img logo-modo-dark"
            style={estilo}
          />
        </>
      )}
    </span>
  );
}

/** Alias para manter compatibilidade absoluta em qualquer import existente */
export const Roseta = LogoSesi;
