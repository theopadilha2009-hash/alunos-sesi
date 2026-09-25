import { Esqueleto } from "@/components/Esqueleto";

/**
 * A raiz abre no Login enquanto a sessão é resolvida. O esqueleto imita o
 * cartão de login — é a forma que quem chega de fora vê primeiro.
 */
export default function Carregando() {
  return (
    <div className="login-tela-container">
      <div className="login-card" role="status">
        <span className="sr-only">Carregando…</span>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.8rem" }}>
          <Esqueleto largura={34} altura={34} raio="50%" />
        </div>

        <div className="login-topo">
          <div className="login-marca">
            <Esqueleto largura={38} altura={38} raio="50%" />
            <div style={{ display: "grid", gap: "0.4rem" }}>
              <Esqueleto largura={132} altura="1.1rem" />
              <Esqueleto largura={104} altura="0.7rem" />
            </div>
          </div>
          <div style={{ display: "grid", gap: "0.4rem", marginTop: "1rem" }}>
            <Esqueleto largura="16rem" altura="0.8rem" style={{ marginInline: "auto" }} />
            <Esqueleto largura="11rem" altura="0.8rem" style={{ marginInline: "auto" }} />
          </div>
        </div>

        <div className="login-abas">
          <Esqueleto altura="1.7rem" raio="var(--raio-p)" />
          <Esqueleto altura="1.7rem" raio="var(--raio-p)" />
        </div>

        <div className="login-form">
          <div className="campo">
            <Esqueleto largura={64} altura="0.72rem" />
            <Esqueleto altura="2.7rem" />
          </div>
          <div className="campo">
            <Esqueleto largura={88} altura="0.72rem" />
            <Esqueleto altura="2.7rem" />
          </div>
          <Esqueleto altura="2.9rem" />
        </div>

        <div className="login-rodape-card">
          <Esqueleto largura="13rem" altura="0.72rem" style={{ marginInline: "auto" }} />
        </div>
      </div>
    </div>
  );
}