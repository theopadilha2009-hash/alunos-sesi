import { Esqueleto } from "@/components/Esqueleto";

/** Imita o crachá/portfólio: cabeça do perfil, bio, competências, projetos e ações. */
export default function Carregando() {
  return (
    <>
      <header>
        <div className="wrap topo">
          <div className="marca">
            <Esqueleto largura={30} altura={30} raio="50%" />
            <span style={{ display: "grid", gap: "0.25rem" }}>
              <Esqueleto largura={58} altura="0.85rem" />
              <Esqueleto largura={78} altura="0.55rem" />
            </span>
          </div>
          <nav className="topo-nav">
            <Esqueleto largura={104} altura="2.4rem" />
            <Esqueleto largura={34} altura={34} raio="50%" />
          </nav>
        </div>
      </header>

      <main className="wrap" role="status">
        <span className="sr-only">Carregando o perfil…</span>

        <div className="perfil perfil-moderno">
          <div className="perfil-topo">
            <div className="perfil-avatar-wrap">
              <Esqueleto largura={70} altura={70} raio="50%" />
            </div>
            <div style={{ flex: 1, display: "grid", gap: "0.6rem" }}>
              <div
                style={{
                  height: "clamp(2rem, 5vw, 3rem)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Esqueleto largura="14rem" altura="2.4rem" />
              </div>
              <div className="perfil-sub-linha">
                <Esqueleto largura="6rem" altura="0.85rem" />
                <Esqueleto largura="4.5rem" altura="1.4rem" raio="999px" />
                <Esqueleto largura="7rem" altura="1.4rem" raio="999px" />
              </div>
            </div>
          </div>

          <Esqueleto altura="1rem" style={{ marginBottom: "0.5rem" }} />
          <Esqueleto largura="70%" altura="1rem" style={{ marginBottom: "2rem" }} />

          <div className="perfil-habilidades">
            <div className="perfil-hab-topo-linha">
              <Esqueleto largura="14rem" altura="0.75rem" />
              <Esqueleto largura="12rem" altura="0.75rem" />
            </div>
            <div className="tags-container">
              {[92, 76, 108, 84, 96, 70].map((largura, i) => (
                <span className="endorsement-pill" key={i}>
                  <Esqueleto largura={largura - 40} altura="0.82rem" />
                </span>
              ))}
            </div>
          </div>

          <div>
            <Esqueleto largura="13rem" altura="0.75rem" style={{ marginBottom: "0.5rem" }} />
            <div className="grade-projetos-aluno">
              {Array.from({ length: 3 }, (_, i) => (
                <div className="card-projeto-vitrine" key={i}>
                  <Esqueleto altura="7rem" raio={0} />
                  <div style={{ padding: "0.9rem", display: "grid", gap: "0.5rem" }}>
                    <Esqueleto largura="70%" altura="0.95rem" />
                    <Esqueleto altura="0.8rem" />
                    <Esqueleto largura="55%" altura="0.8rem" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="perfil-grade-acoes">
            <div className="perfil-links">
              <Esqueleto largura="11rem" altura="2.8rem" />
              <Esqueleto largura="9rem" altura="2.8rem" />
              <Esqueleto largura="8rem" altura="2.8rem" />
            </div>
            <div className="perfil-compartilhar-box">
              <div className="qrcode-bloco">
                <Esqueleto largura={90} altura={90} raio="8px" />
                <Esqueleto
                  largura="5.5rem"
                  altura="0.7rem"
                  style={{ marginTop: "0.5rem" }}
                />
              </div>
              <div className="botoes-compartilhar">
                <Esqueleto altura="2.4rem" />
                <Esqueleto altura="2.4rem" />
                <Esqueleto altura="2.4rem" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="rodape">
        <div className="wrap">
          <Esqueleto largura="19rem" altura="0.8rem" />
          <Esqueleto largura="10rem" altura="0.8rem" />
        </div>
      </footer>
    </>
  );
}
