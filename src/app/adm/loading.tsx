import { Esqueleto } from "@/components/Esqueleto";

/** Imita o painel do ADM: título, importação, cadastro e a lista de alunos. */
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
            <Esqueleto largura={128} altura="2.4rem" />
            <Esqueleto largura={34} altura={34} raio="50%" />
          </nav>
        </div>
      </header>

      <main className="wrap" role="status">
        <span className="sr-only">Carregando o painel…</span>

        <div style={{ paddingTop: "1.5rem" }}>
          <div
            style={{
              height: "calc(clamp(1.8rem, 4vw, 2.6rem) * 1.65)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Esqueleto largura="13rem" altura="2.4rem" />
          </div>
          <Esqueleto largura="11rem" altura="1rem" style={{ marginTop: "0.4rem" }} />
        </div>

        <div className="painel">
          <section className="bloco">
            <header>
              <Esqueleto largura="10rem" altura="1.05rem" />
              <Esqueleto largura="14rem" altura="0.8rem" />
            </header>
            <div className="corpo">
              <div className="campo">
                <Esqueleto largura="7rem" altura="0.75rem" />
                <Esqueleto altura="5rem" />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
                <Esqueleto largura="9rem" altura="2.5rem" />
                <Esqueleto largura="6rem" altura="2.5rem" />
              </div>
            </div>
          </section>

          <section className="bloco">
            <header>
              <Esqueleto largura="8rem" altura="1.05rem" />
            </header>
            <div className="corpo">
              <div className="linha-campos">
                <div className="campo">
                  <Esqueleto largura="5rem" altura="0.75rem" />
                  <Esqueleto altura="2.7rem" />
                </div>
                <div className="campo">
                  <Esqueleto largura="4rem" altura="0.75rem" />
                  <Esqueleto altura="2.7rem" />
                </div>
              </div>
              <div className="linha-campos">
                <div className="campo">
                  <Esqueleto largura="6rem" altura="0.75rem" />
                  <Esqueleto altura="2.7rem" />
                </div>
                <div className="campo">
                  <Esqueleto largura="5.5rem" altura="0.75rem" />
                  <Esqueleto altura="2.7rem" />
                </div>
              </div>
              <div className="campo">
                <Esqueleto largura="8rem" altura="0.75rem" />
                <Esqueleto altura="2.7rem" />
              </div>
              <Esqueleto largura="8rem" altura="2.6rem" style={{ marginTop: "0.4rem" }} />
            </div>
          </section>

          <section className="bloco">
            <header>
              <Esqueleto largura="6rem" altura="1.05rem" />
              <Esqueleto largura="16rem" altura="0.8rem" />
            </header>
            <div className="corpo">
              <ul className="lista-adm">
                {Array.from({ length: 8 }, (_, i) => (
                  <li className="linha-adm" key={i}>
                    <Esqueleto largura={42} altura={42} raio="50%" />
                    <Esqueleto largura="9rem" altura="1rem" />
                    <Esqueleto largura="12rem" altura="0.8rem" />
                    <span className="acoes">
                      <Esqueleto largura="4.5rem" altura="1.9rem" />
                      <Esqueleto largura="4.5rem" altura="1.9rem" />
                      <Esqueleto largura="3.5rem" altura="1.9rem" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>

      <footer className="rodape">
        <div className="wrap">
          <Esqueleto largura="22rem" altura="0.8rem" />
          <Esqueleto largura="10rem" altura="0.8rem" />
        </div>
      </footer>
    </>
  );
}