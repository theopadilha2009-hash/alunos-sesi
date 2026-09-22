/**
 * Logo Oficial do SESI — Serviço Social da Indústria.
 * Substitui a antiga roseta em todos os pontos do sistema.
 */

export type LogoSesiProps = {
  tamanho?: number;
  girando?: boolean;
  className?: string;
  iconeApenas?: boolean;
  somenteOriginal?: boolean;
};

export function LogoSesi({
  tamanho = 32,
  girando = false,
  className = "",
  iconeApenas = false,
  somenteOriginal = false,
}: LogoSesiProps) {
  const altura = tamanho;
  const srcOriginal = iconeApenas ? "/logo-sesi-icone.png" : "/logo-sesi.png";
  const srcBranco = iconeApenas
    ? "/logo-sesi-icone-branco.png"
    : "/logo-sesi-branco.png";

  return (
    <span
      className={`logo-sesi-wrap ${girando ? "logo-sesi-pulse" : ""} ${className}`}
      style={{ height: altura, display: "inline-flex", alignItems: "center" }}
    >
      {somenteOriginal ? (
        <img
          src={srcOriginal}
          alt="SESI · Serviço Social da Indústria"
          className="logo-sesi-img"
          style={{ height: altura, width: "auto", objectFit: "contain" }}
        />
      ) : (
        <>
          <img
            src={srcOriginal}
            alt="SESI · Serviço Social da Indústria"
            className="logo-sesi-img logo-modo-light"
            style={{ height: altura, width: "auto", objectFit: "contain" }}
          />
          <img
            src={srcBranco}
            alt="SESI · Serviço Social da Indústria"
            className="logo-sesi-img logo-modo-dark"
            style={{ height: altura, width: "auto", objectFit: "contain" }}
          />
        </>
      )}
    </span>
  );
}

/** Alias para manter compatibilidade absoluta em qualquer import existente */
export const Roseta = LogoSesi;
