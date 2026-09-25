import { Esqueleto } from "@/components/Esqueleto";

/** Imita a vitrine: métricas, hall da fama, barra de filtros e grade de cards. */
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
            <Esqueleto largura={96} altura="2.4rem" />
            <Esqueleto largura={34} altura={34} raio="50%" />
          </nav>
        </div>
      </header>

      <main className="wrap" style={{ paddingBlock: "1.5rem" }} role="status">
        <span className="sr-only">Carregando a turma…</span>

        <div
          style={{
            height: "calc(clamp(2rem, 5vw, 3rem) * 1.65)",
            display: "flex",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <Esqueleto largura="9.5rem" altura="2.8rem" />
        </div>

        <section className="retrato">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="numero card-metrica" key={i}>
              <Esqueleto largura={62} altura="1.6rem" />
              <Esqueleto largura={104} altura="0.65rem" style={{ marginTop: "0.45rem" }} />
              <Esqueleto altura={3} raio="999px" style={{ marginTop: "0.6rem" }} />
            </div>
          ))}
        </section>

        <section className="hall-da-fama">
          <div className="hall-cabecalho">
            <Esqueleto largura={104} altura="0.7rem" />
            <Esqueleto largura="12rem" altura="1.4rem" style={{ marginTop: "0.4rem" }} />
            <Esqueleto largura="20rem" altura="0.8rem" style={{ marginTop: "0.6rem" }} />
          </div>
          <div className="hall-podio">
            {Array.from({ length: 3 }, (_, i) => (
              <div className="hall-card" key={i}>
                <Esqueleto largura={78} altura="0.66rem" />
                <Esqueleto
                  largura={54}
                  altura={54}
                  raio="50%"
                  style={{ marginTop: "0.7rem" }}
                />
                <Esqueleto largura="8rem" altura="1rem" style={{ marginTop: "0.7rem" }} />
                <Esqueleto largura="5rem" altura="0.7rem" style={{ marginTop: "0.35rem" }} />
                <Esqueleto largura="9rem" altura="1.4rem" style={{ marginTop: "0.9rem" }} />
              </div>
            ))}
          </div>
        </section>

        <div className="controles">
          <span style={{ flex: "1 1 18rem" }}>
            <Esqueleto altura="2.6rem" />
          </span>
          <Esqueleto largura="7.5rem" altura="2.6rem" />
          <Esqueleto largura="9rem" altura="2.6rem" />
          <Esqueleto largura="5.5rem" altura="2.6rem" />
          <Esqueleto largura="9rem" altura="0.84rem" />
        </div>

        <div className="trilho">
          {[72, 96, 84, 108, 90].map((largura, i) => (
            <span className="ficha" key={i}>
              <Esqueleto largura={largura - 22} altura="0.85rem" />
            </span>
          ))}
        </div>

        <div className="trilho-habilidades">
          <Esqueleto largura="6.5rem" altura="0.85rem" />
          {[74, 88, 64, 96].map((largura, i) => (
            <span className="tag-filtro" key={i}>
              <Esqueleto largura={largura - 26} altura="0.85rem" />
            </span>
          ))}
        </div>

        <ul className="grade">
          {Array.from({ length: 8 }, (_, i) => (
            <li className="aluno" key={i}>
              <div className="aluno-cabeca">
                <Esqueleto largura={42} altura={42} raio="50%" />
                <span style={{ display: "grid", gap: "0.35rem", flex: 1 }}>
                  <Esqueleto largura="70%" altura="1rem" />
                  <Esqueleto largura="45%" altura="0.7rem" />
                </span>
              </div>
              <Esqueleto altura="0.8rem" />
              <Esqueleto largura="80%" altura="0.8rem" />
              <div className="aluno-habilidades">
                <span className="tag-habilidade" style={{ width: "4.5rem" }}>
                  <Esqueleto altura="0.7rem" />
                </span>
                <span className="tag-habilidade" style={{ width: "3.5rem" }}>
                  <Esqueleto altura="0.7rem" />
                </span>
              </div>
              <div className="aluno-pes">
                <Esqueleto largura={64} altura="1.4rem" raio="999px" />
                <Esqueleto largura={92} altura="1.9rem" style={{ marginLeft: "auto" }} />
              </div>
            </li>
          ))}
        </ul>
      </main>

      <footer className="rodape">
        <div className="wrap">
          <Esqueleto largura="18rem" altura="0.8rem" />
          <Esqueleto largura="10rem" altura="0.8rem" />
        </div>
      </footer>
    </>
  );
}