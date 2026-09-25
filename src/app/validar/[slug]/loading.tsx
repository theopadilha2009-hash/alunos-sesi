import { Esqueleto } from "@/components/Esqueleto";

// A folha de validação também é escura nos dois temas (gradiente próprio), e o
// cinza padrão do Esqueleto clarearia demais no tema claro.
const vidro = { background: "rgba(255, 255, 255, 0.09)" };

/** Imita a folha de validação: cabeçalho oficial, selo verde, ficha e segurança. */
export default function Carregando() {
  return (
    <div className="validar-documento-layout" role="status">
      <span className="sr-only">Carregando a validação…</span>

      <div className="validar-conteudo-box">
        <header className="validar-cabecalho-oficial">
          <div className="validar-marcas-linha">
            <Esqueleto largura={36} altura={36} raio="50%" style={vidro} />
            <div className="validar-titulos-sesi">
              <Esqueleto largura="12rem" altura="0.72rem" style={vidro} />
              <Esqueleto
                largura="15rem"
                altura="0.72rem"
                style={{ ...vidro, marginTop: "0.35rem" }}
              />
            </div>
          </div>
          <Esqueleto largura="12rem" altura="1.5rem" raio="999px" style={vidro} />
        </header>

        <div className="validar-selo-ativo-banner">
          <Esqueleto largura={52} altura={52} raio="12px" style={vidro} />
          <div style={{ flex: 1, display: "grid", gap: "0.5rem" }}>
            <Esqueleto largura="14rem" altura="0.8rem" style={vidro} />
            <Esqueleto largura="85%" altura="1.1rem" style={vidro} />
            <Esqueleto altura="0.8rem" style={vidro} />
            <Esqueleto largura="70%" altura="0.8rem" style={vidro} />
          </div>
        </div>

        <div className="validar-ficha-card">
          <div className="validar-aluno-hero">
            <Esqueleto largura={60} altura={60} raio="50%" style={vidro} />
            <div className="validar-aluno-titulos" style={{ flex: 1, display: "grid", gap: "0.5rem" }}>
              <Esqueleto largura="13rem" altura="1.3rem" style={vidro} />
              <div className="validar-pills-linha">
                <Esqueleto largura="6rem" altura="1.4rem" raio="999px" style={vidro} />
                <Esqueleto largura="7rem" altura="1.4rem" raio="999px" style={vidro} />
              </div>
            </div>
          </div>

          <Esqueleto altura="0.85rem" style={{ ...vidro, marginBottom: "0.5rem" }} />
          <Esqueleto
            largura="65%"
            altura="0.85rem"
            style={{ ...vidro, marginBottom: "1.4rem" }}
          />

          <div className="validar-grade-dados">
            {Array.from({ length: 6 }, (_, i) => (
              <div className="validar-dado-item" key={i}>
                <Esqueleto largura="8rem" altura="0.7rem" style={vidro} />
                <Esqueleto
                  largura="10rem"
                  altura="0.9rem"
                  style={{ ...vidro, marginTop: "0.45rem" }}
                />
              </div>
            ))}
          </div>

          <div className="validar-redes-bloco" style={{ marginTop: "1.4rem" }}>
            <Esqueleto largura="12rem" altura="0.7rem" style={vidro} />
            <div className="validar-redes-lista" style={{ marginTop: "0.6rem" }}>
              <Esqueleto largura="11rem" altura="2rem" raio="999px" style={vidro} />
              <Esqueleto largura="10rem" altura="2rem" raio="999px" style={vidro} />
              <Esqueleto largura="11rem" altura="2rem" raio="999px" style={vidro} />
            </div>
          </div>
        </div>

        <div className="validar-seguranca-footer">
          <div className="seguranca-hash-wrap">
            <Esqueleto largura="16rem" altura="0.65rem" style={vidro} />
            <Esqueleto largura="22rem" altura="0.9rem" style={vidro} />
          </div>

          <div className="validar-botoes-navegacao">
            <Esqueleto largura="15rem" altura="2.5rem" style={vidro} />
            <Esqueleto largura="14rem" altura="2.5rem" style={vidro} />
            <Esqueleto largura="13rem" altura="2.5rem" style={vidro} />
          </div>
        </div>
      </div>
    </div>
  );
}