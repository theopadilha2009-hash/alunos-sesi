import { Esqueleto } from "@/components/Esqueleto";

// O cartão NFC é escuro nos dois temas (fundo #090d16), então o cinza padrão do
// Esqueleto — que sai de --surface-3 e clareia no tema claro — destoaria aqui.
const vidro = { background: "rgba(255, 255, 255, 0.09)" };

/** Imita o link-na-bio: marca, hero card, competências, botões e projetos. */
export default function Carregando() {
  return (
    <main className="nfc-bio-layout" role="status">
      <span className="sr-only">Carregando o cartão…</span>
      <div className="nfc-bio-bg-glow" aria-hidden="true" />

      <div className="nfc-bio-container">
        <header className="nfc-bio-header">
          <div className="nfc-bio-brand">
            <Esqueleto largura={22} altura={22} raio="50%" style={vidro} />
            <Esqueleto largura="8rem" altura="0.7rem" style={vidro} />
          </div>
          <span className="nfc-badge-verificado">
            <Esqueleto largura="8.5rem" altura="0.7rem" style={vidro} />
          </span>
        </header>

        <section className="nfc-hero-card">
          <div className="nfc-avatar-wrapper">
            <Esqueleto largura={80} altura={80} raio="50%" style={vidro} />
          </div>
          <Esqueleto
            largura="11rem"
            altura="1.5rem"
            style={{ ...vidro, marginInline: "auto" }}
          />
          <Esqueleto
            largura="13rem"
            altura="0.85rem"
            style={{ ...vidro, marginInline: "auto", marginTop: "0.7rem" }}
          />
          <div style={{ display: "grid", gap: "0.45rem", marginTop: "1rem" }}>
            <Esqueleto altura="0.85rem" style={vidro} />
            <Esqueleto largura="80%" altura="0.85rem" style={{ ...vidro, marginInline: "auto" }} />
          </div>
          <div className="nfc-reconhecimentos" style={{ marginTop: "1rem" }}>
            <Esqueleto largura="9rem" altura="0.8rem" style={vidro} />
            <Esqueleto largura="7rem" altura="1.3rem" raio="999px" style={vidro} />
          </div>
        </section>

        <section className="nfc-habilidades-bloco">
          <Esqueleto largura="9.5rem" altura="0.75rem" style={{ ...vidro, marginBottom: "0.6rem" }} />
          <div className="nfc-skills-lista">
            {[86, 70, 104, 78].map((largura, i) => (
              <span className="nfc-skill-pill" key={i}>
                <Esqueleto largura={largura - 46} altura="0.78rem" style={vidro} />
              </span>
            ))}
          </div>
        </section>

        <section className="nfc-links-lista">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="nfc-link-btn" key={i}>
              <Esqueleto largura={36} altura={36} raio="10px" style={vidro} />
              <div className="nfc-link-corpo" style={{ flex: 1 }}>
                <Esqueleto largura={i % 2 === 0 ? "11rem" : "9rem"} altura="0.85rem" style={vidro} />
                <Esqueleto
                  largura="8rem"
                  altura="0.7rem"
                  style={{ ...vidro, marginTop: "0.4rem" }}
                />
              </div>
            </div>
          ))}
        </section>

        <section className="nfc-projetos-preview">
          <Esqueleto largura="10rem" altura="0.75rem" style={{ ...vidro, marginBottom: "0.6rem" }} />
          <div className="nfc-projetos-grid">
            {Array.from({ length: 2 }, (_, i) => (
              <div className="nfc-projeto-card" key={i}>
                <Esqueleto largura="7rem" altura="0.8rem" style={vidro} />
                <Esqueleto altura="0.72rem" style={{ ...vidro, marginTop: "0.5rem" }} />
                <Esqueleto
                  largura="70%"
                  altura="0.72rem"
                  style={{ ...vidro, marginTop: "0.35rem" }}
                />
              </div>
            ))}
          </div>
        </section>

        <footer className="nfc-bio-footer">
          <Esqueleto largura="12rem" altura="0.8rem" style={{ ...vidro, marginInline: "auto" }} />
          <Esqueleto
            largura="16rem"
            altura="0.7rem"
            style={{ ...vidro, marginInline: "auto", marginTop: "0.5rem" }}
          />
        </footer>
      </div>
    </main>
  );
}